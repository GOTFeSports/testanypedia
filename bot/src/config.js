'use strict';

require('dotenv').config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    console.error(`[config] Обязательная переменная окружения ${name} не задана. Проверьте .env.`);
    process.exit(1);
  }
  return value.trim();
}

function optionalEnv(name, defaultValue = '') {
  return (process.env[name] || defaultValue).trim();
}

function parseAdminIds(raw) {
  if (!raw || !raw.trim()) {
    console.error('[config] ADMIN_TELEGRAM_IDS не задан.');
    process.exit(1);
  }
  return raw.split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const n = Number(s);
    if (!Number.isInteger(n) || n <= 0) {
      console.error(`[config] Некорректный Telegram ID: "${s}"`);
      process.exit(1);
    }
    return n;
  });
}

const config = {
  bot:    { token: requireEnv('BOT_TOKEN') },
  github: {
    token:    requireEnv('GITHUB_TOKEN'),
    owner:    requireEnv('GITHUB_OWNER'),
    repo:     requireEnv('GITHUB_REPO'),
    branch:   optionalEnv('GITHUB_BRANCH', 'main'),
    committer: {
      name:  optionalEnv('GIT_COMMITTER_NAME',  'AnypediaBot'),
      email: optionalEnv('GIT_COMMITTER_EMAIL', 'bot@anypedia.ru'),
    },
  },
  admins: parseAdminIds(process.env.ADMIN_TELEGRAM_IDS),
  log:    { level: optionalEnv('LOG_LEVEL', 'info') },
  isDev:  optionalEnv('NODE_ENV', 'production') === 'development',
};

module.exports = config;