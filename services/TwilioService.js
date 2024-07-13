const twilio = require("twilio");
const moment = require("moment");
const Redis = require("ioredis");
const MessageQueue = require("./MessageQueueService");
const cron = require("node-cron");

class TwilioService {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
    });
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    this.rateLimitWindow = 60 * 60; // 1 hour
    this.rateLimitCount = 100; // 100 messages per hour per number

    this.messageQueue = new MessageQueue("smsQueue", {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD
    });

    this.setupQueue();
    this.scheduleFailedJobsRetry();
  }

  setupQueue() {
    this.messageQueue.processJob(async (job, done) => {
      try {
        await this.processSMS(job.data.to, job.data.body);
        done();
      } catch (error) {
        done(error);
      }
    });

    this.messageQueue.onFailed((job, err) => {
      console.error(`Job failed ${job.id} with error ${err.message}`);
    });
  }

  async retryFailedJobs() {
    const failedJobs = await this.messageQueue.queue.getFailed();
    console.log("Retrying failed jobs:", failedJobs.length);

    if (failedJobs.length === 0) return console.log("No failed jobs to retry");

    failedJobs.forEach(async (job) => {
      console.log(`Retrying job ${job.id}`);
      await job.retry();
    });
  }

  scheduleFailedJobsRetry() {
    // Schedule to run every 2 hours
    cron.schedule("0 */2 * * *", () => {
      console.log("Scheduled task running: Retrying failed jobs");
      this.retryFailedJobs();
    });
  }

  async sendSMS(to, body) {
    try {
      await this.messageQueue.addJob({ to, body });
      console.log(`SMS job added to the queue for: ${to}`);
    } catch (error) {
      console.error("Error adding SMS job to the queue:", error);
      throw error;
    }
  }

  async processSMS(to, body) {
    try {
      const currentTimestamp = moment().unix();
      const key = `sms_rate_limit:${to}`;

      // Check the number of messages sent in the rate limit window
      const messageCount = await this.redisClient.zcount(
        key,
        currentTimestamp - this.rateLimitWindow,
        currentTimestamp
      );

      if (messageCount >= this.rateLimitCount) {
        console.error(`Rate limit exceeded for ${to}. Message not sent.`);
        throw new Error(`Rate limit exceeded for ${to}`);
      }

      // Send the SMS
      console.log(`Sending SMS to: ${to}, Body: ${body}`);
      const message = await this.client.messages.create({
        body,
        from: this.phoneNumber,
        to,
      });

      // create better error handling for Twilio

      // Log the message sending in Redis
      await this.redisClient.zadd(key, currentTimestamp, message.sid);
      await this.redisClient.expire(key, this.rateLimitWindow);

      console.log("SMS sent successfully:", message.sid);
      return message;
    } catch (error) {
      console.error("Error sending SMS:", error);
      throw error;
    }
  }
}

module.exports = new TwilioService();
