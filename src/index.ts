import "dotenv/config";
import { initSentry, Sentry } from "./sentry";
initSentry();
import express from "express";
import { bot } from "./bot";
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import apiRouter from "./routes/api";
import { getSharedSession } from "./controllers/splitController";
import contactInvitesRouter from "./routes/contactInvites";
import groupsRouter from "./routes/groups";
import cors from "cors";
import morgan from "morgan";
import { openapiSpec } from "./openapi";
import { startReminderJob } from "./jobs/reminderJob";
import { startRecurringJob } from "./jobs/recurringJob";
import { ensureSystemCategories } from "./services/expenseCategoryService";

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const NODE_ENV = process.env.NODE_ENV ?? "development";

const allowedOrigins = [
  ...(process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  "http://localhost:3001",
];

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: undefined,
    credentials: true,
  }),
);

app.use(morgan("‍dev"));

// OpenAPI spec endpoint
app.get("/openapi.json", (_req, res) => {
  res.json(openapiSpec);
});

// Mount routes
app.use("/", healthRouter);
app.use("/api/auth", authRouter); // public — no requireAuth
// Public share route must be before /api (which applies requireAuth to all /api/*)
app.get("/api/splits/share/:token", getSharedSession);
// Contact invites: has both public (GET /:token) and authenticated routes; mount before /api
app.use("/api/contact-invites", contactInvitesRouter);
// Groups: has public invite routes; mount before /api which applies requireAuth
app.use("/api/groups", groupsRouter);
app.use("/api", apiRouter);

// Sentry error handler — must be after all routes
Sentry.setupExpressErrorHandler(app);

async function main(): Promise<void> {
  await ensureSystemCategories();
  // @scalar/express-api-reference is ESM-only; skip in production where the
  // bundler (esbuild) converts import() to require() and breaks on ESM packages.
  if (NODE_ENV !== "production") {
    const { apiReference } = await import("@scalar/express-api-reference");
    app.use(
      "/docs",
      apiReference({
        spec: { url: "/openapi.json" },
        theme: "saturn",
      }),
    );
  }

  if (NODE_ENV === "production") {
    const WEBHOOK_URL = process.env.WEBHOOK_URL;
    if (!WEBHOOK_URL) {
      throw new Error(
        "WEBHOOK_URL environment variable is required in production.",
      );
    }

    const webhookPath = `/telegraf/${bot.secretPathComponent()}`;
    app.use(bot.webhookCallback(webhookPath));

    await bot.telegram.setWebhook(`${WEBHOOK_URL}${webhookPath}`);

    app.listen(PORT, () => {
      console.log(
        `DebtMate server running on port ${PORT} (production / webhook mode)`,
      );
    });
    startReminderJob();

    startRecurringJob();
  } else {
    // Development: use long polling
    bot.launch().then(() => {
      console.log("DebtMate bot started (development / polling mode)");
    });

    app.listen(PORT, () => {
      console.log(`Express server running on port ${PORT}`);
    });
  }

  startReminderJob();

  startRecurringJob();
}

main().catch((err) => {
  Sentry.captureException(err);
  console.error("Failed to start DebtMate:", err);
  process.exit(1);
});

// Graceful shutdown
process.once("SIGINT", () => {
  console.log("Received SIGINT, shutting down...");
  bot.stop("SIGINT");
  process.exit(0);
});

process.once("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down...");
  bot.stop("SIGTERM");
  process.exit(0);
});
