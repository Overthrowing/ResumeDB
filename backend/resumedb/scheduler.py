"""Lightweight local scheduler for natural-language discovery goals."""

import asyncio
import datetime
from pathlib import Path

from . import config, datarepo, pipeline
from .agent import public_agent_error


def _is_due(subscription: dict) -> bool:
    if not subscription.get("enabled", True):
        return False
    last = subscription.get("last_run_at")
    if not last:
        return True
    try:
        then = datetime.datetime.fromisoformat(last)
        if then.tzinfo is None:
            then = then.replace(tzinfo=datetime.timezone.utc)
        return datetime.datetime.now(datetime.timezone.utc) - then >= datetime.timedelta(hours=24)
    except ValueError:
        return True


async def _prepare_high_confidence(r: datarepo.DataRepo, jobs: list[dict]) -> None:
    for lead in [job for job in jobs if job.get("fit_score", 0) >= 80 and not job.get("hard_conflicts")][:3]:
        try:
            app_id = pipeline.track_lead(r, lead["id"])
            r.set_job_lead_status(lead["id"], "preparing", application_id=app_id)
            await pipeline.prepare_application(r, app_id)
            r.set_job_lead_status(lead["id"], "tracked", application_id=app_id)
        except Exception as exc:
            r.set_job_lead_status(
                lead["id"],
                "inbox",
                preparation_error=public_agent_error(exc),
            )


async def run_due_discovery() -> None:
    cfg = config.load()
    r = datarepo.DataRepo(Path(cfg["data_repo"]).expanduser())
    if not datarepo.is_datarepo(r.root):
        return
    for subscription in r.list_search_subscriptions():
        if not _is_due(subscription):
            continue
        try:
            result = await pipeline.run_job_command(r, subscription["query"], mode="discover")
            r.mark_subscription_run(subscription["id"])
            await _prepare_high_confidence(r, result["jobs"])
        except Exception as exc:
            r.mark_subscription_error(subscription["id"], public_agent_error(exc))
            # The next hourly cycle retries while the failure remains visible.
            continue


async def discovery_loop() -> None:
    while True:
        await run_due_discovery()
        await asyncio.sleep(3600)
