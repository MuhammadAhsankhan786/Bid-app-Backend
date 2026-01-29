import pool from '../config/db.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runInitScript() {
  try {
    console.log('📄 Reading SQL initialization script...\n');
    
    const sqlPath = path.join(__dirname, '../../db/init_bidmaster.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('🚀 Executing SQL script...\n');
    
    const result = await pool.query(sqlScript);
    
    console.log('✅ SQL script executed successfully!\n');
    console.log('Check the NOTICE messages above for table creation status.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error executing SQL script:', error.message);
    console.error('   Error details:', error);
    process.exit(1);
  }
}

runInitScript();

