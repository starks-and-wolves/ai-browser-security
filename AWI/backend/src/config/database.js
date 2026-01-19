const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // These options are no longer needed in Mongoose 6+
      // but keeping for compatibility
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error connecting to MongoDB: ${error.message}');
    console.error('⚠️  Server will continue running, but database operations will fail.');
    console.error('⚠️  Please check your MONGODB_URI environment variable.');
    // Don't exit - let the server start even if MongoDB is unavailable
    // This allows health checks to respond and helps with debugging
  }
};

module.exports = connectDB;
