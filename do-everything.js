/**
 * Complete Setup Script - Sab Kuch Ek Saath
 * This script will:
 * 1. Create/update .env file with all required variables
 * 2. Update phone numbers in database (if DATABASE_URL is set)
 * 3. Verify everything is working
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load existing .env if exists
dotenv.config();

const envPath = path.join(__dirname, '.env');

console.log('\n🚀 Complete Setup - Sab Kuch Ek Saath\n');
console.log('='.repeat(60));

// Step 1: Create/Update .env file
console.log('\n📝 Step 1: Creating/Updating .env file...\n');

let envContent = '';

// Read existing .env if exists
if (fs.existsSync(envPath)) {
  const existing = fs.readFileSync(envPath, 'utf8');
  envContent = existing;
  console.log('✅ Found existing .env file');
} else {
  console.log('📝 Creating new .env file');
}

// Update or add required variables
const requiredVars = {
  'DATABASE_URL': process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/database',
  'ADMIN_PHONE': process.env.ADMIN_PHONE || '+9647500914000',
  'ADMIN_PASSWORD': process.env.ADMIN_PASSWORD || 'admin123',
  'MODERATOR_PHONE': process.env.MODERATOR_PHONE || '+9647800914000',
  'BASE_URL': process.env.BASE_URL || 'http://localhost:5000/api',
  'JWT_SECRET': process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  'JWT_EXPIRES_IN': process.env.JWT_EXPIRES_IN || '7d',
  'NODE_ENV': process.env.NODE_ENV || 'development'
};

// Build .env content
envContent = `# Database Configuration
# ⚠️ IMPORTANT: Update DATABASE_URL with your actual PostgreSQL connection string
DATABASE_URL=${requiredVars.DATABASE_URL}

# Admin Configuration
ADMIN_PHONE=${requiredVars.ADMIN_PHONE}
ADMIN_PASSWORD=${requiredVars.ADMIN_PASSWORD}
MODERATOR_PHONE=${requiredVars.MODERATOR_PHONE}

# API Configuration
BASE_URL=${requiredVars.BASE_URL}

# JWT Configuration
JWT_SECRET=${requiredVars.JWT_SECRET}
JWT_EXPIRES_IN=${requiredVars.JWT_EXPIRES_IN}

# Node Environment
NODE_ENV=${requiredVars.NODE_ENV}
`;

// Write .env file
fs.writeFileSync(envPath, envContent);

console.log('✅ .env file created/updated!');
console.log(`   Location: ${envPath}`);

// Reload .env
dotenv.config({ path: envPath });

// Step 2: Check DATABASE_URL
console.log('\n' + '='.repeat(60));
console.log('\n🔍 Step 2: Checking DATABASE_URL...\n');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || databaseUrl === 'postgresql://user:password@localhost:5432/database') {
  console.log('⚠️  DATABASE_URL is not set or using default!');
  console.log('\n📝 To fix:');
  console.log('   1. Open .env file');
  console.log('   2. Update DATABASE_URL with your actual PostgreSQL connection string');
  console.log('   3. Format: postgresql://username:password@host:port/database');
  console.log('   4. Then run this script again: node do-everything.js');
  console.log('\n💡 Example:');
  console.log('   DATABASE_URL=postgresql://user:pass@localhost:5432/bidmaster');
  console.log('   Or Neon: DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/db?sslmode=require');

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ .env file setup complete!');
  console.log('⚠️  Please update DATABASE_URL in .env file, then run:');
  console.log('   node do-everything.js');
  console.log('');
  process.exit(0);
}

console.log('✅ DATABASE_URL is set');
console.log(`   ${databaseUrl.substring(0, 30)}...`);

// Step 3: Update phone numbers in database
console.log('\n' + '='.repeat(60));
console.log('\n📱 Step 3: Updating phone numbers in database...\n');

try {
  // Import after .env is loaded
  const { default: pool } = await import('./src/config/db.js');
  const { normalizeIraqPhone } = await import('./src/utils/phoneUtils.js');

  const targetPhones = {
    superadmin: '+9647500914000',
    moderator: '+9647800914000'
  };

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
    const sa = superadminResult.rows[0];
    console.log(`   ✅ Updated Superadmin (ID: ${sa.id}):`);
    console.log(`      Name: ${sa.name}`);
    console.log(`      Phone: ${sa.phone}\n`);
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
    const mod = moderatorResult.rows[0];
    console.log(`   ✅ Updated Moderator (ID: ${mod.id}):`);
    console.log(`      Name: ${mod.name}`);
    console.log(`      Phone: ${mod.phone}\n`);
  } else {
    console.log('   ⚠️  No Moderator found to update\n');
  }

  // Verify
  console.log('='.repeat(60));
  console.log('\n✅ VERIFICATION:\n');

  const verifySA = await pool.query(
    `SELECT id, name, phone, role FROM users WHERE role IN ('superadmin', 'admin') ORDER BY id ASC LIMIT 1`
  );

  if (verifySA.rows.length > 0) {
    const sa = verifySA.rows[0];
    console.log('✅ Superadmin:');
    console.log(`   Phone: ${sa.phone}`);
    console.log(`   Expected: ${normalizedSuperadmin}`);
    console.log(`   Match: ${sa.phone === normalizedSuperadmin ? '✅ YES' : '❌ NO'}\n`);
  }

  const verifyMod = await pool.query(
    `SELECT id, name, phone, role FROM users WHERE role = 'moderator' ORDER BY id ASC LIMIT 1`
  );

  if (verifyMod.rows.length > 0) {
    const mod = verifyMod.rows[0];
    console.log('✅ Moderator:');
    console.log(`   Phone: ${mod.phone}`);
    console.log(`   Expected: ${normalizedModerator}`);
    console.log(`   Match: ${mod.phone === normalizedModerator ? '✅ YES' : '❌ NO'}\n`);
  }

  await pool.end();

  console.log('='.repeat(60));
  console.log('\n✅ All phone numbers updated successfully!');

} catch (error) {
  console.error('\n❌ Error updating phone numbers:');
  console.error(`   ${error.message}`);
  console.error('\n💡 This might be because:');
  console.error('   1. DATABASE_URL is incorrect');
  console.error('   2. Database server is not running');
  console.error('   3. Network/firewall issue');
  console.error('\n📝 Please check DATABASE_URL in .env file');
}

// Final summary
console.log('\n' + '='.repeat(60));
console.log('\n📋 SETUP SUMMARY:\n');
console.log('✅ .env file: Created/Updated');
console.log(`   Location: ${envPath}`);
console.log('\n📝 Next Steps:');
console.log('   1. Verify DATABASE_URL in .env file is correct');
console.log('   2. If phone numbers were updated: ✅ Done!');
console.log('   3. If not: Update DATABASE_URL and run again');
console.log('   4. Test: node test-admin-phone-protection.js');
console.log('\n' + '='.repeat(60));
console.log('');

