import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { RiskEngine } from './engine';
import { documentSchema } from './validation';

const app = express();
const engine = new RiskEngine();
void engine.initialize();
app.use(express.json({ limit: '128kb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'signaldesk', engine: engine.info }));
app.post('/api/analyze', async (req, res) => {
  const parsed = documentSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid document', details: parsed.error.flatten() }); return; }
  if (engine.status === 'loading') { res.status(503).json({ error: 'The sentiment model is loading. Try again shortly.' }); return; }
  res.json(await engine.analyze(parsed.data));
});
if (existsSync('dist/index.html')) {
  app.use(express.static('dist'));
  app.get('/{*path}', (_req, res) => res.sendFile(path.resolve('dist/index.html')));
}
const port = Number(process.env.PORT ?? 3001);
app.listen(port, '127.0.0.1', () => console.log(`SignalDesk API: http://127.0.0.1:${port}`));
