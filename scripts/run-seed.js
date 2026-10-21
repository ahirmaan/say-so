// Runs seed.js through Electron's bundled Node runtime (not the system Node),
// since better-sqlite3's native binary is compiled against Electron's ABI.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const electronPath = require('electron');

const result = spawnSync(electronPath, [path.join(__dirname, 'seed.js')], {
  stdio: 'inherit',
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
});

process.exit(result.status ?? 1);
