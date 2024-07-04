const { createLogger, format, transports } = require('winston');

class LoggerService {
  constructor() {
    if (!LoggerService.instance) {
      this.logger = createLogger({
        level: 'info',
        format: format.combine(
          format.timestamp(),
          format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
        ),
        transports: [
          new transports.Console(),
          new transports.File({ filename: 'error.log', level: 'error' }),
          new transports.File({ filename: 'combined.log' }),
        ],
      });

      if (process.env.NODE_ENV !== 'production') {
        this.logger.add(new transports.Console({
          format: format.simple(),
        }));
      }

      LoggerService.instance = this;
    }

    return LoggerService.instance;
  }

  log(level, message) {
    this.logger.log(level, message);
  }

  info(message) {
    this.logger.info(message);
  }

  error(message) {
    this.logger.error(message);
  }
}

module.exports = new LoggerService();
