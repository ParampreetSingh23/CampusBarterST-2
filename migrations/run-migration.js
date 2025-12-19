import { pool } from '../server/db.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sql = fs.readFileSync(join(__dirname, 'add_file_upload.sql'), 'utf8');

pool.query(sql)
  .then(() => {
    console.log('✅ Migration applied successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
