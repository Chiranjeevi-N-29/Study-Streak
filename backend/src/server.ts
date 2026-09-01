import app from './app.js';
import { config } from './config/index.js';
import { validateEnv } from './config/env.js';

// Validate environment variables on startup
validateEnv();

app.listen(config.port, () => {
  console.log(`[Server] StudyStreak API listening on port ${config.port} in ${config.nodeEnv} mode`);
});

