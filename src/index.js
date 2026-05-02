'use strict';

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const logger = require('./utils/logger');
const { createClient } = require('./exchange/binance');
const { createBot } = require('./bot/handlers');
const cron = require('node-cron');

// ─── 风控模块 ───────────────────────────────────────────
const riskControl = {
  dailyTradeCount: 0,
  maxDailyTrades: parseInt(process.env.MAX_DAILY_TRADES, 10) || 50,
  dailyResetTime: null,

  canTrade() {
    this._checkDailyReset();
    return this.dailyTradeCount < this.maxDailyTrades;
  },

  recordTrade() {
    this._checkDailyReset();
    this.dailyTradeCount++;
    logger.info(`风控: 当日交易次数 ${this.dailyTradeCount}/${this.maxDailyTrades}`);
  },

  remainingTrades() {
    this._checkDailyReset();
    return Math.max(0, this.maxDailyTrades - this.dailyTradeCount);
  },

  _checkDailyReset() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.dailyResetTime !== today) {
      this.dailyTradeCount = 0;
      this.dailyResetTime = today;
      logger.info('风控: 日交易计数已重置');
    }
  },
};

// ─── 初始化 ──────────────────────────────────────────────
let binanceClient = null;
let tgBot = null;

function printBanner() {
  const pkg = require('../package.json');
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log(`║  币安TG交易机器人 v${pkg.version}           ║`);
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Node.js: ${process.version.padEnd(28)} ║`);
  console.log(`║  交易模式: 测试网                        ║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
}

async function main() {
  printBanner();
  const appName = '币安TG交易机器人';
  logger.info(`${appName} 启动中...`);

  // 初始化币安
  const apiKey = process.env.BINANCE_API_KEY;
  const secretKey = process.env.BINANCE_SECRET_KEY;
  if (apiKey && secretKey) {
    binanceClient = createClient(apiKey, secretKey);
    logger.info('币安测试网客户端初始化成功');
  } else {
    logger.warn('币安API密钥未配置，币安功能不可用');
  }

  // 初始化TG Bot
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (botToken) {
    tgBot = createBot(botToken, binanceClient, riskControl, logger);
    logger.info('Telegram Bot 初始化成功');
  } else {
    logger.warn('TG Bot Token未配置，TG Bot不可用');
  }

  // 定时任务
  const statusJob = cron.schedule('0 * * * *', () => {
    logger.info('定时状态', {
      uptime: process.uptime(), dailyTrades: riskControl.dailyTradeCount,
      binance: !!binanceClient, telegram: !!tgBot,
    });
  });

  // 优雅退出
  function shutdown(signal) {
    logger.info(`收到 ${signal}，关闭中...`);
    statusJob.stop();
    if (tgBot) tgBot.stopPolling().catch(() => {});
    setTimeout(() => process.exit(0), 500);
  }
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('uncaughtException', (err) => logger.error('未捕获异常', { error: err.message }));
  process.on('unhandledRejection', (reason) => logger.error('未处理Promise拒绝', { reason }));

  logger.info('机器人启动完成，等待指令...');
}

main().catch((err) => {
  logger.error('启动失败', { error: err.message });
  process.exit(1);
});

module.exports = { logger, binanceClient, tgBot, riskControl };
