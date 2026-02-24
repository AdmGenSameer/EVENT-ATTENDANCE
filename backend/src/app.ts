import express from "express";
import cors from "cors";
import { apiRouter } from "./routes";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.use("/api", apiRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});
