/**
 * Test the 4 failing APIs individually to see exact errors
 */

import axios from 'axios';

const LOCAL_URL = 'http://localhost:5000/api';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NTMsInBob25lIjoiKzk2NDc1MDA5MTQwMDAiLCJyb2xlIjoic3VwZXJhZG1pbiIsInNjb3BlIjoiYWRtaW4iLCJpYXQiOjE3NjYxNzIwNTMsImV4cCI6MTc2Njc3Njg1M30.zQItgDfi6jMB9n0vdk1dkOAxzSr21ksZBr3wC9aoCLQ';

async function testFailingAPIs() {
  console.log('🔍 Testing 4 Failing APIs Individually...\n');
  console.log('='.repeat(80));
  
  const failingAPIs = [
    {
      name: 'Update User',
      method: 'PUT',
      endpoint: '/admin/users/138',
      body: { name: 'Updated User Name' }
    },
    {
      name: 'Approve Product',
      method: 'PATCH',
      endpoint: '/admin/products/approve/132',
      body: {}
    },
    {
      name: 'Get Product Documents',
      method: 'GET',
      endpoint: '/admin/products/132/documents',
      body: null
    },
    {
      name: 'Update Order Status',
      method: 'PATCH',
      endpoint: '/admin/orders/1/status',
      body: { paymentStatus: 'completed' }
    }
  ];
  
  for (const api of failingAPIs) {
    console.log(`\n📋 Testing: ${api.name}`);
    console.log(`   ${api.method} ${LOCAL_URL}${api.endpoint}`);
    
    try {
      const config = {
        method: api.method,
        url: `${LOCAL_URL}${api.endpoint}`,
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      };
      
      if (api.body) {
        config.data = api.body;
      }
      
      const response = await axios(config);
      console.log(`   ✅ Success: ${response.status}`);
      console.log(`   Response:`, JSON.stringify(response.data, null, 2).substring(0, 200));
    } catch (error) {
      const status = error.response?.status || 'NETWORK_ERROR';
      console.log(`   ❌ Failed: ${status}`);
      console.log(`   Error:`, JSON.stringify(error.response?.data || error.message, null, 2));
      if (error.response?.data) {
        console.log(`   Full Error:`, JSON.stringify(error.response.data, null, 2));
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n');
  console.log('='.repeat(80));
}

testFailingAPIs().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

