'use strict';

const pino = require('pino');
const config = require('./config');

const transport = config.isDev
  ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' } }
  : undefined;

const logger = pino(
  { level: config.log.level },
  transport ? pino.transport(transport) : undefined
);

module.exports = logger;