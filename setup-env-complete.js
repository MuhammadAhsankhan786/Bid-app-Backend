/**
 * Complete .env file setup
 * This script will create/update .env file with all required variables
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupEnv() {
  console.log('\n🔧 Complete .env File Setup\n');
  console.log('='.repeat(60));
  console.log('This script will help you create/update .env file\n');
  
  const envPath = path.join(__dirname, '.env');
  let existingEnv = {};
  
  // Read existing .env if exists
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        existingEnv[match[1].trim()] = match[2].trim();
      }
    });
    console.log('✅ Found existing .env file');
  } else {
    console.log('📝 Creating new .env file');
  }
  
  console.log('\n📋 Required Variables:\n');
  
  // DATABASE_URL
  let databaseUrl = existingEnv.DATABASE_URL || '';
  if (!databaseUrl) {
    console.log('💡 DATABASE_URL: PostgreSQL connection string');
    console.log('   Example: postgresql://user:password@localhost:5432/database');
    console.log('   Or Neon: postgresql://user:pass@ep-xxx.region.aws.neon.tech/db?sslmode=require\n');
    databaseUrl = await question('Enter DATABASE_URL (or press Enter to skip): ');
  } else {
    console.log(`✅ DATABASE_URL: Already set (${databaseUrl.substring(0, 20)}...)`);
    const update = await question('Update DATABASE_URL? (y/n, default: n): ');
    if (update.toLowerCase() === 'y') {
      databaseUrl = await question('Enter new DATABASE_URL: ');
    }
  }
  
  // ADMIN_PHONE
  let adminPhone = existingEnv.ADMIN_PHONE || '+9647500914000';
  console.log(`\n📱 ADMIN_PHONE: ${adminPhone}`);
  const updatePhone = await question('Update ADMIN_PHONE? (y/n, default: n): ');
  if (updatePhone.toLowerCase() === 'y') {
    adminPhone = await question('Enter ADMIN_PHONE (default: +9647500914000): ') || '+9647500914000';
  }
  
  // ADMIN_PASSWORD
  let adminPassword = existingEnv.ADMIN_PASSWORD || 'admin123';
  console.log(`\n🔐 ADMIN_PASSWORD: ${adminPassword}`);
  const updatePass = await question('Update ADMIN_PASSWORD? (y/n, default: n): ');
  if (updatePass.toLowerCase() === 'y') {
    adminPassword = await question('Enter ADMIN_PASSWORD (default: admin123): ') || 'admin123';
  }
  
  // BASE_URL
  let baseUrl = existingEnv.BASE_URL || 'http://localhost:5000/api';
  console.log(`\n🌐 BASE_URL: ${baseUrl}`);
  const updateUrl = await question('Update BASE_URL? (y/n, default: n): ');
  if (updateUrl.toLowerCase() === 'y') {
    baseUrl = await question('Enter BASE_URL (default: http://localhost:5000/api): ') || 'http://localhost:5000/api';
  }
  
  // Build .env content
  let envContent = `# Database Configuration
DATABASE_URL=${databaseUrl || 'postgresql://user:password@localhost:5432/database'}

# Admin Configuration
ADMIN_PHONE=${adminPhone}
ADMIN_PASSWORD=${adminPassword}
MODERATOR_PHONE=+9647800914000

# API Configuration
BASE_URL=${baseUrl}

# JWT Configuration (optional)
JWT_SECRET=${existingEnv.JWT_SECRET || 'your-secret-key-change-in-production'}
JWT_EXPIRES_IN=${existingEnv.JWT_EXPIRES_IN || '7d'}

# Node Environment
NODE_ENV=${existingEnv.NODE_ENV || 'development'}
`;
  
  // Write .env file
  fs.writeFileSync(envPath, envContent);
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ .env file created/updated successfully!');
  console.log(`\n📄 Location: ${envPath}`);
  
  if (!databaseUrl) {
    console.log('\n⚠️  WARNING: DATABASE_URL is not set!');
    console.log('   Please update .env file with your actual DATABASE_URL');
    console.log('   Then run: node update-admin-phones.js');
  } else {
    console.log('\n💡 Next steps:');
    console.log('   1. Verify DATABASE_URL is correct');
    console.log('   2. Run: node update-admin-phones.js');
    console.log('   3. Run: node test-admin-phone-protection.js');
  }
  
  console.log('');
  rl.close();
}

setupEnv().catch(console.error);

