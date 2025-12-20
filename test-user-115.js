/**
 * Test User 115 Details
 * Check if user exists and what their current role is
 */

import axios from 'axios';

const LIVE_URL = 'https://api.mazaadati.com/api';
const USER_ID = 115;
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NTMsInBob25lIjoiKzk2NDc1MDA5MTQwMDAiLCJyb2xlIjoic3VwZXJhZG1pbiIsInNjb3BlIjoiYWRtaW4iLCJpYXQiOjE3NjYxNzIwNTMsImV4cCI6MTc2Njc3Njg1M30.zQItgDfi6jMB9n0vdk1dkOAxzSr21ksZBr3wC9aoCLQ';

async function checkUser() {
  const url = `${LIVE_URL}/admin/users/${USER_ID}`;
  
  console.log('🔍 Checking User 115 Details\n');
  console.log('='.repeat(80));
  console.log(`📋 API: GET ${url}`);
  console.log('='.repeat(80));
  
  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });
    
    console.log('\n✅ User Found:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('\n❌ Error:');
    console.log(`   Status: ${error.response?.status || 'NETWORK_ERROR'}`);
    console.log(`   Error: ${JSON.stringify(error.response?.data || error.message, null, 2)}`);
  }
}

checkUser();

