/**
 * Check .env file and show what's missing
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

console.log('\n🔍 Checking .env file...\n');

const envPath = path.join(__dirname, '.env');
const requiredVars = {
  'DATABASE_URL': 'PostgreSQL connection string (e.g., postgresql://user:pass@host:port/db)',
  'ADMIN_PHONE': 'Superadmin phone number (e.g., +9647500914000)',
  'ADMIN_PASSWORD': 'Superadmin password (e.g., admin123)',
  'BASE_URL': 'API base URL (e.g., http://localhost:5000/api)'
};

console.log('📋 Required Environment Variables:\n');

let allSet = true;
for (const [varName, description] of Object.entries(requiredVars)) {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: Set`);
    if (varName === 'DATABASE_URL') {
      // Show first and last few chars for security
      const masked = value.length > 20 
        ? `${value.substring(0, 10)}...${value.substring(value.length - 10)}`
        : '***';
      console.log(`   Value: ${masked}`);
    } else {
      console.log(`   Value: ${value}`);
    }
  } else {
    console.log(`❌ ${varName}: NOT SET`);
    console.log(`   Description: ${description}`);
    allSet = false;
  }
}

if (!allSet) {
  console.log('\n⚠️  Missing environment variables!');
  console.log('\n📝 To fix:');
  console.log('   1. Create or update .env file in "Bid app Backend" directory');
  console.log('   2. Add missing variables');
  console.log('\n💡 Example .env file:');
  console.log('   DATABASE_URL=postgresql://user:password@host:port/database');
  console.log('   ADMIN_PHONE=+9647500914000');
  console.log('   ADMIN_PASSWORD=admin123');
  console.log('   BASE_URL=http://localhost:5000/api');
} else {
  console.log('\n✅ All required environment variables are set!');
}

if (fs.existsSync(envPath)) {
  console.log(`\n📄 .env file exists at: ${envPath}`);
} else {
  console.log(`\n❌ .env file NOT FOUND at: ${envPath}`);
  console.log('   Please create .env file with required variables');
}

console.log('');

