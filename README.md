<div align="center">

# Luogu Contest Reminder

> *「自由开源的现代化洛谷比赛邮箱提醒系统」*

[![License: AGPLv3](https://img.shields.io/badge/License-AGPL-blue.svg)](LICENSE)


**现代化洛谷比赛邮箱提醒系统，基于 Python FastAPI + React 制作**


[English](README_EN.md) | [中文](README.md) 

<br>
</div>

## 简介

Luogu Contest Reminder 是一个开源的洛谷比赛邮箱提醒系统，旨在帮助用户及时了解即将开始的洛谷比赛。

由 [Luogu Contest Notifier](https://www.demetri.top) 启发，使用更现代的技术栈（FastAPI + React），并添加了更好的配置功能，没有任何广告，完全开源。

## 快速开始

Work in progress...

## 从源码运行

### 1. 后端

```bash
cd backend
pip install -r requirements.txt
python main.py
```

首次运行会提示创建管理员账号（输入邮箱和密码）。  
后端 API 服务默认监听 `http://0.0.0.0:8000`。

### 2. 前端

```bash
cd frontend
npm install
npm run dev
```

访问 `http://localhost:5173`。

在本地可使用 `http://localhost:5173` 访问并配置项目。初次运行后需要使用管理员登录网页并配置 SMTP 才能正常收发邮件。

前后端需要同时运行

---

## 功能说明

### 普通用户
- **注册**：输入邮箱 -> 获取验证码 -> 设置密码
- **登录**：邮箱 + 密码
- **控制台**：
  - 控制邮箱提醒
  - 查看未来 24 小时内的即将开赛列表
  - 注销账号

### 管理员（默认 root）
- **用户管理**：查看所有用户、编辑（活跃状态/提醒开关/角色/重置密码）、删除账户
- **SMTP 配置**：填写 SMTP 服务器信息、测试连接
- **系统操作**：立即手动触发一次提醒（无需等到每日 08:00）

## 特色
 - 现代化：使用 FastAPI 和 React，提供更流畅的用户体验和更高的性能。
 - 完全开源：没有任何广告，代码完全公开，欢迎贡献和改进。
 - 灵活配置：轻松配置，满足不同需求。
 - 可自部署：在自己的服务器上部署，完全控制数据和服务。

---

## 定时任务

调度器默认在每日的 中国标准时间（北京时间） 上午 8:00 自动运行一次，  
向所有启用提醒的活跃用户发送未来 24 小时内开始的比赛通知。  
已发送过的比赛不会重复提醒。

---

## SMTP 配置

需要配置 SMTP 服务器，才能发送邮件消息。

> 163 / QQ 等需要在邮箱设置中开启 SMTP 并获取**授权码**作为密码。

---

## License


本程序的前端与后端均采用 [GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html) 许可证。详见 [LICENSE](LICENSE) 文件。

此最强 Copyleft 许可的权限以在同一许可下提供许可作品和修改的完整源代码为条件，其中包括使用许可作品的较大作品。版权和许可声明必须保留 贡献者明确授予专利权。当使用修改后的版本通过网络提供服务时，必须提供修改后版本的完整源代码。