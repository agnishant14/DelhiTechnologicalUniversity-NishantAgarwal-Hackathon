import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';

const app = express();
app.use(express.json({ limit: '128kb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'signaldesk' }));
if (existsSync('dist/index.html')) {
  app.use(express.static('dist'));
  app.get('/{*path}', (_req, res) => res.sendFile(path.resolve('dist/index.html')));
}
const port = Number(process.env.PORT ?? 3001);
app.listen(port, '127.0.0.1', () => console.log(`SignalDesk API: http://127.0.0.1:${port}`));
