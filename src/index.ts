import "dotenv/config";
import { initSentry, Sentry } from "./sentry";
initSentry();
import express from "express";
import { bot } from "./bot";
import healthRouter from "./routes/health";
import apiRouter from "./routes/api";
import { getSharedSession } from "./controllers/splitController";
import cors from "cors";
import morgan from "morgan";
import { openapiSpec } from "./openapi";
import { startReminderJob } from "./jobs/reminderJob";

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const NODE_ENV = process.env.NODE_ENV ?? "development";

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: "https://v0-debtmate-app.vercel.app",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: undefined,
    credentials: true, // only if you're using cookies/auth
  }),
);

app.use(morgan("‍dev"));

// OpenAPI spec endpoint
app.get("/openapi.json", (_req, res) => {
  res.json(openapiSpec);
});

// Mount routes
app.use("/", healthRouter);
app.use("/api", apiRouter);
// Public share route — no auth required
app.get("/api/splits/share/:token", getSharedSession);

// Sentry error handler — must be after all routes
Sentry.setupExpressErrorHandler(app);

async function main(): Promise<void> {
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
    console.log(`Webhook set to: ${WEBHOOK_URL}${webhookPath}`);

    app.listen(PORT, () => {
      console.log(
        `DebtMate server running on port ${PORT} (production / webhook mode)`,
      );
    });
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
  console.log(`Reminder job scheduled (cron: ${process.env.REMINDER_CRON ?? '*/5 * * * *'})`);
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
