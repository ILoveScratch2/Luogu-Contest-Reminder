import smtplib
import ssl
import time
import mistune
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple, Union

from sqlalchemy.orm import Session
from database import SmtpConfig


# ── helpers ──────────────────────────────────────────────────

def _get_config(db: Session) -> Optional[SmtpConfig]:
    return db.query(SmtpConfig).first()


def _ts_to_cst(ts: int) -> str:
    tz = timezone(timedelta(hours=8))
    dt = datetime.fromtimestamp(ts, tz=tz)
    return dt.strftime("%Y-%m-%d %H:%M CST")


def _darken_color(hex_color: str, factor: float = 0.78) -> str:
    h = hex_color.lstrip('#')
    if len(h) != 6:
        return hex_color
    r = int(int(h[0:2], 16) * factor)
    g = int(int(h[2:4], 16) * factor)
    b = int(int(h[4:6], 16) * factor)
    return f'#{r:02x}{g:02x}{b:02x}'


def _get_primary_color(db: Session) -> str:
    from database import SiteConfig
    cfg = db.query(SiteConfig).first()
    if cfg and cfg.primary_color and cfg.primary_color.startswith('#'):
        return cfg.primary_color
    return '#1976d2'


DEFAULT_VERIFICATION_SUBJECT = "Luogu Contest Reminder — 邮件验证码"
DEFAULT_REMINDER_SUBJECT = "Luogu Contest Reminder: {{count}} 场比赛即将开始"

# Placeholders for verification: {{code}}, {{primary_color}}, {{dark_color}}, {{site_title}}
DEFAULT_VERIFICATION_HTML = """\
<!DOCTYPE html>
<html lang="zh">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:40px 0;">
    <table width="480" cellpadding="0" cellspacing="0"
           style="background:#fff;border-radius:12px;overflow:hidden;
                  box-shadow:0 4px 24px rgba(0,0,0,.10);">
      <tr>
        <td style="background:linear-gradient(135deg,{{dark_color}},{{primary_color}});
                   padding:32px;text-align:center;color:#fff;">
          <div style="font-size:26px;font-weight:700;letter-spacing:.5px;">
            {{site_title}}
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:36px 40px;">
          <h2 style="color:{{primary_color}};margin:0 0 12px;">邮箱验证码</h2>
          <p style="color:#555;margin:0 0 24px;">
            请在注册页面输入以下验证码以完成账号注册：
          </p>
          <div style="background:#e3f2fd;border:2px solid {{primary_color}};border-radius:10px;
                      padding:24px;text-align:center;margin-bottom:24px;">
            <span style="font-size:40px;font-weight:800;letter-spacing:12px;
                         color:{{dark_color}};">{{code}}</span>
          </div>
          <p style="color:#999;font-size:13px;margin:0;">
            验证码 <strong>5 分钟</strong>内有效。如非本人操作，请忽略此邮件。
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""

# Placeholders for reminder: {{count}}, {{cards_html}}, {{primary_color}}, {{dark_color}}, {{site_title}}
DEFAULT_REMINDER_HTML = """\
<!DOCTYPE html>
<html lang="zh">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:40px 0;">
    <table width="560" cellpadding="0" cellspacing="0"
           style="background:#f0f2f5;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="background:linear-gradient(135deg,{{dark_color}},{{primary_color}});
                   padding:32px;text-align:center;color:#fff;">
          <div style="font-size:26px;font-weight:700;">{{site_title}}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 20px 8px;">
          <p style="color:#333;font-size:15px;margin:0 0 20px;">
            以下 <strong>{{count}}</strong> 场比赛将在未来 {{advance_hours}} 小时内开始：
          </p>
          {{cards_html}}
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px 32px;">
          <hr style="border:none;border-top:1px solid #ddd;margin:0 0 16px;">
          <p style="color:#aaa;font-size:12px;text-align:center;margin:0;">
            {{site_title}}<br>
            如需退订，请登录后在控制台关闭提醒功能。
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""


def _render_template(html: str, vars: dict) -> str:
    for key, val in vars.items():
        html = html.replace('{{' + key + '}}', str(val))
    return html


def _get_site_title(db: Session) -> str:
    from database import SiteConfig
    cfg = db.query(SiteConfig).first()
    if cfg and cfg.site_title:
        return cfg.site_title
    return "Luogu Contest Reminder"


def _get_custom_template(db: Session, tpl_type: str):
    """Returns (subject, html_body) from DB or (None, None) if not set."""
    from database import EmailTemplate
    row = db.query(EmailTemplate).filter(EmailTemplate.type == tpl_type).first()
    if row:
        return row.subject or None, row.html_body or None
    return None, None


