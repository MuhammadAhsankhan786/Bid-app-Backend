/**
 * Verify Twilio Configuration Script
 * 
 * This script checks if all required Twilio environment variables are set
 * and validates their format.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from project root
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

console.log('\n🔍 Twilio Configuration Verification\n');
console.log('='.repeat(50));

// Check if .env file exists
if (!existsSync(envPath)) {
  console.error('❌ .env file not found at:', envPath);
  console.error('   Please create a .env file in the project root.');
  process.exit(1);
} else {
  console.log('✅ .env file found at:', envPath);
}

// Required environment variables
const requiredVars = {
  'TWILIO_ACCOUNT_SID': {
    required: true,
    format: /^AC[a-f0-9]{32}$/i,
    description: 'Twilio Account SID (starts with AC)'
  },
  'TWILIO_AUTH_TOKEN': {
    required: true,
    format: /^[a-f0-9]{32}$/i,
    description: 'Twilio Auth Token (32 characters)'
  },
  'TWILIO_VERIFY_SID': {
    required: true,
    format: /^VA[a-f0-9]{32}$/i,
    description: 'Twilio Verify Service SID (starts with VA)'
  }
};

let allValid = true;
const results = {};

// Check each variable
for (const [varName, config] of Object.entries(requiredVars)) {
  const value = process.env[varName];
  const isSet = !!value;
  const isEmpty = isSet && value.trim() === '';
  
  console.log(`\n📋 ${varName}:`);
  console.log(`   Description: ${config.description}`);
  
  if (!isSet || isEmpty) {
    console.error(`   ❌ NOT SET or EMPTY`);
    if (config.required) {
      allValid = false;
      results[varName] = { status: 'missing', valid: false };
    }
  } else {
    // Check format
    const matchesFormat = config.format.test(value);
    if (matchesFormat) {
      console.log(`   ✅ SET and VALID`);
      console.log(`   Value: ${varName === 'TWILIO_AUTH_TOKEN' ? '[HIDDEN]' : value}`);
      results[varName] = { status: 'valid', valid: true, value: varName === 'TWILIO_AUTH_TOKEN' ? '[HIDDEN]' : value };
    } else {
      console.error(`   ⚠️  SET but INVALID FORMAT`);
      console.error(`   Expected format: ${config.format}`);
      console.error(`   Current value: ${value.substring(0, 10)}...`);
      allValid = false;
      results[varName] = { status: 'invalid_format', valid: false, value: value.substring(0, 10) + '...' };
    }
  }
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('\n📊 Summary:\n');

if (allValid) {
  console.log('✅ All Twilio environment variables are correctly configured!');
  console.log('\n✅ Configuration Details:');
  console.log(`   Account SID: ${process.env.TWILIO_ACCOUNT_SID}`);
  console.log(`   Verify SID: ${process.env.TWILIO_VERIFY_SID}`);
  console.log(`   Auth Token: [HIDDEN]`);
  console.log('\n✅ You can now use Twilio Verify API.');
  process.exit(0);
} else {
  console.error('❌ Some Twilio environment variables are missing or invalid!');
  console.error('\n❌ Issues found:');
  for (const [varName, result] of Object.entries(results)) {
    if (!result.valid) {
      console.error(`   - ${varName}: ${result.status}`);
    }
  }
  console.error('\n📝 Next Steps:');
  console.error('   1. Open your .env file');
  console.error('   2. Add or fix the missing/invalid variables');
  console.error('   3. Get values from: https://console.twilio.com/');
  console.error('   4. Restart your backend server');
  process.exit(1);
}

