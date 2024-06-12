const session = require('express-session');
const MongoStore = require('connect-mongo');

class SessionManager {
  constructor(app, mongooseConnection) {
    this.app = app;
    this.mongooseConnection = mongooseConnection;
  }

  initialize() {
    const sessionSecret = process.env.SESSION_SECRET;

    if (!sessionSecret) {
      throw new Error('SESSION_SECRET environment variable is not set');
    }

    this.app.use(
      session({
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
          mongoUrl: this.mongooseConnection.connection._connectionString,
        }),
        cookie: {
          maxAge: 1000 * 60 * 60 * 24, // 1 day
        },
      })
    );
  }
}

module.exports = SessionManager;
