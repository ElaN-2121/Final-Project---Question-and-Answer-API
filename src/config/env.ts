import "dotenv/config";

const port = Number(process.env.PORT ?? 5000);

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error("PORT must be a valid port number.");
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",

  port,

  apiPrefix: process.env.API_PREFIX ?? "/api/v1",

  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
};
