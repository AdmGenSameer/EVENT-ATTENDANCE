"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const mongodb_1 = require("./db/mongodb");
async function startServer() {
    try {
        // Connect to MongoDB
        await (0, mongodb_1.connectDB)();
        // Start Express server
        app_1.app.listen(env_1.env.port, () => {
            console.log(`EventQR backend listening on port ${env_1.env.port}`);
        });
    }
    catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}
startServer();
