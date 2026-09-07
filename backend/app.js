const express = require('express');
const cors = require('cors');
const path = require('path');
const speechRoutes = require('./routes/speech');
const settingsRoutes = require('./routes/settings');
const { errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const host = req.headers.host || '';
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) return res.status(403).json({ error: 'Local requests only.' });
    const origin = req.headers.origin;
    if (origin && origin !== `http://${host}` && !(process.env.NODE_ENV !== 'production' && origin === 'http://localhost:3000')) return res.status(403).json({ error: 'Untrusted origin.' });
    next();
  });
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (req, res) => res.json({ ok: true, service: 'orbitvoice-api', app: 'Orbitvoice' }));
  app.use('/api/speech', speechRoutes);
  app.use('/api/settings', settingsRoutes);

  const staticDir = path.join(__dirname, '..', 'frontend', 'out');
  app.use(express.static(staticDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(staticDir, 'index.html'), (error) => error && next(error));
  });

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
