#!/bin/sh
set -eu

resumedb_volume_path="${RAILWAY_VOLUME_MOUNT_PATH:-/data}"
export RESUMEDB_DATA_REPO="${RESUMEDB_DATA_REPO:-${resumedb_volume_path}/resume-data}"
export RESUMEDB_CONFIG_PATH="${RESUMEDB_CONFIG_PATH:-${resumedb_volume_path}/resumedb.json}"

mkdir -p "$resumedb_volume_path"
chown -R resumedb:resumedb "$resumedb_volume_path"

su-exec resumedb git config --global user.name "ResumeDB"
su-exec resumedb git config --global user.email "resumedb@local.invalid"

if [ "${RESUMEDB_AGENT_PROVIDER:-claude}" = "codex" ] && [ -n "${OPENAI_API_KEY:-}" ]; then
  if ! su-exec resumedb codex login status >/dev/null 2>&1; then
    printf '%s' "$OPENAI_API_KEY" | su-exec resumedb codex login --with-api-key >/dev/null
  fi
fi

exec su-exec resumedb /app/.venv/bin/uvicorn resumedb.main:app \
  --app-dir /app/backend \
  --host 0.0.0.0 \
  --port "${PORT:-8000}"
