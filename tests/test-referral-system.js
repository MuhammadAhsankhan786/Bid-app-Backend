/**
 * Referral System Tests
 * Tests: Code generation, referral detection, award logic, fraud protection
 */

import pool from '../src/config/db.js';
import { 
  generateReferralCode, 
  findInviterByCode, 
  createReferralTransaction,
  awardReferralReward,
  getReferralRewardAmount,
  checkFraudProtection
} from '../src/utils/referralUtils.js';

let testResults = [];

function logTest(name, passed, message = '') {
  const status = passed ? '✅' : '❌';
  console.log(`  ${status} ${name}${message ? ': ' + message : ''}`);
  testResults.push({ name, passed, message });
}

async function testGenerateReferralCode() {
  console.log('\n📋 Testing: Referral Code Generation');
  
  try {
    // Test 1: Generate unique code
    const code1 = await generateReferralCode();
    logTest('Generate referral code', code1 && code1.length === 6, `Code: ${code1}`);
    
    // Test 2: Code is uppercase alphanumeric
    const isValidFormat = /^[A-Z0-9]{6}$/.test(code1);
    logTest('Code format validation', isValidFormat, `Format: ${code1}`);
    
    // Test 3: Generate multiple codes (should be unique)
    const code2 = await generateReferralCode();
    const code3 = await generateReferralCode();
    const allUnique = code1 !== code2 && code2 !== code3 && code1 !== code3;
    logTest('Uniqueness check', allUnique, `Codes: ${code1}, ${code2}, ${code3}`);
    
  } catch (error) {
    logTest('Generate referral code', false, error.message);
  }
}

