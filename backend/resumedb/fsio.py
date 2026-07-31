"""Shared filesystem and YAML helpers: atomic writes, YAML factory, id checks.

Every ground-truth write in the app goes through atomic_write so a crash or
concurrent read never sees a torn file.
"""

import io
import os
import re
import tempfile
from pathlib import Path

from ruamel.yaml import YAML

# entry/application ids: lowercase slug. proposal/run names: looser but safe.
# Both are bounded - an over-long id becomes an over-long filename (OSError).
SLUG_RE = re.compile(r"[a-z0-9][a-z0-9-]{0,119}")
NAME_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,119}")


# Temp files must live beside the target (rename is only atomic within one
# filesystem), but they sit inside a git-tracked directory, so a concurrent
# `git add -A` can enumerate one and then fail to stat it once it is renamed
# away. This prefix is gitignored in every data repo, which keeps git from
# seeing them at all.
TMP_PREFIX = ".resumedb-tmp-"


def atomic_write(path: Path, text: str) -> None:
    """Write text to path via temp file + rename in the same directory."""
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=f"{TMP_PREFIX}{path.name}.")
    try:
        with os.fdopen(fd, "w") as f:
            f.write(text)
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def yaml() -> YAML:
    # ruamel YAML instances are not thread-safe; FastAPI serves requests from a
    # threadpool, so make a fresh round-trip instance per call. Round-trip mode
    # preserves hand-written comments and key order in user-owned files.
    y = YAML()
    y.default_flow_style = False
    return y


def load_yaml(path: Path):
    with path.open() as f:
        return yaml().load(f)


def dump_yaml(data, path: Path) -> None:
    buf = io.StringIO()
    yaml().dump(data, buf)
    atomic_write(path, buf.getvalue())