def _send(config: SmtpConfig, to_emails: Union[str, List[str]], subject: str, html: str) -> bool:
    if isinstance(to_emails, str):
        to_emails = [to_emails]

    retry_enabled = getattr(config, 'retry_enabled', True)
    retry_max_attempts = getattr(config, 'retry_max_attempts', 3)
    retry_interval = getattr(config, 'retry_interval', 30)
    max_tries = (retry_max_attempts + 1) if retry_enabled else 1

    for attempt in range(max_tries):
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = formataddr((config.from_name, config.from_email))
            # Use BCC: single rec shown in To, multiple rec use undisclosed-recipients
            if len(to_emails) == 1:
                msg["To"] = to_emails[0]
            else:
                msg["To"] = "undisclosed-recipients:;"
            msg.attach(MIMEText(html, "html", "utf-8"))

            if config.use_tls:
                ctx = ssl.create_default_context()
                with smtplib.SMTP(config.host, config.port, timeout=15) as srv:
                    srv.starttls(context=ctx)
                    srv.login(config.username, config.password)
                    srv.sendmail(config.from_email, to_emails, msg.as_string())
            else:
                with smtplib.SMTP_SSL(config.host, config.port, timeout=15) as srv:
                    srv.login(config.username, config.password)
                    srv.sendmail(config.from_email, to_emails, msg.as_string())
            return True
        except Exception as e:
            if attempt < max_tries - 1:
                print(f"[email] 发送失败 (第 {attempt + 1}/{max_tries} 次): {e}，将在 {retry_interval}s 后重试")
                time.sleep(retry_interval)
            else:
                print(f"[email] 发送失败 (第 {attempt + 1}/{max_tries} 次): {e}")
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

    primary = _get_primary_color(db)
    dark = _darken_color(primary)
    site_title = _get_site_title(db)

    custom_subject, custom_html = _get_custom_template(db, "verification")

    subject = custom_subject or DEFAULT_VERIFICATION_SUBJECT
    html_tpl = custom_html or DEFAULT_VERIFICATION_HTML
    html = _render_template(html_tpl, {
        "code": code,
        "primary_color": primary,
        "dark_color": dark,
        "site_title": site_title,
    })
    return _send(config, to_email, subject, html)


def send_contest_reminder(
    db: Session,
    to_emails: Union[str, List[str]],
    contests: list,
    include_body: bool = False,
    advance_hours: int = 24,
) -> bool:
    config = _get_config(db)
    if not config:
        print("[email] SMTP 未配置，跳过提醒")
        return False

    primary = _get_primary_color(db)
    dark = _darken_color(primary)
    site_title = _get_site_title(db)

    custom_subject, custom_html = _get_custom_template(db, "reminder")

    count = len(contests)

    # Build cards HTML block (always rendered internally)
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
            desc_html = mistune.html(desc)
            body_section = f"""
            <details style="margin-top:12px;">
              <summary style="cursor:pointer;color:{primary};font-weight:600;font-size:14px;">
                查看比赛简介 / View Description
              </summary>
              <div style="margin-top:8px;padding:12px;background:#fafafa;
                          border-radius:6px;font-size:13px;color:#555;
                          line-height:1.6;">
                {desc_html}
              </div>
            </details>"""

        cards += f"""
        <div style="background:#fff;border-radius:10px;padding:20px 24px;
                    margin-bottom:16px;border-left:5px solid {primary};
                    box-shadow:0 2px 8px rgba(0,0,0,.08);">
          <h3 style="margin:0 0 8px;font-size:18px;">
            <a href="{url}" style="color:{dark};text-decoration:none;">{name}</a>
          </h3>
          <p style="margin:4px 0;color:#666;font-size:14px;">
            <strong>开始 / Start：</strong>{start}
          </p>
          <p style="margin:4px 0;color:#666;font-size:14px;">
            <strong>结束 / End：</strong>{end}
          </p>
          <a href="{url}"
             style="display:inline-block;margin-top:12px;padding:8px 18px;
                    background:{primary};color:#fff;text-decoration:none;
                    border-radius:6px;font-size:14px;">
            前往比赛 / Go to Contest
          </a>
          {body_section}
        </div>"""

    raw_subject = custom_subject or DEFAULT_REMINDER_SUBJECT
    subject = raw_subject.replace("{{count}}", str(count))

    html_tpl = custom_html or DEFAULT_REMINDER_HTML
    html = _render_template(html_tpl, {
        "count": count,
        "cards_html": cards,
        "primary_color": primary,
        "dark_color": dark,
        "site_title": site_title,
        "advance_hours": advance_hours,
    })
    return _send(config, to_emails, subject, html)


def send_change_email_verification(db: Session, to_email: str, code: str, is_new_email: bool) -> bool:
    config = _get_config(db)
    if not config:
        print("[email] SMTP 未配置，无法发送验证码")
        return False

    primary = _get_primary_color(db)
    dark = _darken_color(primary)
    site_title = _get_site_title(db)

    if is_new_email:
        desc = "您正在更换账号绑定的邮箱。请在页面输入以下验证码以验证<strong>新邮箱</strong>："
        purpose_label = "新邮箱验证"
    else:
        desc = "您正在更换账号绑定的邮箱。请在页面输入以下验证码以验证<strong>当前邮箱</strong>："
        purpose_label = "当前邮箱验证"

    subject = f"{site_title} — 邮箱换绑验证码（{purpose_label}）"
    html = f"""\
<!DOCTYPE html>
<html lang="zh">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:40px 0;">
    <table width="480" cellpadding="0" cellspacing="0"
           style="background:#fff;border-radius:12px;overflow:hidden;
                  box-shadow:0 4px 24px rgba(0,0,0,.10);">
      <tr>
        <td style="background:linear-gradient(135deg,{dark},{primary});
                   padding:32px;text-align:center;color:#fff;">
          <div style="font-size:26px;font-weight:700;letter-spacing:.5px;">
            {site_title}
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:36px 40px;">
          <h2 style="color:{primary};margin:0 0 12px;">邮箱换绑验证码</h2>
          <p style="color:#555;margin:0 0 24px;">
            {desc}
          </p>
          <div style="background:#e3f2fd;border:2px solid {primary};border-radius:10px;
                      padding:24px;text-align:center;margin-bottom:24px;">
            <span style="font-size:40px;font-weight:800;letter-spacing:12px;
                         color:{dark};">{code}</span>
          </div>
          <p style="color:#999;font-size:13px;margin:0;">
            验证码 <strong>10 分钟</strong>内有效。如非本人操作，请忽略此邮件。
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""
    return _send(config, to_email, subject, html)
