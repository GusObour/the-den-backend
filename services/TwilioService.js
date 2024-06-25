const twilio = require("twilio");
const moment = require("moment");
const cron = require("node-cron");
const RedisClient = require("./RedisClientService");
const MessageQueue = require("./MessageQueueService");

class TwilioService {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.redisClient;
    this.messageQueue = new MessageQueue("smsQueue", {
      redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD
      }
    });

    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    this.rateLimitWindow = 60 * 60;
    this.rateLimitCount = 100;

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
    this.redisClient = RedisClient.getClient();
    const key = `sms_rate_limit:${to}`;
    const currentTimestamp = moment().unix();

    const messageCount = await this.redisClient.zcount(
      key,
      currentTimestamp - this.rateLimitWindow,
      currentTimestamp
    );

    if (messageCount >= this.rateLimitCount) {
      console.error(`Rate limit exceeded for ${to}. Message not sent.`);
      throw new Error(`Rate limit exceeded for ${to}`);
    }

    console.log(`Sending SMS to: ${to}, Body: ${body}`);
    const message = await this.client.messages.create({
      body,
      from: this.phoneNumber,
      to,
    });

    await this.redisClient.zadd(key, currentTimestamp, message.sid);
    await this.redisClient.expire(key, this.rateLimitWindow);

    console.log("SMS sent successfully:", message.sid);
    return message;
  }
}

module.exports = new TwilioService();
