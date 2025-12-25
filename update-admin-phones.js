/**
 * Update Superadmin and Moderator phone numbers in database
 * Superadmin: +9647500914000
 * Moderator: +9647800914000
 */

import pool from './src/config/db.js';
import { normalizeIraqPhone } from './src/utils/phoneUtils.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function updateAdminPhones() {
  try {
    console.log('\n🔧 Updating Admin Phone Numbers...\n');
    console.log('='.repeat(60));
    
    const targetPhones = {
      superadmin: '+9647500914000',
      moderator: '+9647800914000'
    };
    
    // Normalize phone numbers
    const normalizedSuperadmin = normalizeIraqPhone(targetPhones.superadmin);
    const normalizedModerator = normalizeIraqPhone(targetPhones.moderator);
    
    console.log('📱 Target Phone Numbers:');
    console.log(`   Superadmin: ${targetPhones.superadmin} → ${normalizedSuperadmin}`);
    console.log(`   Moderator: ${targetPhones.moderator} → ${normalizedModerator}\n`);
    
    // Update Superadmin
    console.log('🔐 Updating Superadmin...');
    const superadminResult = await pool.query(
      `UPDATE users 
       SET phone = $1, updated_at = NOW()
       WHERE role IN ('superadmin', 'admin')
       RETURNING id, name, phone, role`,
      [normalizedSuperadmin]
    );
    
    if (superadminResult.rows.length > 0) {
      const superadmin = superadminResult.rows[0];
      console.log(`   ✅ Updated Superadmin (ID: ${superadmin.id}):`);
      console.log(`      Name: ${superadmin.name}`);
      console.log(`      Old Phone: (previous)`);
      console.log(`      New Phone: ${superadmin.phone}`);
      console.log(`      Role: ${superadmin.role}\n`);
    } else {
      console.log('   ⚠️  No Superadmin found to update\n');
    }
    
    // Update Moderator
    console.log('👤 Updating Moderator...');
    const moderatorResult = await pool.query(
      `UPDATE users 
       SET phone = $1, updated_at = NOW()
       WHERE role = 'moderator'
       RETURNING id, name, phone, role`,
      [normalizedModerator]
    );
    
    if (moderatorResult.rows.length > 0) {
      const moderator = moderatorResult.rows[0];
      console.log(`   ✅ Updated Moderator (ID: ${moderator.id}):`);
      console.log(`      Name: ${moderator.name}`);
      console.log(`      Old Phone: (previous)`);
      console.log(`      New Phone: ${moderator.phone}`);
      console.log(`      Role: ${moderator.role}\n`);
    } else {
      console.log('   ⚠️  No Moderator found to update\n');
    }
    
    // Verify updates
    console.log('='.repeat(60));
    console.log('\n✅ VERIFICATION:\n');
    
    const verifySuperadmin = await pool.query(
      `SELECT id, name, phone, role FROM users WHERE role IN ('superadmin', 'admin') ORDER BY id ASC LIMIT 1`
    );
    
    if (verifySuperadmin.rows.length > 0) {
      const sa = verifySuperadmin.rows[0];
      console.log('✅ Superadmin:');
      console.log(`   ID: ${sa.id}`);
      console.log(`   Name: ${sa.name}`);
      console.log(`   Phone: ${sa.phone}`);
      console.log(`   Expected: ${normalizedSuperadmin}`);
      console.log(`   Match: ${sa.phone === normalizedSuperadmin ? '✅ YES' : '❌ NO'}\n`);
    }
    
    const verifyModerator = await pool.query(
      `SELECT id, name, phone, role FROM users WHERE role = 'moderator' ORDER BY id ASC LIMIT 1`
    );
    
    if (verifyModerator.rows.length > 0) {
      const mod = verifyModerator.rows[0];
      console.log('✅ Moderator:');
      console.log(`   ID: ${mod.id}`);
      console.log(`   Name: ${mod.name}`);
      console.log(`   Phone: ${mod.phone}`);
      console.log(`   Expected: ${normalizedModerator}`);
      console.log(`   Match: ${mod.phone === normalizedModerator ? '✅ YES' : '❌ NO'}\n`);
    }
    
    // Update .env file
    console.log('='.repeat(60));
    console.log('\n📝 Updating .env file...\n');
    
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update ADMIN_PHONE
    if (envContent.includes('ADMIN_PHONE=')) {
      envContent = envContent.replace(/ADMIN_PHONE=.*/g, `ADMIN_PHONE=${normalizedSuperadmin}`);
    } else {
      envContent += `ADMIN_PHONE=${normalizedSuperadmin}\n`;
    }
    
    // Add MODERATOR_PHONE
    if (envContent.includes('MODERATOR_PHONE=')) {
      envContent = envContent.replace(/MODERATOR_PHONE=.*/g, `MODERATOR_PHONE=${normalizedModerator}`);
    } else {
      envContent += `MODERATOR_PHONE=${normalizedModerator}\n`;
    }
    
    // Ensure ADMIN_PASSWORD is set
    if (!envContent.includes('ADMIN_PASSWORD=')) {
      envContent += `ADMIN_PASSWORD=admin123\n`;
    }
    
    // Ensure BASE_URL is set
    if (!envContent.includes('BASE_URL=')) {
      envContent += `BASE_URL=http://localhost:5000/api\n`;
    }
    
    fs.writeFileSync(envPath, envContent.trim() + '\n');
    
    console.log('✅ .env file updated!');
    console.log(`\n📋 Current .env settings:`);
    console.log(`   ADMIN_PHONE=${normalizedSuperadmin}`);
    console.log(`   MODERATOR_PHONE=${normalizedModerator}`);
    console.log(`   ADMIN_PASSWORD=admin123`);
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ All phone numbers updated successfully!');
    console.log('\n💡 Now you can:');
    console.log('   1. Login with Superadmin: phone = +9647500914000, role = superadmin');
    console.log('   2. Login with Moderator: phone = +9647800914000, role = moderator');
    console.log('   3. Run test: node test-admin-phone-protection.js\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updateAdminPhones();

