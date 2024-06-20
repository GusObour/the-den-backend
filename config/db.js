const mongoose = require('mongoose');

class Database {
  constructor() {
    this.mongooseConnection = null;
  }

  async connect() {
    try {
      this.mongooseConnection = await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
        useCreateIndex: true
    });
      console.log('Database connected successfully');
      return this.mongooseConnection;
    } catch (err) {
      console.log('Error connecting to database', err);
      throw err; 
    }
  }
}

module.exports = new Database();