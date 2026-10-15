// Local development only: read backend/.env when the file exists. In the cloud
// there is no .env file and the platform provides the variables. Variables that
// are already set are not overwritten.
const fs = require('node:fs');
const path = require('node:path');

const envFile = path.resolve(__dirname, '../.env');

if (fs.existsSync(envFile) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envFile);
}
