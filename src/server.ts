import app from "./app.js";
import { env } from "./config/index.js";

const server = app.listen(env.port, () => {
  console.log(
    `Server running on http://localhost:${env.port}`,
  );

  console.log(`Environment: ${env.nodeEnv}`);
});

export default server;