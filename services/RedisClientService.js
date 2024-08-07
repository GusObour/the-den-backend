const { createClient } = require('redis');
const logger = require('./LoggerService');

class RedisClient {
  constructor() {
    if (!RedisClient.instance) {
      this.client = createClient({
        url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
        password: process.env.REDIS_PASSWORD,
        socket: {
          reconnectStrategy: retries => {
            if (retries > 50) {
              return new Error('Reached maximum retry attempts');
            }
            return Math.min(retries * 50, 2000); // Wait 50ms, 100ms, 150ms, ... until 2000ms
          }
        },
        maxRetriesPerRequest: 50 // Increase this value if needed
      });
      this.client.on('error', this.handleError.bind(this));
      this.client.on('connect', this.handleConnect.bind(this));
      RedisClient.instance = this;
    }

    return RedisClient.instance;
  }

  handleError(error) {
    logger.error(`Redis error: ${error.message}`);
  }

  handleConnect() {
    logger.info('Redis connection successful');
  }

  async connect() {
    try {
      await this.client.connect();
      logger.info('Connected to Redis');
    } catch (error) {
      this.handleError(error);
    }
  }

  async expire(key, seconds) {
    try {
      return await this.client.expire(key, seconds);
    } catch (error) {
      this.handleError(error);
    }
  }

  close() {
    this.client.quit();
  }

  getClient() {
    return this.client;
  }
}

module.exports = RedisClient;
