import "dotenv/config";

const requiredEnv = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",

  port: Number(process.env.PORT ?? 5000),

  apiPrefix: process.env.API_PREFIX ?? "/api/v1",

  corsOrigin: requiredEnv("CORS_ORIGIN"),
};

