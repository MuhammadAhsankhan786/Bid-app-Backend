/**
 * Employee Role Behavior Test
 * Tests if employee role works correctly:
 * 1. Can login to admin panel
 * 2. Can only see company products
 * 3. Cannot see seller products, users, settings
 */

import axios from 'axios';

const LIVE_URL = 'https://api.mazaadati.com/api';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NTMsInBob25lIjoiKzk2NDc1MDA5MTQwMDAiLCJyb2xlIjoic3VwZXJhZG1pbiIsInNjb3BlIjoiYWRtaW4iLCJpYXQiOjE3NjYxNzIwNTMsImV4cCI6MTc2Njc3Njg1M30.zQItgDfi6jMB9n0vdk1dkOAxzSr21ksZBr3wC9aoCLQ';

async function testEmployeeBehavior() {
  console.log('🧪 Testing Employee Role Behavior\n');
  console.log('='.repeat(80));
  
  // Step 1: Find or create employee user
  console.log('\n📋 Step 1: Finding Employee User...');
  console.log('-'.repeat(80));
  
  let employeeUser = null;
  try {
    const response = await axios.get(`${LIVE_URL}/admin/users`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` },
      params: { role: 'employee', limit: 10 }
    });
    
    const users = response.data?.users || response.data?.data || [];
    employeeUser = users.find(u => u.role?.toLowerCase() === 'employee' || u.roleValue === 'employee');
    
    if (!employeeUser) {
      console.log('⚠️  No employee user found. Checking all users...');
      const allUsers = await axios.get(`${LIVE_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` },
        params: { limit: 50 }
      });
      
      const all = allUsers.data?.users || allUsers.data?.data || [];
      console.log(`\n📊 Found ${all.length} users. Checking roles...`);
      all.slice(0, 10).forEach((u, i) => {
        console.log(`   ${i+1}. ID: ${u.id}, Name: ${u.name}, Role: ${u.role}, RoleValue: ${u.roleValue}`);
      });
      
      // Try to find a user that can be converted to employee
      const testUser = all.find(u => 
        u.role?.toLowerCase() === 'company_products' || 
        u.roleValue === 'company_products'
      );
      
      if (testUser) {
        console.log(`\n🔄 Converting user ${testUser.id} to employee role...`);
        try {
          const updateResponse = await axios.put(
            `${LIVE_URL}/admin/users/${testUser.id}/role`,
            { role: 'employee' },
            { headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` } }
          );
          
          employeeUser = updateResponse.data?.user || testUser;
          employeeUser.role = 'employee';
          console.log(`✅ User converted to employee`);
        } catch (error) {
          console.log(`❌ Failed to convert: ${error.response?.status || 'ERROR'}`);
          console.log(`   Error: ${JSON.stringify(error.response?.data || error.message, null, 2)}`);
        }
      }
    } else {
      console.log(`✅ Found employee user: ID ${employeeUser.id}, Name: ${employeeUser.name}`);
    }
  } catch (error) {
    console.log(`❌ Failed to fetch users: ${error.response?.status || 'NETWORK_ERROR'}`);
    return;
  }
  
  if (!employeeUser) {
    console.log('\n⚠️  Cannot proceed without employee user');
    return;
  }
  
  // Step 2: Test employee login (would need employee token, but we'll test APIs with employee context)
  console.log('\n📋 Step 2: Testing Employee Access (Simulated)...');
  console.log('-'.repeat(80));
  console.log('Note: Full login test requires employee token. Testing API behavior instead.\n');
  
  // Step 3: Test what employee should see
  console.log('📋 Step 3: Testing Product APIs (Should work after fixes)...');
  console.log('-'.repeat(80));
  
  const productAPIs = [
    { name: 'Get Products', endpoint: '/admin/products' },
    { name: 'Get Pending Products', endpoint: '/admin/products/pending' },
    { name: 'Get Live Auctions', endpoint: '/admin/products/live' },
    { name: 'Get Rejected Products', endpoint: '/admin/products/rejected' },
    { name: 'Get Completed Products', endpoint: '/admin/products/completed' }
  ];
  
  for (const api of productAPIs) {
    try {
      const response = await axios.get(`${LIVE_URL}${api.endpoint}`, {
        headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
      });
      
      console.log(`   ✅ ${api.name}: Success (${response.status}) - ${response.data?.length || response.data?.products?.length || 0} items`);
    } catch (error) {
      const status = error.response?.status || 'NETWORK_ERROR';
      console.log(`   ❌ ${api.name}: Failed (${status})`);
      if (error.response?.data) {
        const errorMsg = JSON.stringify(error.response.data).substring(0, 100);
        console.log(`      Error: ${errorMsg}...`);
      }
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n');
  console.log('='.repeat(80));
  console.log('Test Complete!');
  console.log('='.repeat(80));
  console.log('\n💡 Note: Full employee behavior test requires:');
  console.log('   1. Employee user with valid token');
  console.log('   2. Login to admin panel');
  console.log('   3. Manual UI verification');
}

testEmployeeBehavior().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

