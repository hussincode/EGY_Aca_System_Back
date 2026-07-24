import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { config as loadEnv } from 'dotenv';
import { routes as apiRoutes } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import landingSettingsRouter from './routes/landingSettings.js';

loadEnv();

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(morgan('dev'));

// Landing settings route is mounted BEFORE the rate limiter so polling never gets throttled
app.use('/api/landing-settings', landingSettingsRouter);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

app.use(errorHandler);

if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT || 5000);
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

export default app;


