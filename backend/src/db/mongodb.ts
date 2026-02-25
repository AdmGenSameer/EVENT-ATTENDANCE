import mongoose from 'mongoose';
import { env } from '../config/env';
import { logInfo, logError } from '../utils/logger';

export async function connectDB() {
  try {
    const mongoUri = env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not configured');
    }
    
    logInfo('mongodb:connect', 'Connecting to MongoDB Atlas...');
    
    await mongoose.connect(mongoUri, {
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 10000,
    });
    
    logInfo('mongodb:connect', '✓ MongoDB Atlas connected successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logError('mongodb:error', 'MongoDB connection error', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      logInfo('mongodb:disconnect', 'MongoDB disconnected');
    });
    
    return mongoose.connection;
  } catch (error) {
    logError('mongodb:connect', '✗ MongoDB connection failed', error);
    process.exit(1);
  }
}

export function disconnectDB() {
  logInfo('mongodb:disconnect', 'Disconnecting from MongoDB...');
  return mongoose.disconnect();
}

export default mongoose;
