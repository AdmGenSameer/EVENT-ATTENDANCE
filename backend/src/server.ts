import { app } from "./app";
import { env } from "./config/env";

app.listen(env.port, () => {
  console.log(`EventQR backend listening on port ${env.port}`);
});
