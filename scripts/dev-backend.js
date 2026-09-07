require('dotenv').config();
const axios = require('axios');
const { startServer } = require('../backend/server');

const port = Number(process.env.PORT) || 3847;

function keepProcessAlive() {
  // `concurrently` expects this command to stay alive while the frontend and
  // Electron renderer are running. This also lets dev mode reuse the API from
  // an already-installed Orbitvoice instance instead of failing on EADDRINUSE.
  setInterval(() => {}, 60_000);
}

async function main() {
  try {
    const server = await startServer(port);
    console.log(`Orbitvoice development API listening on http://127.0.0.1:${port}`);
    const shutdown = () => server.close(() => process.exit(0));
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
    return;
  } catch (error) {
    if (error.code !== 'EADDRINUSE') throw error;
    try {
      await axios.get(`http://127.0.0.1:${port}/api/health`, { timeout: 2500 });
      console.warn(`Port ${port} is already serving Orbitvoice; reusing that API in development.`);
      keepProcessAlive();
    } catch {
      throw error;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
