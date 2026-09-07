require('dotenv').config();
const http = require('http');
const { createApp } = require('./app');

function startServer(port = Number(process.env.PORT) || 3847) {
  const server = http.createServer(createApp());
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer().then((server) => {
    console.log(`Orbitvoice API listening on http://127.0.0.1:${server.address().port}`);
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { startServer };
