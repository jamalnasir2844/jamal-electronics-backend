const app = require('./app');
const mongoose = require('mongoose');
const dns = require('dns');

// Fix potential DNS issues on serverless
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (err) {
  // Ignore
}

// Global variable to cache the DB connection in serverless environments
let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected) {
    return;
  }
  try {
    const db = await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'jamal_electronics',
    });
    isConnected = db.connections[0].readyState === 1;
    console.log('✅ MongoDB Connected (Serverless)');
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
  }
};

// Middleware to ensure DB connection before handling API requests
app.use(async (req, res, next) => {
  await connectToDatabase();
  next();
});

module.exports = app;
