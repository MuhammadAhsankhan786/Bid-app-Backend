/**
 * Test Dashboard API on Local Backend
 */

import axios from 'axios';

const LOCAL_URL = 'http://localhost:5000/api';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NTMsInBob25lIjoiKzk2NDc1MDA5MTQwMDAiLCJyb2xlIjoic3VwZXJhZG1pbiIsInNjb3BlIjoiYWRtaW4iLCJpYXQiOjE3NjYxNzIwNTMsImV4cCI6MTc2Njc3Njg1M30.zQItgDfi6jMB9n0vdk1dkOAxzSr21ksZBr3wC9aoCLQ';

async function testDashboard() {
  console.log('🧪 Testing Dashboard API on Local Backend...\n');
  console.log('='.repeat(80));
  
  const dashboardAPIs = [
    { name: 'Get Dashboard', endpoint: '/admin/dashboard' },
    { name: 'Get Dashboard Charts', endpoint: '/admin/dashboard/charts' },
    { name: 'Get Dashboard Categories', endpoint: '/admin/dashboard/categories' }
  ];
  
  for (const api of dashboardAPIs) {
    try {
      console.log(`\n📋 Testing: ${api.name}`);
      console.log(`   Endpoint: ${LOCAL_URL}${api.endpoint}`);
      
      const response = await axios.get(`${LOCAL_URL}${api.endpoint}`, {
        headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
      });
      
      console.log(`   ✅ Status: ${response.status}`);
      console.log(`   📊 Response:`, JSON.stringify(response.data, null, 2).substring(0, 200) + '...');
      
    } catch (error) {
      const status = error.response?.status || 'NETWORK_ERROR';
      console.log(`   ❌ Status: ${status}`);
      console.log(`   Error: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
      
      if (error.response?.data) {
        console.log(`   Full Error:`, JSON.stringify(error.response.data, null, 2));
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n');
  console.log('='.repeat(80));
  console.log('Test Complete!');
  console.log('='.repeat(80));
}

testDashboard().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

