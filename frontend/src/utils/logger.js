// utils/logger.js
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const currentLevel = process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;

const createLogger = (level) => (message, ...args) => {
  if (level <= currentLevel) {
    const timestamp = new Date().toISOString();
    const levelName = Object.keys(LOG_LEVELS)[level];
    console[level === LOG_LEVELS.ERROR ? 'error' : level === LOG_LEVELS.WARN ? 'warn' : 'log'](
      `[${timestamp}] ${levelName}:`,
      message,
      ...args
    );
  }
};

export const logger = {
  error: createLogger(LOG_LEVELS.ERROR),
  warn: createLogger(LOG_LEVELS.WARN),
  info: createLogger(LOG_LEVELS.INFO),
  debug: createLogger(LOG_LEVELS.DEBUG)
};