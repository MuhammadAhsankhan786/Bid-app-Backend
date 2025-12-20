/**
 * Test Change Role API with actual users
 * First fetches users list, then tests change role on non-admin users
 */

import axios from 'axios';

const LIVE_URL = 'https://api.mazaadati.com/api';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NTMsInBob25lIjoiKzk2NDc1MDA5MTQwMDAiLCJyb2xlIjoic3VwZXJhZG1pbiIsInNjb3BlIjoiYWRtaW4iLCJpYXQiOjE3NjYxNzIwNTMsImV4cCI6MTc2Njc3Njg1M30.zQItgDfi6jMB9n0vdk1dkOAxzSr21ksZBr3wC9aoCLQ';

async function testChangeRoleWithUsers() {
  console.log('🚀 Testing Change Role API with Real Users\n');
  console.log('='.repeat(80));
  
  // Step 1: Fetch users list
  console.log('\n📋 Step 1: Fetching Users List...');
  console.log('-'.repeat(80));
  
  let users = [];
  try {
    const response = await axios.get(`${LIVE_URL}/admin/users`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      params: {
        limit: 10
      }
    });
    
    users = response.data?.users || response.data?.data || [];
    console.log(`✅ Found ${users.length} users`);
    
    // Show first few users
    console.log('\n📊 Users List:');
    users.slice(0, 5).forEach((user, index) => {
      console.log(`   ${index + 1}. ID: ${user.id}, Name: ${user.name}, Role: ${user.role}, Status: ${user.status}`);
    });
    
  } catch (error) {
    console.log(`❌ Failed to fetch users: ${error.response?.status || 'NETWORK_ERROR'}`);
    console.log(`   Error: ${JSON.stringify(error.response?.data || error.message, null, 2)}`);
    return;
  }
  
  if (users.length === 0) {
    console.log('\n⚠️  No users found to test with');
    return;
  }
  
  // Step 2: Find a non-admin user
  console.log('\n📋 Step 2: Finding Non-Admin User...');
  console.log('-'.repeat(80));
  
  const nonAdminUsers = users.filter(user => {
    const role = user.role?.toLowerCase();
    return !['admin', 'superadmin', 'moderator', 'viewer', 'employee'].includes(role);
  });
  
  if (nonAdminUsers.length === 0) {
    console.log('⚠️  No non-admin users found. Testing with first user...');
    var testUser = users[0];
  } else {
    var testUser = nonAdminUsers[0];
    console.log(`✅ Found non-admin user: ID ${testUser.id}, Role: ${testUser.role}`);
  }
  
  console.log(`\n👤 Test User Details:`);
  console.log(`   ID: ${testUser.id}`);
  console.log(`   Name: ${testUser.name}`);
  console.log(`   Current Role: ${testUser.role}`);
  console.log(`   Status: ${testUser.status}`);
  
  // Step 3: Test change role API
  console.log('\n📋 Step 3: Testing Change Role API...');
  console.log('='.repeat(80));
  
  const testRoles = ['moderator', 'viewer', 'employee'];
  const originalRole = testUser.role;
  
  for (const newRole of testRoles) {
    if (newRole === originalRole?.toLowerCase()) {
      console.log(`\n⏭️  Skipping ${newRole} (already has this role)`);
      continue;
    }
    
    console.log(`\n📋 Testing: Change role from "${originalRole}" to "${newRole}"`);
    console.log('-'.repeat(80));
    
    try {
      const response = await axios.put(
        `${LIVE_URL}/admin/users/${testUser.id}/role`,
        { role: newRole },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ADMIN_TOKEN}`
          },
          timeout: 15000,
        }
      );
      
      console.log(`   ✅ SUCCESS (${response.status})`);
      console.log(`   Response: ${JSON.stringify({
        message: response.data?.message,
        user: {
          id: response.data?.user?.id,
          name: response.data?.user?.name,
          role: response.data?.user?.role,
          status: response.data?.user?.status
        }
      }, null, 2)}`);
      
      // Update testUser with new role for next test
      testUser.role = newRole;
      
      // Break after first successful test
      console.log(`\n✅ Change Role API is working!`);
      break;
      
    } catch (error) {
      const status = error.response?.status || 'NETWORK_ERROR';
      const errorData = error.response?.data || error.message;
      
      console.log(`   ❌ FAILED (${status})`);
      console.log(`   Error: ${JSON.stringify(errorData, null, 2)}`);
      
      if (status === 404) {
        console.log(`   💡 User not found or cannot be updated (might be admin role)`);
      } else if (status === 400) {
        console.log(`   💡 Invalid role or missing required fields`);
      } else if (status === 500) {
        console.log(`   💡 Server error - check backend logs`);
      }
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Step 4: Restore original role (if changed)
  if (testUser.role !== originalRole) {
    console.log(`\n📋 Step 4: Restoring Original Role...`);
    console.log('-'.repeat(80));
    console.log(`   Restoring role from "${testUser.role}" to "${originalRole}"`);
    
    try {
      const response = await axios.put(
        `${LIVE_URL}/admin/users/${testUser.id}/role`,
        { role: originalRole },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ADMIN_TOKEN}`
          },
          timeout: 15000,
        }
      );
      
      console.log(`   ✅ Original role restored`);
      
    } catch (error) {
      console.log(`   ⚠️  Could not restore original role: ${error.response?.status || 'NETWORK_ERROR'}`);
    }
  }
  
  console.log('\n');
  console.log('='.repeat(80));
  console.log('Test Complete!');
  console.log('='.repeat(80));
}

// Run test
testChangeRoleWithUsers().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});

