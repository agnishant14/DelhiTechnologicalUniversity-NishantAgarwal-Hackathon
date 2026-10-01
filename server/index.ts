import { RiskEngine } from './engine';
import { Store } from './store';
import { RiskService } from './service';
import { createApp } from './app';

const store = new Store();
const service = new RiskService(new RiskEngine(), store);
const app = createApp(service);
const port = Number(process.env.PORT ?? 3001);
const server = app.listen(port, process.env.HOST ?? '127.0.0.1', () => console.log(`SignalDesk: http://127.0.0.1:${port}`));
void service.initialize().then(() => console.log('Risk engine ready:', service.engine.info.model)).catch(error => { console.error('Startup failed:', error); process.exit(1); });
const timer = setInterval(() => {
  if (service.ready && service.mode === 'live' && !service.busy) void service.refresh().catch(error => console.error('Feed refresh:', error.message));
}, 5 * 60_000);
function stop() { clearInterval(timer); server.close(() => { store.close(); process.exit(0); }); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
