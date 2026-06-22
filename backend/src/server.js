'use strict';

require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/database');
const { initComplianceJob } = require('./jobs/complianceJob');
const config = require('./config');

async function main() {
  await connectDB();
  await initComplianceJob();
  app.listen(config.port, () => {
    console.log(`[Server] Escuchando en puerto ${config.port} (${config.nodeEnv})`);
  });
}

main().catch((err) => {
  console.error('[Server] Error fatal:', err.message);
  process.exit(1);
});
