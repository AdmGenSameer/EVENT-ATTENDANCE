"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
exports.disconnectDB = disconnectDB;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
async function connectDB() {
    try {
        const mongoUri = env_1.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI is not configured');
        }
        (0, logger_1.logInfo)('mongodb:connect', 'Connecting to MongoDB Atlas...');
        await mongoose_1.default.connect(mongoUri, {
            retryWrites: true,
            w: 'majority',
            maxPoolSize: 10,
            minPoolSize: 2,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 10000,
        });
        (0, logger_1.logInfo)('mongodb:connect', '✓ MongoDB Atlas connected successfully');
        // Handle connection events
        mongoose_1.default.connection.on('error', (err) => {
            (0, logger_1.logError)('mongodb:error', 'MongoDB connection error', err);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            (0, logger_1.logInfo)('mongodb:disconnect', 'MongoDB disconnected');
        });
        return mongoose_1.default.connection;
    }
    catch (error) {
        (0, logger_1.logError)('mongodb:connect', '✗ MongoDB connection failed', error);
        process.exit(1);
    }
}
function disconnectDB() {
    (0, logger_1.logInfo)('mongodb:disconnect', 'Disconnecting from MongoDB...');
    return mongoose_1.default.disconnect();
}
exports.default = mongoose_1.default;
