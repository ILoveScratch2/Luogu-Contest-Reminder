import datetime
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./lgcontest.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    is_root = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    email_reminder = Column(Boolean, default=True, nullable=False)
    send_contest_body = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class SmtpConfig(Base):
    __tablename__ = "smtp_config"
    id = Column(Integer, primary_key=True, index=True)
    host = Column(String, nullable=False)
    port = Column(Integer, nullable=False, default=587)
    username = Column(String, nullable=False)
    password = Column(String, nullable=False)
    from_email = Column(String, nullable=False)
    from_name = Column(String, default="Luogu Contest Reminder")
    use_tls = Column(Boolean, default=True)
    retry_enabled = Column(Boolean, default=True, nullable=False)
    retry_max_attempts = Column(Integer, default=3, nullable=False)
    retry_interval = Column(Integer, default=30, nullable=False)
    bcc_batch_size = Column(Integer, default=100, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)


class VerificationCode(Base):
    __tablename__ = "verification_codes"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, index=True)
    code = Column(String, nullable=False)
    purpose = Column(String, nullable=False)  # 'register'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)


class SentReminder(Base):
    __tablename__ = "sent_reminders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    contest_id = Column(Integer, nullable=False)
    sent_at = Column(DateTime, default=datetime.datetime.utcnow)


class SiteConfig(Base):
    __tablename__ = "site_config"
    id = Column(Integer, primary_key=True, index=True)
    site_title = Column(String, default="Luogu Contest Reminder", nullable=False)
    primary_color = Column(String, default="#1976d2", nullable=False)
    favicon_url = Column(String, default="", nullable=False)
    contest_cache_ttl = Column(Integer, default=5, nullable=False)
    # security / auth settings
    allow_register = Column(Boolean, default=True, nullable=False)
    captcha_type = Column(String, default="none", nullable=False)  # 'none' | 'builtin' | 'turnstile'
    captcha_on_register = Column(Boolean, default=False, nullable=False)
    captcha_on_login = Column(Boolean, default=False, nullable=False)
    captcha_on_change_email = Column(Boolean, default=False, nullable=False)
    turnstile_site_key = Column(String, default="", nullable=False)
    turnstile_secret_key = Column(String, default="", nullable=False)
    session_expire_days = Column(Integer, default=7, nullable=False)
    block_disposable_email = Column(Boolean, default=False, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)


class SchedulerConfig(Base):
    __tablename__ = "scheduler_config"
    id = Column(Integer, primary_key=True, index=True)
    times_json = Column(String, default='["08:00"]', nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)


class EmailTemplate(Base):
    __tablename__ = "email_templates"
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, unique=True, nullable=False, index=True)  # 'verification' | 'reminder'
    subject = Column(Text, nullable=True)
    html_body = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
    # Migrate: add columns that may be missing from existing databases
    with engine.connect() as conn:
        existing = [row[1] for row in conn.execute(
            __import__('sqlalchemy').text("PRAGMA table_info(site_config)")
        )]
        if "contest_cache_ttl" not in existing:
            conn.execute(__import__('sqlalchemy').text(
                "ALTER TABLE site_config ADD COLUMN contest_cache_ttl INTEGER NOT NULL DEFAULT 5"
            ))
            conn.commit()
        # Migrate smtp_config
        existing_smtp = [row[1] for row in conn.execute(
            __import__('sqlalchemy').text("PRAGMA table_info(smtp_config)")
        )]
        if "retry_enabled" not in existing_smtp:
            conn.execute(__import__('sqlalchemy').text(
                "ALTER TABLE smtp_config ADD COLUMN retry_enabled BOOLEAN NOT NULL DEFAULT 1"
            ))
            conn.commit()
        if "retry_max_attempts" not in existing_smtp:
            conn.execute(__import__('sqlalchemy').text(
                "ALTER TABLE smtp_config ADD COLUMN retry_max_attempts INTEGER NOT NULL DEFAULT 3"
            ))
            conn.commit()
        if "retry_interval" not in existing_smtp:
            conn.execute(__import__('sqlalchemy').text(
                "ALTER TABLE smtp_config ADD COLUMN retry_interval INTEGER NOT NULL DEFAULT 30"
            ))
            conn.commit()
        if "bcc_batch_size" not in existing_smtp:
            conn.execute(__import__('sqlalchemy').text(
                "ALTER TABLE smtp_config ADD COLUMN bcc_batch_size INTEGER NOT NULL DEFAULT 100"
            ))
            conn.commit()
        # Migrate site_config – security fields
        existing_site = [row[1] for row in conn.execute(
            __import__('sqlalchemy').text("PRAGMA table_info(site_config)")
        )]
        _site_migrations = [
            ("allow_register", "BOOLEAN NOT NULL DEFAULT 1"),
            ("captcha_type", "VARCHAR NOT NULL DEFAULT 'none'"),
            ("captcha_on_register", "BOOLEAN NOT NULL DEFAULT 0"),
            ("captcha_on_login", "BOOLEAN NOT NULL DEFAULT 0"),
            ("captcha_on_change_email", "BOOLEAN NOT NULL DEFAULT 0"),
            ("turnstile_site_key", "VARCHAR NOT NULL DEFAULT ''"),
            ("turnstile_secret_key", "VARCHAR NOT NULL DEFAULT ''"),
            ("session_expire_days", "INTEGER NOT NULL DEFAULT 7"),
        ]
        _site_migrations.append(("block_disposable_email", "BOOLEAN NOT NULL DEFAULT 0"))
        for col, col_def in _site_migrations:
            if col not in existing_site:
                conn.execute(__import__('sqlalchemy').text(
                    f"ALTER TABLE site_config ADD COLUMN {col} {col_def}"
                ))
                conn.commit()
