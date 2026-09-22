const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect('mongodb://127.0.0.1:27017/inventory_order_api_test', {
      serverSelectionTimeoutMS: 5000,
      family: 4
    });
    console.log('Connected successfully!');
    await mongoose.connection.close();
  } catch (error) {
    console.error('Connection failed:', error);
  }
}

testConnection();
