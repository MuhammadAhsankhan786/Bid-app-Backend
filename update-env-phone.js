/**
 * Update .env file with correct Superadmin phone from database
 */

import pool from './src/config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function updateEnvPhone() {
  try {
    console.log('\n🔍 Getting Superadmin phone from database...\n');
    
    const result = await pool.query(
      `SELECT id, name, phone, role 
       FROM users 
       WHERE role IN ('superadmin', 'admin')
       ORDER BY id ASC
       LIMIT 1`
    );
    
    if (result.rows.length === 0) {
      console.log('❌ No Superadmin found');
      return;
    }
    
    const superadmin = result.rows[0];
    const actualPhone = superadmin.phone;
    
    console.log('✅ Found Superadmin:');
    console.log(`   ID: ${superadmin.id}`);
    console.log(`   Name: ${superadmin.name}`);
    console.log(`   Phone: ${actualPhone}`);
    
    // Read existing .env or create new
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update or add ADMIN_PHONE
    if (envContent.includes('ADMIN_PHONE=')) {
      envContent = envContent.replace(/ADMIN_PHONE=.*/g, `ADMIN_PHONE=${actualPhone}`);
    } else {
      envContent += `\nADMIN_PHONE=${actualPhone}\n`;
    }
    
    // Ensure ADMIN_PASSWORD is set
    if (!envContent.includes('ADMIN_PASSWORD=')) {
      envContent += `ADMIN_PASSWORD=admin123\n`;
    }
    
    // Ensure BASE_URL is set
    if (!envContent.includes('BASE_URL=')) {
      envContent += `BASE_URL=http://localhost:5000/api\n`;
    }
    
    // Write to .env
    fs.writeFileSync(envPath, envContent.trim() + '\n');
    
    console.log('\n✅ .env file updated!');
    console.log(`\n📝 Current .env content:`);
    console.log(`   ADMIN_PHONE=${actualPhone}`);
    console.log(`   ADMIN_PASSWORD=admin123`);
    console.log(`\n💡 Now run: node test-admin-phone-protection.js`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

updateEnvPhone();

