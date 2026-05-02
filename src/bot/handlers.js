'use strict';

const TelegramBot = require('node-telegram-bot-api');
const binance = require('../exchange/binance');

/**
 * 创建TG Bot并注册所有命令处理器
 */
function createBot(token, client, riskControl, logger) {
  const bot = new TelegramBot(token, { polling: true });

  // /start
  bot.onText(/^\/start$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, [
      '🤖 *币安交易机器人 (测试网)*',
      '',
      '欢迎使用！这是一个基于币安测试网的交易助手。',
      '',
      '*可用命令:*',
      '`/start` - 显示此帮助',
      '`/price <币对>` - 查询价格',
      '`/balance` - 查询余额',
      '`/buy <币对> <数量>` - 市价买入',
      '`/sell <币对> <数量>` - 市价卖出',
      '`/status` - 运行状态',
      '`/help` - 详细帮助',
    ].join('\n'), { parse_mode: 'Markdown' });
    logger.info(`用户 ${chatId} /start`);
  });

  // /price
  bot.onText(/^\/price\s+(\w+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!client) return bot.sendMessage(chatId, '❌ 币安未连接');
    const result = await binance.getPrice(client, match[1]);
    if (result.success) {
      bot.sendMessage(chatId, `💰 *${result.data.symbol}*: \`${result.data.price}\` USDT`, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, `❌ ${result.error}`);
    }
  });

  // /balance
  bot.onText(/^\/balance$/, async (msg) => {
    const chatId = msg.chat.id;
    if (!client) return bot.sendMessage(chatId, '❌ 币安未连接');
    const result = await binance.getBalance(client);
    if (!result.success) return bot.sendMessage(chatId, `❌ ${result.error}`);
    if (result.data.length === 0) return bot.sendMessage(chatId, '📭 余额为空');
    const lines = result.data.map(b => {
      const free = parseFloat(b.free).toFixed(8).replace(/\.?0+$/, '');
      const locked = parseFloat(b.locked).toFixed(8).replace(/\.?0+$/, '');
      let line = `• *${b.asset}*: ${free}`;
      if (parseFloat(b.locked) > 0) line += ` (锁定: ${locked})`;
      return line;
    });
    bot.sendMessage(chatId, `📊 *账户余额*\n\n${lines.join('\n')}`, { parse_mode: 'Markdown' });
    logger.info(`用户 ${chatId} 查询余额`);
  });

  // /buy
  bot.onText(/^\/buy\s+(\w+)\s+([\d.]+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!client) return bot.sendMessage(chatId, '❌ 币安未连接');

    const symbol = match[1].toUpperCase();
    const quantity = parseFloat(match[2]);

    // 风控
    if (symbol.startsWith('BTC') && quantity > 0.01) {
      return bot.sendMessage(chatId, '⚠️ 风控：单笔BTC不超过0.01');
    }
    if (!riskControl.canTrade()) {
      return bot.sendMessage(chatId, '⚠️ 当日交易次数已达上限');
    }

    logger.info(`买入: ${symbol} ${quantity}`);
    const result = await binance.marketBuy(client, symbol, quantity);
    if (result.success) {
      riskControl.recordTrade();
      const priceStr = result.data.avgPrice ? parseFloat(result.data.avgPrice).toFixed(8) : '--';
      bot.sendMessage(chatId,
        `✅ *买入成功*\n• 币对: ${symbol}\n• 数量: ${quantity}\n• 均价: ${priceStr}\n• 订单ID: \`${result.data.orderId}\``,
        { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, `❌ 买入失败: ${result.error}`);
    }
  });

  // /sell
  bot.onText(/^\/sell\s+(\w+)\s+([\d.]+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!client) return bot.sendMessage(chatId, '❌ 币安未连接');

    const symbol = match[1].toUpperCase();
    const quantity = parseFloat(match[2]);

    if (symbol.startsWith('BTC') && quantity > 0.01) {
      return bot.sendMessage(chatId, '⚠️ 风控：单笔BTC不超过0.01');
    }
    if (!riskControl.canTrade()) {
      return bot.sendMessage(chatId, '⚠️ 当日交易次数已达上限');
    }

    logger.info(`卖出: ${symbol} ${quantity}`);
    const result = await binance.marketSell(client, symbol, quantity);
    if (result.success) {
      riskControl.recordTrade();
      const priceStr = result.data.avgPrice ? parseFloat(result.data.avgPrice).toFixed(8) : '--';
      bot.sendMessage(chatId,
        `✅ *卖出成功*\n• 币对: ${symbol}\n• 数量: ${quantity}\n• 均价: ${priceStr}\n• 订单ID: \`${result.data.orderId}\``,
        { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, `❌ 卖出失败: ${result.error}`);
    }
  });

  // /status
  bot.onText(/^\/status$/, (msg) => {
    bot.sendMessage(msg.chat.id, [
      '📟 *机器人状态*',
      '',
      `• 币安: ${client ? '✅ 测试网' : '❌ 未连接'}`,
      `• TG Bot: ✅ 运行中`,
      `• 当日交易: ${riskControl.dailyTradeCount}/${riskControl.maxDailyTrades}`,
      `• 模式: 测试网`,
    ].join('\n'), { parse_mode: 'Markdown' });
  });

  // /help
  bot.onText(/^\/help$/, (msg) => {
    bot.sendMessage(msg.chat.id, [
      '📖 *详细帮助*',
      '',
      '此机器人连接币安*测试网*，所有交易均为模拟。',
      '',
      '*命令详情:*',
      '`/start` - 显示欢迎和命令列表',
      '`/price <币对>` - 查询价格，如 /price BTCUSDT',
      '`/balance` - 查询账户余额',
      '`/buy <币对> <数量>` - 市价买入，如 /buy BTCUSDT 0.001',
      '`/sell <币对> <数量>` - 市价卖出，如 /sell BTCUSDT 0.001',
      '`/status` - 查看机器人状态',
      '`/help` - 显示此帮助',
      '',
      '*风控:*',
      '• 单笔BTC不超0.01',
      '• 每日限50笔交易',
      '',
      '⚠️ 仅供测试使用',
    ].join('\n'), { parse_mode: 'Markdown' });
  });

  // 未知命令
  bot.on('message', (msg) => {
    if (msg.text && msg.text.startsWith('/')) {
      const known = ['start', 'price', 'balance', 'buy', 'sell', 'status', 'help'];
      const cmd = msg.text.split(' ')[0].replace('/', '');
      if (!known.includes(cmd)) {
        bot.sendMessage(msg.chat.id, `❌ 未知命令 \`${msg.text}\`\n输入 /help 查看可用命令`, { parse_mode: 'Markdown' });
      }
    }
  });

  return bot;
}

module.exports = { createBot };
