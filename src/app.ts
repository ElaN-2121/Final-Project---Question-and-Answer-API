import express from "express";
import cors from "cors";
import helmet from "helmet";

import { env } from "./config/index.js";
import routes from "./routes/index.js";
import { notFoundMiddleware } from "./middleware/not-found.middleware.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

const app = express();

// --------------------------------------------------
// Security
// --------------------------------------------------

app.use(helmet());

app.use(
  cors({
    origin: env.corsOrigin,
  }),
);

// --------------------------------------------------
// Request parsing
// --------------------------------------------------

app.use(express.json({ limit: "1mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  }),
);

// --------------------------------------------------
// API routes
// --------------------------------------------------

app.use(env.apiPrefix, routes);

// --------------------------------------------------
// 404
// --------------------------------------------------

app.use(notFoundMiddleware);

// --------------------------------------------------
// Global error handler
// --------------------------------------------------

app.use(errorMiddleware);

export default app;

