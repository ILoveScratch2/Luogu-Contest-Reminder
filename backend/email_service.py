import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple

from sqlalchemy.orm import Session
from database import SmtpConfig


# util

def _get_config(db: Session) -> Optional[SmtpConfig]:
    return db.query(SmtpConfig).first()


def _ts_to_cst(ts: int) -> str:
    tz = timezone(timedelta(hours=8))
    dt = datetime.fromtimestamp(ts, tz=tz)
    return dt.strftime("%Y-%m-%d %H:%M CST")


def _send(config: SmtpConfig, to_email: str, subject: str, html: str) -> bool:
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = formataddr((config.from_name, config.from_email))
        msg["To"] = to_email
        msg.attach(MIMEText(html, "html", "utf-8"))

        if config.use_tls:
            ctx = ssl.create_default_context()
            with smtplib.SMTP(config.host, config.port, timeout=15) as srv:
                srv.starttls(context=ctx)
                srv.login(config.username, config.password)
                srv.sendmail(config.from_email, to_email, msg.as_string())
        else:
            with smtplib.SMTP_SSL(config.host, config.port, timeout=15) as srv:
                srv.login(config.username, config.password)
                srv.sendmail(config.from_email, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"[email] 发送失败 -> {to_email}: {e}")
        return False


# API

def test_smtp_connection(config: SmtpConfig) -> Tuple[bool, Optional[str]]:
    try:
        if config.use_tls:
            ctx = ssl.create_default_context()
            with smtplib.SMTP(config.host, config.port, timeout=10) as srv:
                srv.starttls(context=ctx)
                srv.login(config.username, config.password)
        else:
            with smtplib.SMTP_SSL(config.host, config.port, timeout=10) as srv:
                srv.login(config.username, config.password)
        return True, None
    except Exception as e:
        return False, str(e)


def send_verification_email(db: Session, to_email: str, code: str) -> bool:
    config = _get_config(db)
    if not config:
        print("[email] SMTP 未配置，无法发送验证码")
        return False

    subject = "Luogu Contest Reminder — Email Verification"
    html = f"""<!DOCTYPE html>
<html lang="zh">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:40px 0;">
    <table width="480" cellpadding="0" cellspacing="0"
           style="background:#fff;border-radius:12px;overflow:hidden;
                  box-shadow:0 4px 24px rgba(0,0,0,.10);">
      <tr>
        <td style="background:linear-gradient(135deg,#1565c0,#1976d2);
                   padding:32px;text-align:center;color:#fff;">
          <div style="font-size:26px;font-weight:700;letter-spacing:.5px;">
            Luogu Contest Reminder
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:36px 40px;">
          <h2 style="color:#1976d2;margin:0 0 12px;">邮箱验证码</h2>
          <p style="color:#555;margin:0 0 24px;">
            请在注册页面输入以下验证码以完成账号注册：<br>
            <span style="color:#888;font-size:13px;">
              Please enter the code below to complete registration.
            </span>
          </p>
          <div style="background:#e3f2fd;border:2px solid #1976d2;border-radius:10px;
                      padding:24px;text-align:center;margin-bottom:24px;">
            <span style="font-size:40px;font-weight:800;letter-spacing:12px;
                         color:#1565c0;">{code}</span>
          </div>
          <p style="color:#999;font-size:13px;margin:0;">
            验证码 <strong>5 分钟</strong>内有效。如非本人操作，请忽略此邮件。<br>
            Code is valid for <strong>5 minutes</strong>.
            Ignore if you did not request this.
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""
    return _send(config, to_email, subject, html)


def send_contest_reminder(
    db: Session,
    to_email: str,
    contests: list,
    include_body: bool = False,
) -> bool:
    config = _get_config(db)
    if not config:
        print("[email] SMTP 未配置，跳过提醒")
        return False

    count = len(contests)
    subject = f"Luogu Contest Reminder: {count} Contest(s) Starting Soon"

    cards = ""
    for c in contests:
        cid = c.get("id", "")
        name = c.get("name", "Unknown")
        start = _ts_to_cst(c.get("startTime", 0))
        end = _ts_to_cst(c.get("endTime", 0))
        url = f"https://www.luogu.com.cn/contest/{cid}"
        desc = c.get("description", "")

        body_section = ""
        if include_body and desc:
            body_section = f"""
            <details style="margin-top:12px;">
              <summary style="cursor:pointer;color:#1976d2;font-weight:600;font-size:14px;">
                查看比赛简介 / View Description
              </summary>
              <div style="margin-top:8px;padding:12px;background:#fafafa;
                          border-radius:6px;font-size:13px;color:#555;
                          line-height:1.6;">
                {desc}
              </div>
            </details>"""

        cards += f"""
        <div style="background:#fff;border-radius:10px;padding:20px 24px;
                    margin-bottom:16px;border-left:5px solid #1976d2;
                    box-shadow:0 2px 8px rgba(0,0,0,.08);">
          <h3 style="margin:0 0 8px;font-size:18px;">
            <a href="{url}" style="color:#1565c0;text-decoration:none;">{name}</a>
          </h3>
          <p style="margin:4px 0;color:#666;font-size:14px;">
            <strong>开始 / Start：</strong>{start}
          </p>
          <p style="margin:4px 0;color:#666;font-size:14px;">
            <strong>结束 / End：</strong>{end}
          </p>
          <a href="{url}"
             style="display:inline-block;margin-top:12px;padding:8px 18px;
                    background:#1976d2;color:#fff;text-decoration:none;
                    border-radius:6px;font-size:14px;">
            前往比赛 / Go to Contest
          </a>
          {body_section}
        </div>"""

    html = f"""<!DOCTYPE html>
<html lang="zh">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:40px 0;">
    <table width="560" cellpadding="0" cellspacing="0"
           style="background:#f0f2f5;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="background:linear-gradient(135deg,#1565c0,#1976d2);
                   padding:32px;text-align:center;color:#fff;">
          <div style="font-size:26px;font-weight:700;">Luogu Contest Reminder</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 20px 8px;">
          <p style="color:#333;font-size:15px;margin:0 0 20px;">
            以下 <strong>{count}</strong> 场比赛将在未来 24 小时内开始：<br>
            <span style="color:#888;font-size:13px;">
              The following <strong>{count}</strong> contest(s) will start within
              the next 24 hours:
            </span>
          </p>
          {cards}
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px 32px;">
          <hr style="border:none;border-top:1px solid #ddd;margin:0 0 16px;">
          <p style="color:#aaa;font-size:12px;text-align:center;margin:0;">
            Luogu Contest Reminder<br>
            如需退订，请登录后在控制台关闭提醒功能。<br>
            To unsubscribe, disable reminders in your dashboard.
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""
    return _send(config, to_email, subject, html)
