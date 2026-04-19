import os
import random
import secrets
import string
import datetime
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import bcrypt as _bcrypt
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from database import (
    SessionLocal,
    EmailTemplate,
    SchedulerConfig,
    SentReminder,
    SiteConfig,
    SmtpConfig,
    User,
    VerificationCode,
    get_db,
    init_db,
)
from email_service import send_contest_reminder, send_verification_email, test_smtp_connection
from fetch_contest import get_upcoming_contests, fetch_contest_detail
from scheduler import run_reminder_job, start_scheduler, stop_scheduler, reload_scheduler

# ──────────────────────────────────────────────────────────────
# Secret key (generated once, persisted to file)
# ──────────────────────────────────────────────────────────────
APP_VERSION = "1.0.0"
_KEY_FILE = "secret.key"
if os.path.exists(_KEY_FILE):
    with open(_KEY_FILE, "r") as _f:
        SECRET_KEY: str = _f.read().strip()
else:
    SECRET_KEY = secrets.token_hex(32)
    with open(_KEY_FILE, "w") as _f:
        _f.write(SECRET_KEY)

ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 7

# ──────────────────────────────────────────────────────────────
# App lifecycle
# ──────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="Luogu Contest Reminder API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        os.environ.get("FRONTEND_URL", ""),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────────
# Auth helpers
# ──────────────────────────────────────────────────────────────
bearer = HTTPBearer()


