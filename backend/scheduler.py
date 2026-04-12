import json

from apscheduler.schedulers.background import BackgroundScheduler
from database import SessionLocal, User, SentReminder, SchedulerConfig
from email_service import send_contest_reminder
from fetch_contest import get_upcoming_contests, fetch_contest_detail

_scheduler = BackgroundScheduler(timezone="Asia/Shanghai")
_started = False


def run_reminder_job():
    print("[scheduler] Running reminder job …")
    db = SessionLocal()
    try:
        contests = get_upcoming_contests(24)
        if not contests:
            print("[scheduler] No upcoming contests found.")
            return

        users = (
            db.query(User)
            .filter(User.is_active == True, User.email_reminder == True)  # noqa: E712
            .all()
        )

        sent_count = 0
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

            if user.send_contest_body:
                for c in unsent:
                    if not c.get("description"):
                        detail = fetch_contest_detail(c["id"])
                        if detail:
                            c["description"] = detail.get("description", "")

            success = send_contest_reminder(db, user.email, unsent, user.send_contest_body)
            if success:
                for c in unsent:
                    db.add(SentReminder(user_id=user.id, contest_id=c["id"]))
                db.commit()
                sent_count += 1
                print(f"[scheduler] Sent reminder to {user.email}")

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
