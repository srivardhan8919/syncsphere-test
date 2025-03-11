const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI || 'mongodb+srv://syncsphereuser:nani123a@syncshpere.3kgfs.mongodb.net/?retryWrites=true&w=majority&appName=syncshpere';
const client = new MongoClient(uri);

let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db('syncsphere');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

function getDB() {
  return db;
}

module.exports = { connectDB, getDB };