def hash_password(plain: str) -> str:
    return _bcrypt.hashpw(plain.encode(), _bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return _bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(user_id: int) -> str:
    exp = datetime.datetime.utcnow() + datetime.timedelta(days=TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": str(user_id), "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub", 0))
    except (JWTError, ValueError):
        raise exc
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise exc
    return user


def require_root(current: User = Depends(get_current_user)) -> User:
    if not current.is_root:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current


# ──────────────────────────────────────────────────────────────
# Pydantic schemas
# ──────────────────────────────────────────────────────────────
class SendCodeRequest(BaseModel):
    email: EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    code: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SettingsRequest(BaseModel):
    email_reminder: Optional[bool] = None
    send_contest_body: Optional[bool] = None


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    is_root: bool = False
    is_active: bool = True
    email_reminder: bool = True
    send_contest_body: bool = False


class UpdateUserRequest(BaseModel):
    is_active: Optional[bool] = None
    email_reminder: Optional[bool] = None
    send_contest_body: Optional[bool] = None
    is_root: Optional[bool] = None
    new_password: Optional[str] = None


class SmtpConfigRequest(BaseModel):
    host: str
    port: int
    username: str
    password: Optional[str] = None  # None = keep existing
    from_email: EmailStr
    from_name: str = "Luogu Contest Reminder"
    use_tls: bool = True


class SiteConfigRequest(BaseModel):
    site_title: str = "Luogu Contest Reminder"
    primary_color: str = "#1976d2"
    favicon_url: str = ""
    contest_cache_ttl: int = 5


class SchedulerConfigRequest(BaseModel):
    times: List[str]


class EmailTemplateRequest(BaseModel):
    subject: Optional[str] = None
    html_body: Optional[str] = None


class SendChangeEmailCodeRequest(BaseModel):
    new_email: EmailStr


class ConfirmChangeEmailRequest(BaseModel):
    new_email: EmailStr
    old_code: str
    new_code: str


# Auth routes
@app.post("/api/auth/send-code")
def send_code(req: SendCodeRequest, db: Session = Depends(get_db)):
    if not db.query(SmtpConfig).first():
        raise HTTPException(status_code=503, detail="SMTP not configured by admin yet")

    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # rate limit: 1 code per 60 seconds per email
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(seconds=60)
    recent = (
        db.query(VerificationCode)
        .filter(
            VerificationCode.email == req.email,
            VerificationCode.created_at > cutoff,
        )
        .first()
    )
    if recent:
        raise HTTPException(status_code=429, detail="Please wait 60 seconds before requesting another code")

    code = "".join(random.choices(string.digits, k=6))
    expires = datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
    db.add(VerificationCode(email=req.email, code=code, purpose="register", expires_at=expires))
    db.commit()

    if not send_verification_email(db, req.email, code):
        raise HTTPException(status_code=500, detail="Failed to send verification email")
    return {"message": "Verification code sent"}


@app.post("/api/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    code_row = (
        db.query(VerificationCode)
        .filter(
            VerificationCode.email == req.email,
            VerificationCode.code == req.code,
            VerificationCode.purpose == "register",
            VerificationCode.used == False,  # noqa: E712
            VerificationCode.expires_at > datetime.datetime.utcnow(),
        )
        .first()
    )
    if not code_row:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        is_root=False,
        is_active=True,
        email_reminder=True,
        send_contest_body=False,
    )
    db.add(user)
    code_row.used = True
    db.commit()
    db.refresh(user)

    token = create_token(user.id)
    return {"token": token, "user": _user_dict(user)}


@app.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    token = create_token(user.id)
    return {"token": token, "user": _user_dict(user)}


# user routes
def _user_dict(u: User) -> dict:
    return {
        "id": u.id,
        "email": u.email,
        "is_root": u.is_root,
        "is_active": u.is_active,
        "email_reminder": u.email_reminder,
        "send_contest_body": u.send_contest_body,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


@app.get("/api/user/profile")
def get_profile(current: User = Depends(get_current_user)):
    return _user_dict(current)


@app.put("/api/user/settings")
def update_settings(
    req: SettingsRequest,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == current.id).first()
    if req.email_reminder is not None:
        user.email_reminder = req.email_reminder
    if req.send_contest_body is not None:
        user.send_contest_body = req.send_contest_body
    db.commit()
    return {"message": "Settings updated"}


@app.delete("/api/user/account")
def delete_own_account(current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current.is_root:
        raise HTTPException(status_code=400, detail="Cannot delete the root account")
    user = db.query(User).filter(User.id == current.id).first()
    db.query(SentReminder).filter(SentReminder.user_id == user.id).delete()
    db.delete(user)
    db.commit()
    return {"message": "Account deleted"}


@app.post("/api/user/send-change-email-code")
def send_change_email_code(
    req: SendChangeEmailCodeRequest,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not db.query(SmtpConfig).first():
        raise HTTPException(status_code=503, detail="SMTP not configured by admin yet")

    if req.new_email == current.email:
        raise HTTPException(status_code=400, detail="New email must be different from current email")

    if db.query(User).filter(User.email == req.new_email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # rate limit: 1 code per 60 seconds per email address
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(seconds=60)
    for email_addr in (current.email, req.new_email):
        recent = (
            db.query(VerificationCode)
            .filter(
                VerificationCode.email == email_addr,
                VerificationCode.purpose.in_(["change_email_old", "change_email_new"]),
                VerificationCode.created_at > cutoff,
            )
            .first()
        )
        if recent:
            raise HTTPException(status_code=429, detail="Please wait 60 seconds before requesting another code")

    expires = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)

    old_code = "".join(random.choices(string.digits, k=6))
    db.add(VerificationCode(email=current.email, code=old_code, purpose="change_email_old", expires_at=expires))

    new_code = "".join(random.choices(string.digits, k=6))
    db.add(VerificationCode(email=req.new_email, code=new_code, purpose="change_email_new", expires_at=expires))

    db.commit()

    from email_service import send_change_email_verification
    if not send_change_email_verification(db, current.email, old_code, is_new_email=False):
        raise HTTPException(status_code=500, detail="Failed to send verification email to current address")
    if not send_change_email_verification(db, req.new_email, new_code, is_new_email=True):
        raise HTTPException(status_code=500, detail="Failed to send verification email to new address")

    return {"message": "Verification codes sent to both email addresses"}


@app.post("/api/user/confirm-change-email")
def confirm_change_email(
    req: ConfirmChangeEmailRequest,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if req.new_email == current.email:
        raise HTTPException(status_code=400, detail="New email must be different from current email")

    if db.query(User).filter(User.email == req.new_email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    now = datetime.datetime.utcnow()

    old_code_row = (
        db.query(VerificationCode)
        .filter(
            VerificationCode.email == current.email,
            VerificationCode.code == req.old_code,
            VerificationCode.purpose == "change_email_old",
            VerificationCode.used == False,  # noqa: E712
            VerificationCode.expires_at > now,
        )
        .first()
    )
    if not old_code_row:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code for current email")

    new_code_row = (
        db.query(VerificationCode)
        .filter(
            VerificationCode.email == req.new_email,
            VerificationCode.code == req.new_code,
            VerificationCode.purpose == "change_email_new",
            VerificationCode.used == False,  # noqa: E712
            VerificationCode.expires_at > now,
        )
        .first()
    )
    if not new_code_row:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code for new email")

    user = db.query(User).filter(User.id == current.id).first()
    user.email = req.new_email
    old_code_row.used = True
    new_code_row.used = True
    db.commit()
    db.refresh(user)

    return {"message": "Email changed successfully", "user": _user_dict(user)}


# admin – users
@app.get("/api/admin/users")
def list_users(root: User = Depends(require_root), db: Session = Depends(get_db)):
    return [_user_dict(u) for u in db.query(User).order_by(User.id).all()]


@app.post("/api/admin/users", status_code=201)
def create_user(
    req: CreateUserRequest,
    root: User = Depends(require_root),
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        is_root=req.is_root,
        is_active=req.is_active,
        email_reminder=req.email_reminder,
        send_contest_body=req.send_contest_body,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_dict(user)


@app.put("/api/admin/users/{user_id}")
def update_user(
    user_id: int,
    req: UpdateUserRequest,
    root: User = Depends(require_root),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == root.id and req.is_root is False:
        raise HTTPException(status_code=400, detail="Cannot revoke own root privilege")

    if req.is_active is not None:
        user.is_active = req.is_active
    if req.email_reminder is not None:
        user.email_reminder = req.email_reminder
    if req.send_contest_body is not None:
        user.send_contest_body = req.send_contest_body
    if req.is_root is not None:
        user.is_root = req.is_root
    if req.new_password:
        if len(req.new_password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        user.password_hash = hash_password(req.new_password)

    db.commit()
    return {"message": "User updated"}


@app.delete("/api/admin/users/{user_id}")
def delete_user(
    user_id: int,
    root: User = Depends(require_root),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == root.id:
        raise HTTPException(status_code=400, detail="Cannot delete own account")
    db.query(SentReminder).filter(SentReminder.user_id == user.id).delete()
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}


# admin – SMTP config
@app.get("/api/admin/smtp")
def get_smtp(root: User = Depends(require_root), db: Session = Depends(get_db)):
    cfg = db.query(SmtpConfig).first()
    if not cfg:
        return None
    return {
        "host": cfg.host,
        "port": cfg.port,
        "username": cfg.username,
        "from_email": cfg.from_email,
        "from_name": cfg.from_name,
        "use_tls": cfg.use_tls,
        # no password
    }


@app.put("/api/admin/smtp")
def update_smtp(
    req: SmtpConfigRequest,
    root: User = Depends(require_root),
    db: Session = Depends(get_db),
):
    cfg = db.query(SmtpConfig).first()
    if cfg:
        cfg.host = req.host
        cfg.port = req.port
        cfg.username = req.username
        if req.password:
            cfg.password = req.password
        cfg.from_email = req.from_email
        cfg.from_name = req.from_name
        cfg.use_tls = req.use_tls
        cfg.updated_at = datetime.datetime.utcnow()
    else:
        if not req.password:
            raise HTTPException(status_code=400, detail="Password required for new SMTP config")
        cfg = SmtpConfig(
            host=req.host,
            port=req.port,
            username=req.username,
            password=req.password,
            from_email=req.from_email,
            from_name=req.from_name,
            use_tls=req.use_tls,
        )
        db.add(cfg)
    db.commit()
    return {"message": "SMTP config saved"}


@app.post("/api/admin/smtp/test")
def test_smtp(root: User = Depends(require_root), db: Session = Depends(get_db)):
    cfg = db.query(SmtpConfig).first()
    if not cfg:
        raise HTTPException(status_code=400, detail="SMTP not configured")
    ok, err = test_smtp_connection(cfg)
    if ok:
        return {"message": "Connection successful"}
    raise HTTPException(status_code=502, detail=f"Connection failed: {err}")


# admin – reminder job trigger
@app.post("/api/admin/remind/trigger")
def trigger_reminder(root: User = Depends(require_root)):
    run_reminder_job()
    return {"message": "Reminder job triggered"}


# admin – scheduler config
@app.get("/api/admin/scheduler")
def get_scheduler_config(root: User = Depends(require_root), db: Session = Depends(get_db)):
    import json
    cfg = db.query(SchedulerConfig).first()
    if not cfg:
        return {"times": ["08:00"]}
    return {"times": json.loads(cfg.times_json)}


@app.put("/api/admin/scheduler")
def update_scheduler_config(
    req: SchedulerConfigRequest,
    root: User = Depends(require_root),
    db: Session = Depends(get_db),
):
    import json, re
    if not req.times:
        raise HTTPException(status_code=400, detail="At least one time is required")
    for t in req.times:
        if not re.match(r'^([01]\d|2[0-3]):[0-5]\d$', t):
            raise HTTPException(status_code=400, detail=f"Invalid time format: {t}, expected HH:MM")
    times_json = json.dumps(sorted(set(req.times)))
    cfg = db.query(SchedulerConfig).first()
    if cfg:
        cfg.times_json = times_json
        cfg.updated_at = datetime.datetime.utcnow()
    else:
        cfg = SchedulerConfig(times_json=times_json)
        db.add(cfg)
    db.commit()
    reload_scheduler()
    return {"message": "Scheduler config saved", "times": json.loads(times_json)}


# admin – email templates
@app.get("/api/admin/email-templates/{tpl_type}")
def get_email_template(
    tpl_type: str,
    root: User = Depends(require_root),
    db: Session = Depends(get_db),
):
    from email_service import (
        DEFAULT_VERIFICATION_HTML, DEFAULT_VERIFICATION_SUBJECT,
        DEFAULT_REMINDER_HTML, DEFAULT_REMINDER_SUBJECT,
    )
    if tpl_type not in ("verification", "reminder"):
        raise HTTPException(status_code=400, detail="Unknown template type")
    row = db.query(EmailTemplate).filter(EmailTemplate.type == tpl_type).first()
    default_html = DEFAULT_VERIFICATION_HTML if tpl_type == "verification" else DEFAULT_REMINDER_HTML
    default_subject = DEFAULT_VERIFICATION_SUBJECT if tpl_type == "verification" else DEFAULT_REMINDER_SUBJECT
    return {
        "type": tpl_type,
        "subject": row.subject if row else None,
        "html_body": row.html_body if row else None,
        "default_html": default_html,
        "default_subject": default_subject,
    }


@app.put("/api/admin/email-templates/{tpl_type}")
def update_email_template(
    tpl_type: str,
    req: EmailTemplateRequest,
    root: User = Depends(require_root),
    db: Session = Depends(get_db),
):
    if tpl_type not in ("verification", "reminder"):
        raise HTTPException(status_code=400, detail="Unknown template type")
    row = db.query(EmailTemplate).filter(EmailTemplate.type == tpl_type).first()
    if row:
        row.subject = req.subject or None
        row.html_body = req.html_body or None
        row.updated_at = datetime.datetime.utcnow()
    else:
        row = EmailTemplate(
            type=tpl_type,
            subject=req.subject or None,
            html_body=req.html_body or None,
        )
        db.add(row)
    db.commit()
    return {"message": "Email template saved"}


# public – site config
@app.get("/api/site-config")
def get_site_config(db: Session = Depends(get_db)):
    cfg = db.query(SiteConfig).first()
    if not cfg:
        return {"site_title": "Luogu Contest Reminder", "primary_color": "#1976d2", "favicon_url": "", "contest_cache_ttl": 5}
    return {"site_title": cfg.site_title, "primary_color": cfg.primary_color, "favicon_url": cfg.favicon_url, "contest_cache_ttl": cfg.contest_cache_ttl if cfg.contest_cache_ttl is not None else 5}


@app.put("/api/admin/site-config")
def update_site_config(
    req: SiteConfigRequest,
    root: User = Depends(require_root),
    db: Session = Depends(get_db),
):
    import re
    if not re.match(r'^#[0-9A-Fa-f]{6}$', req.primary_color):
        raise HTTPException(status_code=400, detail="Invalid color format, expected #rrggbb")
    if req.contest_cache_ttl < 0:
        raise HTTPException(status_code=400, detail="Cache TTL must be >= 0")
    cfg = db.query(SiteConfig).first()
    if cfg:
        cfg.site_title = req.site_title
        cfg.primary_color = req.primary_color
        cfg.favicon_url = req.favicon_url
        cfg.contest_cache_ttl = req.contest_cache_ttl
        cfg.updated_at = datetime.datetime.utcnow()
    else:
        cfg = SiteConfig(
            site_title=req.site_title,
            primary_color=req.primary_color,
            favicon_url=req.favicon_url,
            contest_cache_ttl=req.contest_cache_ttl,
        )
        db.add(cfg)
    db.commit()
    return {"message": "Site config saved"}


# public info
@app.get("/api/about")
def about():
    import sys
    import fastapi
    return {
        "name": "Luogu Contest Reminder",
        "version": APP_VERSION,
        "repository": "https://github.com/ILoveScratch2/Luogu-Contest-Reminder",
        "license": "AGPL-3.0",
        "backend": {
            "version": APP_VERSION,
            "python": sys.version.split()[0],
            "fastapi": fastapi.__version__,
        },
    }


# contest routes
@app.get("/api/contests/upcoming")
def upcoming_contests(current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cfg = db.query(SiteConfig).first()
    ttl = cfg.contest_cache_ttl if cfg and cfg.contest_cache_ttl is not None else 5
    return get_upcoming_contests(24, ttl) or []


# entry 
if __name__ == "__main__":
    import getpass
    import uvicorn

    init_db()

    db = SessionLocal()
    try:
        root_exists = db.query(User).filter(User.is_root == True).first()  # noqa: E712
        if not root_exists:
            print("=" * 60)
            print("  Luogu Contest Reminder — Initial Setup")
            print("=" * 60)
            email_in = input("管理员邮箱 / Admin email: ").strip()
            pwd_in = getpass.getpass("管理员密码（至少8位）/ Admin password (min 8 chars): ")
            if len(pwd_in) < 8:
                print("密码太短，请重新运行。 / Password too short, please re-run.")
                raise SystemExit(1)
            root = User(
                email=email_in,
                password_hash=hash_password(pwd_in),
                is_root=True,
                is_active=True,
                email_reminder=False,
                send_contest_body=False,
            )
            db.add(root)
            db.commit()
            print(f"\n管理员账户已创建 / Admin account created: {email_in}")
            print("请登录后在管理面板配置 SMTP。")
            print("Please configure SMTP in the admin panel after logging in.")
            print("=" * 60 + "\n")
    finally:
        db.close()

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
