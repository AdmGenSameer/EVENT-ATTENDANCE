import { app } from "./app";
import { env } from "./config/env";
import { connectDB } from "./db/mongodb";

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start Express server
    app.listen(env.port, () => {
      console.log(`EventQR backend listening on port ${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
