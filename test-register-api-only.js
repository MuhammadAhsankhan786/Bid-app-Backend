/**
 * Test Register API Only
 */

import axios from 'axios';

const LOCAL_URL = 'http://localhost:5000/api';
const LIVE_URL = 'https://api.mazaadati.com/api';

async function testRegisterAPI() {
  console.log('🧪 Testing Register API...\n');
  console.log('='.repeat(80));
  
  // Generate unique test data
  const timestamp = Date.now();
  const randomNum = Math.floor(Math.random() * 10000);
  const testData = {
    name: `Test User ${timestamp}`,
    phone: `+964750${randomNum.toString().padStart(6, '0')}`,
    email: `test${timestamp}@example.com`,
    password: `Test@123${timestamp}`,
    role: 'company_products'
  };
  
  console.log('📋 Test Data:');
  console.log('   Name:', testData.name);
  console.log('   Phone:', testData.phone);
  console.log('   Email:', testData.email);
  console.log('   Role:', testData.role);
  console.log('');
  
  // Test Local
  console.log('🔵 Testing LOCAL...');
  console.log(`   URL: ${LOCAL_URL}/auth/register`);
  try {
    const localResponse = await axios.post(`${LOCAL_URL}/auth/register`, testData);
    console.log(`   ✅ LOCAL: Success (${localResponse.status})`);
    console.log('   Response:', JSON.stringify(localResponse.data, null, 2));
  } catch (error) {
    const status = error.response?.status || 'NETWORK_ERROR';
    console.log(`   ❌ LOCAL: Failed (${status})`);
    if (error.response?.data) {
      console.log('   Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('   Error:', error.message);
    }
  }
  
  console.log('');
  
  // Test Live
  console.log('🟢 Testing LIVE...');
  console.log(`   URL: ${LIVE_URL}/auth/register`);
  try {
    const liveResponse = await axios.post(`${LIVE_URL}/auth/register`, testData);
    console.log(`   ✅ LIVE: Success (${liveResponse.status})`);
    console.log('   Response:', JSON.stringify(liveResponse.data, null, 2));
  } catch (error) {
    const status = error.response?.status || 'NETWORK_ERROR';
    console.log(`   ❌ LIVE: Failed (${status})`);
    if (error.response?.data) {
      console.log('   Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('   Error:', error.message);
    }
  }
  
  console.log('');
  console.log('='.repeat(80));
  console.log('Test Complete!');
  console.log('='.repeat(80));
}

testRegisterAPI().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

