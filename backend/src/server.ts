import app from './app.js';
import { config } from './config/index.js';

app.listen(config.port, () => {
  console.log(`[Server] StudyStreak API listening on port ${config.port} in ${config.nodeEnv} mode`);
});
