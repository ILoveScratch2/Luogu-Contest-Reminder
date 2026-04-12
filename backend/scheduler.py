from apscheduler.schedulers.background import BackgroundScheduler
from database import SessionLocal, User, SentReminder
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
            # IDs already reminded for this user
            reminded_ids = {
                r.contest_id
                for r in db.query(SentReminder)
                .filter(SentReminder.user_id == user.id)
                .all()
            }
            unsent = [c for c in contests if c.get("id") not in reminded_ids]
            if not unsent:
                continue

            # Optionally fetch full description
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


def start_scheduler():
    global _started
    if not _started:
        # Run every day at 08:00 CST
        _scheduler.add_job(run_reminder_job, "cron", hour=8, minute=0, id="daily_reminder")
        _scheduler.start()
        _started = True
        print("[scheduler] Scheduler started (daily @ 08:00 CST).")


def stop_scheduler():
    global _started
    if _started:
        _scheduler.shutdown(wait=False)
        _started = False
