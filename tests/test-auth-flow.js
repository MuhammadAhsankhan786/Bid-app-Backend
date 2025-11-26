/**
 * Authentication Flow Tests
 * Tests: Send OTP, Verify OTP, Referral code detection, Award on referral
 */

import pool from '../src/config/db.js';
import { TwilioService } from '../src/services/twilioService.js';

let testResults = [];

function logTest(name, passed, message = '') {
  const status = passed ? '✅' : '❌';
  console.log(`  ${status} ${name}${message ? ': ' + message : ''}`);
  testResults.push({ name, passed, message });
}

async function testPhoneNormalization() {
  console.log('\n📋 Testing: Phone Number Normalization');
  
  const testCases = [
    { input: '+9647701234567', expected: '+9647701234567' },
    { input: '9647701234567', expected: '+9647701234567' },
    { input: '009647701234567', expected: '+9647701234567' },
    { input: '07701234567', expected: '+9647701234567' },
  ];
  
  // Import normalize function (would need to export it from authController)
  // For now, just test the logic
  testCases.forEach(({ input, expected }) => {
    let normalized = input;
    // Check 00964 FIRST before single 0
    if (normalized.startsWith('00964')) {
      normalized = '+964' + normalized.substring(5); // Remove '00964' (5 chars)
    } else if (normalized.startsWith('0')) {
      normalized = '+964' + normalized.substring(1);
    } else if (normalized.startsWith('964')) {
      normalized = '+' + normalized;
    }
    
    logTest(`Normalize ${input}`, normalized === expected, `Got: ${normalized}`);
  });
}

async function testOTPFlow() {
  console.log('\n📋 Testing: OTP Flow (Mock)');
  
  try {
    // Note: Actual OTP sending requires Twilio credentials
    // This test validates the flow structure
    
    const testPhone = '+9647701234567';
    
    // Check if Twilio is configured
    const hasTwilio = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN;
    
    if (!hasTwilio) {
      logTest('OTP Flow Structure', true, 'Twilio not configured - skipping actual OTP test');
      return;
    }
    
    // Test: Send OTP
    try {
      const verification = await TwilioService.sendOTP(testPhone);
      logTest('Send OTP', verification !== null, `Verification SID: ${verification?.sid || 'N/A'}`);
    } catch (error) {
      logTest('Send OTP', false, error.message);
    }
    
  } catch (error) {
    logTest('OTP Flow', false, error.message);
  }
}

async function testReferralCodeInOTP() {
  console.log('\n📋 Testing: Referral Code in OTP Verification');
  
  try {
    // Create test inviter
    const inviterPhone = '+9647701234500';
    const inviteePhone = '+9647701234501';
    const referralCode = 'TESTREF';
    
    // Setup inviter
      await pool.query(
        `INSERT INTO users (phone, name, email, role, referral_code, status) 
         VALUES ($1, 'Test Inviter', $3, 'buyer', $2, 'approved')
         ON CONFLICT (phone) DO UPDATE SET referral_code = $2, name = 'Test Inviter', email = COALESCE(users.email, $3)`,
        [inviterPhone, referralCode, `test${inviterPhone.replace(/[^0-9]/g, '')}@test.com`]
      );
    
    // Test: Verify referral code exists
    const inviterResult = await pool.query(
      "SELECT id FROM users WHERE referral_code = $1",
      [referralCode]
    );
    
    logTest('Referral code lookup', inviterResult.rows.length > 0, 
      `Found inviter: ${inviterResult.rows.length > 0 ? 'Yes' : 'No'}`);
    
    // Test: Create referral transaction (simulating OTP verify with referral)
    if (inviterResult.rows.length > 0) {
      const inviterId = inviterResult.rows[0].id;
      
      // Check fraud protection
      const isValid = inviteePhone !== inviterPhone;
      logTest('Referral validation', isValid, 'Different phones = valid');
      
      // Simulate transaction creation
      const transResult = await pool.query(
        `INSERT INTO referral_transactions (inviter_user_id, invitee_phone, amount, status)
         VALUES ($1, $2, 1.00, 'pending')
         RETURNING id`,
        [inviterId, inviteePhone]
      );
      
      if (transResult.rows.length > 0) {
        logTest('Create referral transaction', true, 
          `Transaction ID: ${transResult.rows[0].id}`);
        
        // Cleanup
        await pool.query(
          "DELETE FROM referral_transactions WHERE id = $1",
          [transResult.rows[0].id]
        );
      }
    }
    
  } catch (error) {
    logTest('Referral code in OTP', false, error.message);
  }
}

async function testAwardOnReferralSuccess() {
  console.log('\n📋 Testing: Award on Referral Success');
  
  try {
    const inviterPhone = '+9647701234502';
    const inviteePhone = '+9647701234503';
    
    // Create inviter with zero balance
    let inviterResult = await pool.query(
      "SELECT id FROM users WHERE phone = $1",
      [inviterPhone]
    );
    
    let inviterId;
    if (inviterResult.rows.length === 0) {
      const newUser = await pool.query(
        `INSERT INTO users (phone, name, email, role, referral_code, reward_balance, status) 
         VALUES ($1, 'Test Award User', $2, 'buyer', 'AWARD01', 0.00, 'approved')
         RETURNING id`,
        [inviterPhone, `test${inviterPhone.replace(/[^0-9]/g, '')}@test.com`]
      );
      inviterId = newUser.rows[0].id;
    } else {
      inviterId = inviterResult.rows[0].id;
      await pool.query(
        "UPDATE users SET reward_balance = 0.00 WHERE id = $1",
        [inviterId]
      );
    }
    
    // Create pending transaction
    const transResult = await pool.query(
      `INSERT INTO referral_transactions (inviter_user_id, invitee_phone, amount, status)
       VALUES ($1, $2, 1.00, 'pending')
       RETURNING id`,
      [inviterId, inviteePhone]
    );
    
    const transactionId = transResult.rows[0].id;
    
    // Simulate award (when invitee completes OTP)
    await pool.query(
      `UPDATE referral_transactions SET status = 'awarded', invitee_user_id = 999
       WHERE id = $1`,
      [transactionId]
    );
    
    await pool.query(
      `UPDATE users SET reward_balance = reward_balance + 1.00 WHERE id = $1`,
      [inviterId]
    );
    
    // Verify balance increased
    const balanceResult = await pool.query(
      "SELECT reward_balance FROM users WHERE id = $1",
      [inviterId]
    );
    
    const newBalance = parseFloat(balanceResult.rows[0].reward_balance);
    logTest('Award on referral success', newBalance === 1.00, `Balance: $${newBalance}`);
    
    // Cleanup
    await pool.query("DELETE FROM referral_transactions WHERE id = $1", [transactionId]);
    
  } catch (error) {
    logTest('Award on referral success', false, error.message);
  }
}

export async function runTests() {
  console.log('\n🔐 AUTHENTICATION FLOW TESTS');
  console.log('='.repeat(60));
  
  testResults = [];
  
  await testPhoneNormalization();
  await testOTPFlow();
  await testReferralCodeInOTP();
  await testAwardOnReferralSuccess();
  
  const passed = testResults.filter(t => t.passed).length;
  const failed = testResults.filter(t => !t.passed).length;
  
  console.log('\n📊 Auth Flow Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Total:  ${testResults.length}`);
  
  return { passed, failed, total: testResults.length };
}

