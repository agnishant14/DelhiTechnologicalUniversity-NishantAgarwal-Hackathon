import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { RiskEngine } from '../server/engine';
import { Store } from '../server/store';
import { RiskService } from '../server/service';
import { createApp } from '../server/app';

let store: Store, service: RiskService;
beforeEach(async () => {
  store = new Store(':memory:');
  const engine = new RiskEngine(async () => [{ label: 'positive', score: 0.7 }, { label: 'negative', score: 0.1 }, { label: 'neutral', score: 0.2 }]);
  service = new RiskService(engine, store, [
    { name: 'News test', kind: 'news', fetch: async () => [{ text: 'Apple announces a record profit today.', sourceKind: 'news', sourceName: 'News test', publishedAt: new Date().toISOString() }] },
    { name: 'Social test', kind: 'social', fetch: async () => { throw new Error('Offline'); } },
  ]);
  await service.initialize();
});
afterEach(() => store.close());

describe('pipeline API', () => {
  it('seeds both source types and deduplicates without another rebalance', async () => {
    const before = service.dashboard();
    expect(new Set(before.signals.map(s => s.sourceKind))).toEqual(new Set(['news', 'social']));
    const result = await request(createApp(service)).post('/api/analyze').send({ text: before.signals[0].text }).expect(200);
    expect(result.body.added).toBe(0);
    expect(service.dashboard().history.length).toBe(before.history.length);
  });
  it('isolates live data, reports partial source failures, and throttles refresh', async () => {
    const app = createApp(service);
    await request(app).post('/api/mode').send({ mode: 'live' }).expect(200);
    expect(service.dashboard().signals).toHaveLength(0);
    const response = await request(app).post('/api/refresh').expect(200);
    expect(response.body.added).toBe(1);
    expect(response.body.sources[1]).toMatchObject({ status: 'error', error: 'Offline' });
    expect(service.dashboard().signals.every(s => s.mode === 'live' && !s.isSample)).toBe(true);
    await request(app).post('/api/refresh').expect(429);
    await request(app).post('/api/mode').send({ mode: 'demo' }).expect(200);
    expect(service.dashboard().signals).toHaveLength(12);
  });
  it('rejects invalid payloads and exports machine-readable signals', async () => {
    const app = createApp(service);
    await request(app).post('/api/analyze').send({ text: 'hi' }).expect(400);
    await request(app).post('/api/mode').send({ mode: 'fake' }).expect(400);
    await request(app).get('/api/missing').expect(404);
    const result = await request(app).get('/api/export').expect(200);
    expect(result.headers['content-disposition']).toContain('attachment');
    expect(result.body.signals).toHaveLength(12);
  });
  it('finishes replay without repeating scenarios', async () => {
    for (let i = 0; i < 6; i++) await service.replay();
    expect(service.dashboard().signals).toHaveLength(24);
    await expect(service.replay()).rejects.toThrow('All demo scenarios');
  });
  it('retains replay position across service restarts', async () => {
    await service.replay();
    const second = new RiskService(service.engine, store);
    await second.initialize();
    expect(second.dashboard().signals).toHaveLength(14);
    expect(second.dashboard().replay.position).toBe(14);
  });
});
