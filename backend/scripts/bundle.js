// Builds the deployment zip for Azure App Service (zip deploy) and AWS Elastic
// Beanstalk (application version upload): ../dist/skybridge-portal.zip
//
// Build the front end first (npm run build in ../frontend). The zip holds the
// app at its root (package.json, src/, public/) without node_modules; both
// platforms run "npm install" and then "npm start".
//
// A Node library writes the zip because Windows "Compress-Archive" stores paths
// with backslashes, which Linux hosts cannot unpack into folders.
const fs = require('node:fs');
const path = require('node:path');
const archiver = require('archiver');

const root = path.resolve(__dirname, '..');
const outDir = path.resolve(root, '../dist');
const outFile = path.join(outDir, 'skybridge-portal.zip');

if (!fs.existsSync(path.join(root, 'public', 'index.html'))) {
  console.error('public/index.html is missing. Run "npm run build" in the frontend folder first.');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const output = fs.createWriteStream(outFile);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`Created ${outFile} (${(archive.pointer() / 1024).toFixed(0)} kB)`);
});
archive.on('warning', (err) => console.warn(err.message));
archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);
archive.file(path.join(root, 'package.json'), { name: 'package.json' });
archive.file(path.join(root, 'package-lock.json'), { name: 'package-lock.json' });
archive.directory(path.join(root, 'src'), 'src');
archive.directory(path.join(root, 'public'), 'public');
// A3: run once after deployment (Kudu SSH on Azure, tunnel on AWS) to encrypt existing rows.
archive.file(path.join(root, 'scripts', 'encrypt-existing.js'), { name: 'scripts/encrypt-existing.js' });
archive.finalize();
