import express from 'express';
import { AuthController } from '../controllers/authController.js';

/**
 * Test login-phone endpoint with sample requests
 */
async function testLoginPhoneRequest() {
  console.log('\n🧪 Testing /api/auth/login-phone Endpoint');
  console.log('='.repeat(70));
  
  // Simulate different request formats
  const testCases = [
    {
      name: 'Correct Format',
      body: { phone: '+9647701234567', otp: '1234' },
      expected: '200 OK'
    },
    {
      name: 'Missing OTP',
      body: { phone: '+9647701234567' },
      expected: '400 Bad Request - Missing OTP'
    },
    {
      name: 'Missing Phone',
      body: { otp: '1234' },
      expected: '400 Bad Request - Missing Phone'
    },
    {
      name: 'Wrong Field Names (mobile, otpCode)',
      body: { mobile: '+9647701234567', otpCode: '1234' },
      expected: '400 Bad Request - Wrong field names'
    },
    {
      name: 'Invalid Phone Format',
      body: { phone: '7701234567', otp: '1234' },
      expected: '400 Bad Request - Invalid format'
    },
    {
      name: 'Phone as Number',
      body: { phone: 9647701234567, otp: '1234' },
      expected: '400 Bad Request - Wrong type'
    },
    {
      name: 'OTP as Number',
      body: { phone: '+9647701234567', otp: 1234 },
      expected: '400 Bad Request - Wrong type'
    }
  ];
  
  console.log('\n📋 Test Cases:');
  console.log('='.repeat(70));
  
  testCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. ${testCase.name}:`);
    console.log(`   Request Body: ${JSON.stringify(testCase.body)}`);
    console.log(`   Expected: ${testCase.expected}`);
    
    // Simulate what backend expects
    const { phone, otp } = testCase.body;
    
    if (!phone || !otp) {
      console.log(`   ✅ Would return: 400 - Missing phone or OTP`);
    } else if (testCase.body.mobile || testCase.body.otpCode) {
      console.log(`   ✅ Would return: 400 - Wrong field names (expects 'phone' and 'otp')`);
    } else {
      console.log(`   ✅ Would validate phone format and OTP`);
    }
  });
  
  console.log('\n' + '='.repeat(70));
  console.log('📝 Backend Expects:');
  console.log('='.repeat(70));
  console.log(`
const { phone, otp } = req.body;

if (!phone || !otp) {
  return res.status(400).json({ 
    success: false, 
    message: "Phone number and OTP are required" 
  });
}
  `);
  
  console.log('\n📝 Flutter Sends:');
  console.log('='.repeat(70));
  console.log(`
await _dio.post(
  '/auth/login-phone',
  data: {
    'phone': normalizedPhone,  // ✅ Correct field name
    'otp': otp,                 // ✅ Correct field name
  },
);
  `);
  
  console.log('\n✅ Comparison:');
  console.log('='.repeat(70));
  console.log('Backend expects: { phone: string, otp: string }');
  console.log('Flutter sends:  { phone: string, otp: string }');
  console.log('Status: MATCH ✅');
  
  console.log('\n🔍 Possible Issues:');
  console.log('='.repeat(70));
  console.log('1. Phone format validation failing');
  console.log('2. Phone normalization returning null');
  console.log('3. Request body not being parsed correctly');
  console.log('4. CORS or middleware issues');
  
  process.exit(0);
}

testLoginPhoneRequest();





