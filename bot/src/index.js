'use strict';

const config = require('./config');
const log    = require('./logger');
const { createBot } = require('./telegram/bot');

async function main() {
  log.info({ repo: `${config.github.owner}/${config.github.repo}`, branch: config.github.branch, admins: config.admins }, 'Anypedia Bot стартует');

  const bot = createBot();

  process.once('SIGINT',  () => { bot.stop('SIGINT');  process.exit(0); });
  process.once('SIGTERM', () => { bot.stop('SIGTERM'); process.exit(0); });

  try {
    await bot.launch();
    log.info('Бот запущен (long-polling).');
  } catch (err) {
    log.fatal({ err: err.message }, 'Не удалось запустить бот');
    process.exit(1);
  }
}

main();
