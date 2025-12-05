import pool from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

async function verifyUserRole() {
  try {
    console.log('🔍 Verifying User Roles in Database\n');
    console.log('='.repeat(60));
    
    // Check specific user mentioned in the issue
    const phone = '03001234567';
    const normalizedPhone = phone.startsWith('0') ? '+964' + phone.substring(1) : phone;
    
    console.log(`\n📱 Checking user with phone: ${phone}`);
    console.log(`   Normalized: ${normalizedPhone}\n`);
    
    const result = await pool.query(
      `SELECT id, name, phone, role, status 
       FROM users 
       WHERE phone = $1 OR phone = $2`,
      [phone, normalizedPhone]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ User not found in database');
      console.log('\n💡 Creating seller user...');
      
      // Create seller user
      const insertResult = await pool.query(
        `INSERT INTO users (name, email, phone, role, status, password) 
         VALUES ($1, $2, $3, 'seller_products', 'approved', '') 
         RETURNING id, name, phone, role, status`,
        ['Test Seller', `seller@${normalizedPhone.replace(/\+/g, '')}.com`, normalizedPhone]
      );
      
      console.log('✅ Seller user created:');
      console.log(insertResult.rows[0]);
    } else {
      const user = result.rows[0];
      console.log('✅ User found:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Phone: ${user.phone}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status}`);
      
      if (user.role !== 'seller_products') {
        console.log(`\n⚠️  Role is '${user.role}', updating to 'seller_products'...`);
        
        const updateResult = await pool.query(
          `UPDATE users 
           SET role = 'seller_products' 
           WHERE id = $1 
           RETURNING id, name, phone, role, status`,
          [user.id]
        );
        
        console.log('✅ Role updated:');
        console.log(updateResult.rows[0]);
      } else {
        console.log('\n✅ Role is already "seller_products"');
      }
      
      if (user.status !== 'approved') {
        console.log(`\n⚠️  Status is '${user.status}', updating to 'approved'...`);
        
        const updateResult = await pool.query(
          `UPDATE users 
           SET status = 'approved' 
           WHERE id = $1 
           RETURNING id, name, phone, role, status`,
          [user.id]
        );
        
        console.log('✅ Status updated:');
        console.log(updateResult.rows[0]);
      }
    }
    
    // List all seller users
    console.log('\n' + '='.repeat(60));
    console.log('\n📋 All Seller Users:');
    const sellers = await pool.query(
      `SELECT id, name, phone, role, status 
       FROM users 
       WHERE role = 'seller_products' 
       ORDER BY id`
    );
    
    if (sellers.rows.length === 0) {
      console.log('❌ No seller users found');
    } else {
      sellers.rows.forEach((seller, index) => {
        console.log(`\n${index + 1}. ${seller.name}`);
        console.log(`   ID: ${seller.id}`);
        console.log(`   Phone: ${seller.phone}`);
        console.log(`   Role: ${seller.role}`);
        console.log(`   Status: ${seller.status}`);
      });
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyUserRole();













