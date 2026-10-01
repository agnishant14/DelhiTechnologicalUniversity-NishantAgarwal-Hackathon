import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { RiskService, ServiceError } from './service';
import { documentSchema } from './validation';

export function createApp(service: RiskService) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '128kb' }));
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.get('/api/health', (_req, res) => res.json({ status: service.ready ? 'ok' : 'starting', engine: service.engine.info }));
  app.get('/api/dashboard', (_req, res) => res.json(service.dashboard()));
  app.get('/api/signals', (_req, res) => res.json(service.dashboard().signals));
  app.get('/api/export', (_req, res) => res.attachment(`signaldesk-${service.mode}.json`).json({ exportedAt: new Date().toISOString(), ...service.dashboard() }));
  app.post('/api/analyze', async (req, res) => {
    const doc = documentSchema.parse(req.body), signals = await service.analyze(doc);
    res.json({ added: signals.length, signals });
  });
  app.post('/api/replay', async (_req, res) => res.json({ added: (await service.replay()).length }));
  app.post('/api/refresh', async (_req, res) => res.json({ added: (await service.refresh()).length, sources: service.dashboard().sources }));
  app.post('/api/mode', async (req, res) => {
    const { mode } = z.object({ mode: z.enum(['demo', 'live']) }).parse(req.body);
    await service.setMode(mode); res.json({ mode });
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown API endpoint' }));
  if (existsSync('dist/index.html')) {
    app.use(express.static('dist'));
    app.get('/{*path}', (_req, res) => res.sendFile(path.resolve('dist/index.html')));
  }
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof z.ZodError) { res.status(400).json({ error: 'Invalid input', details: error.flatten() }); return; }
    if (error instanceof ServiceError) { res.status(error.status).json({ error: error.message }); return; }
    if (error instanceof SyntaxError) { res.status(400).json({ error: 'Malformed JSON' }); return; }
    if (error && typeof error === 'object' && 'status' in error && error.status === 413) { res.status(413).json({ error: 'Request is too large' }); return; }
    console.error(error); res.status(500).json({ error: 'The update failed. Please try again.' });
  });
  return app;
}
