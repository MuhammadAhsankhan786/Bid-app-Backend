/**
 * Test Change Role API
 * Tests: PUT /api/admin/users/:id/role
 */

import axios from 'axios';

// API URL
const LIVE_URL = 'https://api.mazaadati.com/api';
const USER_ID = 115;

// Test token (you need to provide admin token)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

async function testChangeRoleAPI() {
  const url = `${LIVE_URL}/admin/users/${USER_ID}/role`;
  
  console.log('🚀 Testing Change Role API\n');
  console.log('='.repeat(80));
  console.log(`📋 API Endpoint: PUT ${url}`);
  console.log(`👤 User ID: ${USER_ID}`);
  console.log('='.repeat(80));
  
  if (!ADMIN_TOKEN) {
    console.log('\n⚠️  WARNING: No admin token provided!');
    console.log('   Set ADMIN_TOKEN environment variable or update script.');
    console.log('   Example: $env:ADMIN_TOKEN="your-token-here"');
    console.log('\n   Testing without token (will likely fail with 401)...\n');
  } else {
    console.log(`\n✅ Using admin token: ${ADMIN_TOKEN.substring(0, 20)}...${ADMIN_TOKEN.substring(ADMIN_TOKEN.length - 10)}\n`);
  }
  
  // Test with different roles
  const testRoles = [
    'moderator',
    'viewer',
    'employee',
    'superadmin'
  ];
  
  for (const role of testRoles) {
    console.log(`\n📋 Testing with role: ${role}`);
    console.log('-'.repeat(80));
    
    try {
      const response = await axios.put(
        url,
        { role },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(ADMIN_TOKEN && { 'Authorization': `Bearer ${ADMIN_TOKEN}` })
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
      
    } catch (error) {
      const status = error.response?.status || 'NETWORK_ERROR';
      const errorData = error.response?.data || error.message;
      
      console.log(`   ❌ FAILED (${status})`);
      console.log(`   Error: ${JSON.stringify(errorData, null, 2)}`);
      
      if (status === 401) {
        console.log(`   💡 This is an authentication error. Make sure you have a valid admin token.`);
      } else if (status === 403) {
        console.log(`   💡 This is a permission error. Make sure you have superadmin role.`);
      } else if (status === 404) {
        console.log(`   💡 User with ID ${USER_ID} not found or cannot be updated.`);
      } else if (status === 400) {
        console.log(`   💡 Invalid role or missing required fields.`);
      }
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n');
  console.log('='.repeat(80));
  console.log('Test Complete!');
  console.log('='.repeat(80));
}

// Run test
testChangeRoleAPI().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});

