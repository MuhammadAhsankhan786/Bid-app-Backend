/**
 * Check Super Admin Login Issue - Immediate Debug
 * Ye script check karega kyun login nahi ho raha
 */

import pool from "../config/db.js";

async function checkSuperAdmin() {
  try {
    console.log('🔍 Checking Super Admin Login Issue...\n');
    console.log('=' .repeat(60));
    
    const phone = '+9647500914000';
    const role = 'superadmin';
    
    // Step 1: Check if user exists at all
    console.log('\n📱 Step 1: Checking if user exists...\n');
    const userCheck = await pool.query(
      `SELECT id, name, phone, role, status 
       FROM users 
       WHERE phone = $1`,
      [phone]
    );
    
    if (userCheck.rows.length === 0) {
      console.log('❌ PROBLEM: User does NOT exist in database!');
      console.log(`   Phone: ${phone}`);
      console.log('\n🔧 FIXING: Creating user now...\n');
      
      // Check if email already exists
      const emailCheck = await pool.query(
        `SELECT id, phone, role FROM users WHERE email = $1`,
        ['superadmin@bidmaster.com']
      );
      
      let userResult;
      
      if (emailCheck.rows.length > 0) {
        // Email exists, update phone and role
        console.log('   ⚠️  Email already exists, updating phone and role...');
        const existingUser = emailCheck.rows[0];
        
        const columnCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'updated_at'
        `);
        const hasUpdatedAt = columnCheck.rows.length > 0;
        
        let updateQuery;
        if (hasUpdatedAt) {
          updateQuery = `UPDATE users 
                         SET phone = $1, 
                             role = $2, 
                             status = 'approved',
                             updated_at = CURRENT_TIMESTAMP 
                         WHERE email = $3
                         RETURNING id, name, phone, role, status`;
        } else {
          updateQuery = `UPDATE users 
                         SET phone = $1, 
                             role = $2, 
                             status = 'approved'
                         WHERE email = $3
                         RETURNING id, name, phone, role, status`;
        }
        
        userResult = await pool.query(updateQuery, 
          [phone, role, 'superadmin@bidmaster.com']
        );
        
        console.log('✅ User updated successfully!');
      } else {
        // Email doesn't exist, create new user
        const columnCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'updated_at'
        `);
        
        const hasUpdatedAt = columnCheck.rows.length > 0;
        
        // Create user (with or without updated_at)
        let insertQuery;
        if (hasUpdatedAt) {
          insertQuery = `INSERT INTO users (name, email, phone, role, status, created_at, updated_at)
                         VALUES ($1, $2, $3, $4, 'approved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                         RETURNING id, name, phone, role, status`;
        } else {
          insertQuery = `INSERT INTO users (name, email, phone, role, status, created_at)
                         VALUES ($1, $2, $3, $4, 'approved', CURRENT_TIMESTAMP)
                         RETURNING id, name, phone, role, status`;
        }
        
        userResult = await pool.query(insertQuery, 
          ['Super Admin', 'superadmin@bidmaster.com', phone, role]
        );
        
        console.log('✅ User created successfully!');
      }
      
      console.log(`   ID: ${userResult.rows[0].id}`);
      console.log(`   Phone: ${userResult.rows[0].phone}`);
      console.log(`   Role: ${userResult.rows[0].role}`);
      console.log(`   Status: ${userResult.rows[0].status}\n`);
      
      console.log('✅ User created successfully!');
      console.log(`   ID: ${insertResult.rows[0].id}`);
      console.log(`   Phone: ${insertResult.rows[0].phone}`);
      console.log(`   Role: ${insertResult.rows[0].role}`);
      console.log(`   Status: ${insertResult.rows[0].status}\n`);
    } else {
      const user = userCheck.rows[0];
      console.log('✅ User exists in database:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Phone: ${user.phone}`);
      console.log(`   Current Role: ${user.role}`);
      console.log(`   Status: ${user.status}\n`);
      
      // Step 2: Check if role matches
      if (user.role?.toLowerCase() !== role.toLowerCase()) {
        console.log(`⚠️  PROBLEM: Role mismatch!`);
        console.log(`   Expected: ${role}`);
        console.log(`   Found: ${user.role}`);
        console.log('\n🔧 FIXING: Updating role...\n');
        
        // Check if updated_at column exists
        const columnCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'updated_at'
        `);
        
        const hasUpdatedAt = columnCheck.rows.length > 0;
        
        // Update user (with or without updated_at)
        let updateQuery;
        if (hasUpdatedAt) {
          updateQuery = `UPDATE users 
                         SET role = $1, 
                             status = 'approved',
                             updated_at = CURRENT_TIMESTAMP 
                         WHERE phone = $2`;
        } else {
          updateQuery = `UPDATE users 
                         SET role = $1, 
                             status = 'approved'
                         WHERE phone = $2`;
        }
        
        await pool.query(updateQuery, [role, phone]);
        
        console.log('✅ Role updated to superadmin\n');
      } else {
        console.log('✅ Role is correct (superadmin)\n');
      }
      
      // Step 3: Check status
      if (user.status !== 'approved') {
        console.log(`⚠️  PROBLEM: Status is not approved!`);
        console.log(`   Current Status: ${user.status}`);
        console.log('\n🔧 FIXING: Updating status...\n');
        
        // Check if updated_at column exists
        const columnCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'updated_at'
        `);
        
        const hasUpdatedAt = columnCheck.rows.length > 0;
        
        // Update status (with or without updated_at)
        let updateQuery;
        if (hasUpdatedAt) {
          updateQuery = `UPDATE users 
                         SET status = 'approved',
                             updated_at = CURRENT_TIMESTAMP 
                         WHERE phone = $1`;
        } else {
          updateQuery = `UPDATE users 
                         SET status = 'approved'
                         WHERE phone = $1`;
        }
        
        await pool.query(updateQuery, [phone]);
        
        console.log('✅ Status updated to approved\n');
      } else {
        console.log('✅ Status is approved\n');
      }
    }
    
    // Step 4: Test exact login query (same as backend)
    console.log('=' .repeat(60));
    console.log('\n🧪 Step 4: Testing Login Query (Same as Backend)...\n');
    
    const loginQuery = await pool.query(
      `SELECT id, name, email, phone, role, status 
       FROM users 
       WHERE phone = $1 AND role = $2`,
      [phone, role]
    );
    
    if (loginQuery.rows.length > 0) {
      const foundUser = loginQuery.rows[0];
      console.log('✅ LOGIN QUERY SUCCESS!');
      console.log(`   User ID: ${foundUser.id}`);
      console.log(`   Name: ${foundUser.name}`);
      console.log(`   Phone: ${foundUser.phone}`);
      console.log(`   Role: ${foundUser.role}`);
      console.log(`   Status: ${foundUser.status}`);
      console.log('\n✅ Login will work now!\n');
    } else {
      console.log('❌ LOGIN QUERY FAILED!');
      console.log(`   Phone: ${phone}`);
      console.log(`   Role: ${role}`);
      console.log('   No user found with this combination\n');
      
      // Check what exists
      const allUsers = await pool.query(
        `SELECT phone, role FROM users WHERE phone = $1`,
        [phone]
      );
      
      if (allUsers.rows.length > 0) {
        console.log('   Found user with different role:');
        console.log(`   Phone: ${allUsers.rows[0].phone}`);
        console.log(`   Role: ${allUsers.rows[0].role}`);
        console.log(`   Expected: ${role}\n`);
      }
    }
    
    // Step 5: Final verification
    console.log('=' .repeat(60));
    console.log('\n✅ FINAL VERIFICATION:\n');
    
    const finalCheck = await pool.query(
      `SELECT id, name, phone, role, status 
       FROM users 
       WHERE phone = $1 AND role = $2`,
      [phone, role]
    );
    
    if (finalCheck.rows.length > 0) {
      const user = finalCheck.rows[0];
      console.log('✅ Super Admin is ready for login:');
      console.log(`   Phone: ${user.phone}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status}`);
      console.log('\n✅ Ab login kaam karega!\n');
    } else {
      console.log('❌ Still not working. Please check database connection.\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('   Details:', error.message);
  } finally {
    await pool.end();
  }
}

checkSuperAdmin();

