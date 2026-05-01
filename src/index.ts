import 'dotenv/config';
import express from 'express';
import { bot } from './bot';
import healthRouter from './routes/health';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const NODE_ENV = process.env.NODE_ENV ?? 'development';

const app = express();
app.use(express.json());

// Mount routes
app.use('/', healthRouter);

async function main(): Promise<void> {
  if (NODE_ENV === 'production') {
    const WEBHOOK_URL = process.env.WEBHOOK_URL;
    if (!WEBHOOK_URL) {
      throw new Error('WEBHOOK_URL environment variable is required in production.');
    }

    const webhookPath = `/telegraf/${bot.secretPathComponent()}`;
    app.use(bot.webhookCallback(webhookPath));

    await bot.telegram.setWebhook(`${WEBHOOK_URL}${webhookPath}`);
    console.log(`Webhook set to: ${WEBHOOK_URL}${webhookPath}`);

    app.listen(PORT, () => {
      console.log(`DebtMate server running on port ${PORT} (production / webhook mode)`);
    });
  } else {
    // Development: use long polling
    bot.launch().then(() => {
      console.log('DebtMate bot started (development / polling mode)');
    });

    app.listen(PORT, () => {
      console.log(`Express server running on port ${PORT}`);
    });
  }
}

main().catch((err) => {
  console.error('Failed to start DebtMate:', err);
  process.exit(1);
});

// Graceful shutdown
process.once('SIGINT', () => {
  console.log('Received SIGINT, shutting down...');
  bot.stop('SIGINT');
  process.exit(0);
});

process.once('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...');
  bot.stop('SIGTERM');
  process.exit(0);
});
