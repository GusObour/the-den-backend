const { createClient } = require('redis');

class RedisClient {
    constructor() {
        this.client = createClient({
            url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
            password: process.env.REDIS_PASSWORD
        });
        this.client.on('error', this.handleError.bind(this));
        this.client.on('connect', this.handleConnect.bind(this));
    }

    handleError(error) {
        console.error('Redis error:', error);
    }

    handleConnect() {
        console.log('Redis connection successful');
    }

    async connect() {
        try {
            await this.client.connect();
            console.log('Connected to Redis');
        } catch (error) {
            this.handleError(error);
        }
    }

    async get(key) {
        try {
            return await this.client.get(key);
        } catch (error) {
            this.handleError(error);
        }
    }

    async set(key, value, expiration) {
        try {
            return await this.client.setEx(key, expiration, value);
        } catch (error) {
            this.handleError(error);
        }
    }

    async del(key) {
        try {
            return await this.client.del(key);
        } catch (error) {
            this.handleError(error);
        }
    }

    async zadd(key, score, member) {
        try {
            return await this.client.zAdd(key, { score, value: member });
        } catch (error) {
            this.handleError(error);
        }
    }

    async zcount(key, min, max) {
        try {
            return await this.client.zCount(key, min, max);
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

module.exports = new RedisClient();