async function testFindInviterByCode() {
  console.log('\n📋 Testing: Find Inviter by Code');
  
  try {
    // Create a test user with referral code
    const testCode = 'TEST01';
    const testPhone = '+9647701234567';
    
    // Check if test user exists, create if not
    let userResult = await pool.query(
      "SELECT id FROM users WHERE referral_code = $1",
      [testCode]
    );
    
    if (userResult.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (phone, name, email, role, referral_code, status) 
         VALUES ($1, 'Test User', $3, 'buyer', $2, 'approved')
         ON CONFLICT (phone) DO UPDATE SET referral_code = $2, name = 'Test User', email = COALESCE(users.email, $3)`,
        [testPhone, testCode, `test${testPhone.replace(/[^0-9]/g, '')}@test.com`]
      );
    }
    
    // Test: Find inviter
    const inviter = await findInviterByCode(testCode);
    logTest('Find inviter by code', inviter !== null, `Found: ${inviter ? 'Yes' : 'No'}`);
    
    // Test: Invalid code
    const invalidInviter = await findInviterByCode('INVALID');
    logTest('Invalid code returns null', invalidInviter === null);
    
  } catch (error) {
    logTest('Find inviter by code', false, error.message);
  }
}

async function testGetReferralRewardAmount() {
  console.log('\n📋 Testing: Get Referral Reward Amount');
  
  try {
    // Ensure setting exists
    await pool.query(
      `INSERT INTO app_settings (setting_key, setting_value) 
       VALUES ('referral_reward_amount', '1.00')
       ON CONFLICT (setting_key) DO NOTHING`
    );
    
    const amount = await getReferralRewardAmount();
    logTest('Get reward amount', amount === 1.00, `Amount: $${amount}`);
    
    // Test default value if setting doesn't exist
    await pool.query("DELETE FROM app_settings WHERE setting_key = 'referral_reward_amount'");
    const defaultAmount = await getReferralRewardAmount();
    logTest('Default reward amount', defaultAmount === 1.00, `Default: $${defaultAmount}`);
    
    // Restore setting
    await pool.query(
      `INSERT INTO app_settings (setting_key, setting_value) 
       VALUES ('referral_reward_amount', '1.00')
       ON CONFLICT (setting_key) DO UPDATE SET setting_value = '1.00'`
    );
    
  } catch (error) {
    logTest('Get referral reward amount', false, error.message);
  }
}

async function testFraudProtection() {
  console.log('\n📋 Testing: Fraud Protection');
  
  try {
    const testPhone = '+9647701234568';
    
    // Create test inviter
    let inviterResult = await pool.query(
      "SELECT id FROM users WHERE phone = $1",
      [testPhone]
    );
    
    let inviterId;
    if (inviterResult.rows.length === 0) {
      const newUser = await pool.query(
        `INSERT INTO users (phone, name, email, role, referral_code, status) 
         VALUES ($1, 'Test Inviter', $2, 'buyer', 'INVITE', 'approved')
         RETURNING id`,
        [testPhone, `test${testPhone.replace(/[^0-9]/g, '')}@test.com`]
      );
      inviterId = newUser.rows[0].id;
    } else {
      inviterId = inviterResult.rows[0].id;
    }
    
    // Test: Self-referral prevention
    const selfReferralCheck = await checkFraudProtection(inviterId, testPhone, '127.0.0.1');
    logTest('Prevent self-referral', selfReferralCheck.allowed === false, 
      `Self-referral blocked: ${selfReferralCheck.reason || 'OK'}`);
    
    // Test: Valid referral (different phone)
    const validCheck = await checkFraudProtection(inviterId, '+9647701234569', '127.0.0.1');
    logTest('Allow valid referral', validCheck.allowed === true, 
      `Valid referral allowed: ${validCheck.reason || 'OK'}`);
    
  } catch (error) {
    logTest('Fraud protection', false, error.message);
  }
}

async function testReferralTransactionFlow() {
  console.log('\n📋 Testing: Referral Transaction Flow');
  
  try {
    const testInviterPhone = '+9647701234560';
    const testInviteePhone = '+9647701234561';
    
    // Create inviter
    let inviterResult = await pool.query(
      "SELECT id FROM users WHERE phone = $1",
      [testInviterPhone]
    );
    
    let inviterId;
    if (inviterResult.rows.length === 0) {
      const testEmail = `test${testInviterPhone.replace(/[^0-9]/g, '')}@test.com`;
      const newUser = await pool.query(
        `INSERT INTO users (phone, name, email, role, referral_code, reward_balance, status) 
         VALUES ($1, 'Test Inviter', $2, 'buyer', 'INVTR1', 0.00, 'approved')
         RETURNING id`,
        [testInviterPhone, testEmail]
      );
      inviterId = newUser.rows[0].id;
    } else {
      inviterId = inviterResult.rows[0].id;
      await pool.query(
        "UPDATE users SET reward_balance = 0.00 WHERE id = $1",
        [inviterId]
      );
    }
    
    // Test: Create transaction
    const transaction = await createReferralTransaction(inviterId, testInviteePhone, 1.00);
    logTest('Create referral transaction', transaction !== null, `Transaction ID: ${transaction?.id || 'N/A'}`);
    
    // Test: Award reward (awardReferralReward expects transaction ID, not object)
    const transactionId = transaction?.id;
    if (transactionId) {
      await awardReferralReward(transactionId, 999); // Using dummy invitee ID
      
      // Verify balance increased
      const balanceResult = await pool.query(
        "SELECT reward_balance FROM users WHERE id = $1",
        [inviterId]
      );
      const newBalance = parseFloat(balanceResult.rows[0].reward_balance);
      logTest('Award increases balance', newBalance === 1.00, `Balance: $${newBalance}`);
      
      // Verify transaction status
      const transResult = await pool.query(
        "SELECT status FROM referral_transactions WHERE id = $1",
        [transactionId]
      );
      logTest('Transaction status updated', transResult.rows[0].status === 'awarded', 
        `Status: ${transResult.rows[0].status}`);
      
      // Cleanup
      await pool.query("DELETE FROM referral_transactions WHERE id = $1", [transactionId]);
    } else {
      logTest('Award increases balance', false, 'Transaction ID missing');
      logTest('Transaction status updated', false, 'Transaction ID missing');
    }
    
  } catch (error) {
    logTest('Referral transaction flow', false, error.message);
  }
}

export async function runTests() {
  console.log('\n🔗 REFERRAL SYSTEM TESTS');
  console.log('='.repeat(60));
  
  testResults = [];
  
  await testGenerateReferralCode();
  await testFindInviterByCode();
  await testGetReferralRewardAmount();
  await testFraudProtection();
  await testReferralTransactionFlow();
  
  const passed = testResults.filter(t => t.passed).length;
  const failed = testResults.filter(t => !t.passed).length;
  
  console.log('\n📊 Referral System Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Total:  ${testResults.length}`);
  
  return { passed, failed, total: testResults.length };
}

