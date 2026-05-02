# 🤖 币安TG交易机器人

> 基于币安测试网的 Telegram 交易机器人 | 零成本 · 纯模拟

[![Node.js](https://img.shields.io/badge/Node.js-22+-green)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

## ✨ 功能

| 命令 | 说明 | 示例 |
|------|------|------|
| `/start` | 显示帮助 | `/start` |
| `/price <币对>` | 查询实时价格 | `/price BTCUSDT` |
| `/balance` | 查询账户余额 | `/balance` |
| `/buy <币对> <数量>` | 市价买入 | `/buy BTCUSDT 0.001` |
| `/sell <币对> <数量>` | 市价卖出 | `/sell BTCUSDT 0.001` |
| `/status` | 查看运行状态 | `/status` |
| `/help` | 详细帮助 | `/help` |

## 🚀 快速开始

### 1. 准备工作
- [创建 Telegram Bot](https://t.me/BotFather) → 获取 `TELEGRAM_BOT_TOKEN`
- [注册币安测试网](https://testnet.binance.vision/) → 获取 API Key + Secret Key

### 2. 部署 (Railway 一键部署)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/XXX)

或手动部署：
1. Fork 此仓库
2. Railway 中选 GitHub Deploy
3. 添加环境变量:
   - `TELEGRAM_BOT_TOKEN` = 你的 Bot Token
   - `BINANCE_API_KEY` = 币安测试网 API Key
   - `BINANCE_SECRET_KEY` = 币安测试网 Secret Key

### 3. 本地运行
```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入你的 Token 和 Keys

# 启动
npm start
```

## 🛡️ 风控系统
- 单笔 BTC 交易上限: 0.01 BTC
- 每日交易次数上限: 50 笔
- 所有交易均在测试网执行，不涉及真实资产

## 📁 项目结构
```
├── src/
│   ├── index.js           # 入口文件
│   ├── bot/handlers.js    # TG Bot 命令处理
│   ├── exchange/binance.js # 币安 API 封装
│   └── utils/logger.js    # 日志系统
├── config/                # 配置文件
├── .env.example           # 环境变量模板
├── nixpacks.toml          # Railway 部署配置
└── package.json
```

## ⚖️ 免责声明
本项目仅供学习和测试使用。所有交易在币安**测试网**执行，**不涉及真实资金**。加密货币交易风险极高，请谨慎对待。

## 📄 License
MIT
