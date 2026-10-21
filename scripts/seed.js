require('dotenv').config({ override: true });
const { initDb, listFolders, createFolder } = require('../electron/db');

const STARTER_FOLDERS = ['Ideas', 'Decisions', 'Random'];

initDb();

for (const name of STARTER_FOLDERS) {
  createFolder(name);
}

console.log('Seeded folders:');
for (const folder of listFolders()) {
  console.log(`  - [${folder.id}] ${folder.name}`);
}
