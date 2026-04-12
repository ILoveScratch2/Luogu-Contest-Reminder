<div align="center">

# Luogu Contest Reminder

> *"A free and open-source modern email reminder system for Luogu contests"*

[![License: AGPLv3](https://img.shields.io/badge/License-AGPL-blue.svg)](LICENSE)

**A modern Luogu contest email reminder system built with Python FastAPI + React**

[English](README_EN.md) | [中文](README.md)

<br>
</div>

## Introduction

Luogu Contest Reminder is an open-source email notification system for Luogu contests, designed to help users stay informed about upcoming contests.

Inspired by [Luogu Contest Notifier](https://www.demetri.top), it uses a more modern tech stack (FastAPI + React), adds better configuration options, contains no ads, and is fully open source.

## Quick Start

Work in progress...

## Running from Source

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

On the first run, you will be prompted to create an admin account (enter email and password).  
The backend API server listens on `http://0.0.0.0:8000` by default.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Access the app at `http://localhost:5173`.

You can configure the project locally via `http://localhost:5173`. After the first run, log in as admin and configure SMTP before emails can be sent or received.

Both the backend and frontend must be running simultaneously.

---

## Features

### Regular Users
- **Register**: Enter your email → Receive a verification code → Set a password
- **Log in**: Email + password
- **Dashboard**:
  - Toggle email reminders on or off
  - View contests starting in the next 24 hours
  - Delete your account

### Admin (root)
- **User management**: View all users, edit (active status / reminder toggle / role / reset password), delete accounts
- **SMTP configuration**: Enter SMTP server details, test the connection
- **System actions**: Manually trigger a reminder immediately (without waiting for the daily 08:00 job)

## Highlights
- **Modern**: Built with FastAPI and React for a smooth user experience and high performance.
- **Fully open source**: No ads, code is fully public — contributions and improvements are welcome.
- **Flexible configuration**: Easy to configure to fit different needs.
- **Self-hostable**: Deploy on your own server for full control over your data and service.

---

## Scheduled Task

The scheduler runs automatically once per day at **08:00 CST (Beijing Time)**,  
sending contest notifications for contests starting within the next 24 hours to all active users with reminders enabled.  
Contests that have already been notified will not be sent again.

---

## SMTP Configuration

An SMTP server must be configured before emails can be sent.

| Provider | Host | Port | TLS |
|----------|------|------|-----|
| QQ Mail | smtp.qq.com | 587 | ✅ |
| 163 Mail | smtp.163.com | 465 | ❌ (SSL) |
| Gmail | smtp.gmail.com | 587 | ✅ |
| Outlook | smtp.office365.com | 587 | ✅ |

> For providers like 163 and QQ Mail, you must enable SMTP in mailbox settings and use the generated **authorization code** as the password.

---

## License

Both the frontend and backend of this project are licensed under the  
[GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html).  
See the [LICENSE](LICENSE) file for details.

This strongest Copyleft license requires that any distributed or network-served modified version provide its complete source code under the same license. Copyright and license notices must be retained, and contributors explicitly grant patent rights.
