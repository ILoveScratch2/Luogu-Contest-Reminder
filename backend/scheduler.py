import json

from apscheduler.schedulers.background import BackgroundScheduler
from database import SessionLocal, User, SentReminder, SchedulerConfig, SiteConfig, SmtpConfig
from email_service import send_contest_reminder
from fetch_contest import get_upcoming_contests, fetch_contest_detail

_scheduler = BackgroundScheduler(timezone="Asia/Shanghai")
_started = False


def run_reminder_job():
    print("[scheduler] Running reminder job …")
    db = SessionLocal()
    try:
        site_cfg = db.query(SiteConfig).first()
        ttl = site_cfg.contest_cache_ttl if site_cfg and site_cfg.contest_cache_ttl is not None else 5
        advance_days = site_cfg.reminder_advance_days if site_cfg and site_cfg.reminder_advance_days is not None else 1
        advance_hours = max(1, advance_days) * 24
        contests = get_upcoming_contests(advance_hours, ttl)
        if not contests:
            print("[scheduler] No upcoming contests found.")
            return

        users = (
            db.query(User)
            .filter(User.is_active == True, User.email_reminder == True)  # noqa: E712
            .all()
        )

        # Group users by (frozenset of unsent contest IDs, include_body flag)
        # so each group gets exactly one BCC email with shared content.
        groups: dict = {}  # key -> {"users": [...], "contests": [...], "include_body": bool}

        for user in users:
            reminded_ids = {
                r.contest_id
                for r in db.query(SentReminder)
                .filter(SentReminder.user_id == user.id)
                .all()
            }
            unsent = [c for c in contests if c.get("id") not in reminded_ids]
            if not unsent:
                continue

            key = (frozenset(c["id"] for c in unsent), user.send_contest_body)
            if key not in groups:
                groups[key] = {"users": [], "contests": unsent, "include_body": user.send_contest_body}
            groups[key]["users"].append(user)

        # Fetch contest descriptions for groups that need them
        for group_data in groups.values():
            if group_data["include_body"]:
                for c in group_data["contests"]:
                    if not c.get("description"):
                        detail = fetch_contest_detail(c["id"])
                        if detail:
                            c["description"] = detail.get("description", "")

        sent_count = 0
        smtp_cfg = db.query(SmtpConfig).first()
        bcc_batch_size = getattr(smtp_cfg, 'bcc_batch_size', 100) if smtp_cfg else 100

        for group_data in groups.values():
            emails = [u.email for u in group_data["users"]]
            # Split into batches; bcc_batch_size=0 means no limit (single batch)
            if bcc_batch_size and bcc_batch_size > 0:
                batches = [emails[i:i + bcc_batch_size] for i in range(0, len(emails), bcc_batch_size)]
            else:
                batches = [emails]

            batch_users_map = {u.email: u for u in group_data["users"]}
            for batch in batches:
                success = send_contest_reminder(
                    db, batch, group_data["contests"], group_data["include_body"], advance_hours
                )
                if success:
                    for email in batch:
                        user = batch_users_map[email]
                        for c in group_data["contests"]:
                            db.add(SentReminder(user_id=user.id, contest_id=c["id"]))
                    db.commit()
                    sent_count += len(batch)
                    print(f"[scheduler] BCC 发送提醒至 {len(batch)} 位用户（共 {len(emails)} 位）")

        print(f"[scheduler] Done. Reminded {sent_count} user(s).")
    except Exception as exc:
        print(f"[scheduler] Error: {exc}")
        db.rollback()
    finally:
        db.close()


def _load_schedule_times() -> list:
    """Return list of (hour, minute) tuples from DB, default [(8, 0)]."""
    db = SessionLocal()
    try:
        cfg = db.query(SchedulerConfig).first()
        if cfg:
            try:
                times = json.loads(cfg.times_json)
                result = []
                for t in times:
                    h, m = map(int, t.split(":"))
                    if 0 <= h <= 23 and 0 <= m <= 59:
                        result.append((h, m))
                return result or [(8, 0)]
            except Exception:
                pass
        return [(8, 0)]
    finally:
        db.close()


def _apply_schedule():
    """Remove existing reminder jobs and add new ones based on DB config."""
    for job in _scheduler.get_jobs():
        if job.id.startswith("reminder_"):
            _scheduler.remove_job(job.id)

    times = _load_schedule_times()
    for i, (h, m) in enumerate(times):
        _scheduler.add_job(
            run_reminder_job,
            "cron",
            hour=h,
            minute=m,
            id=f"reminder_{i}",
        )
    time_strs = [f"{h:02d}:{m:02d}" for h, m in times]
    print(f"[scheduler] Schedule updated: {time_strs} CST")


def reload_scheduler():
    """Reload schedule from DB (call after config update via API)."""
    if _started:
        _apply_schedule()


def start_scheduler():
    global _started
    if not _started:
        _apply_schedule()
        _scheduler.start()
        _started = True
        print("[scheduler] Scheduler started.")


def stop_scheduler():
    global _started
    if _started:
        _scheduler.shutdown(wait=False)
        _started = False
