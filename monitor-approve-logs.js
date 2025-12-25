/**
 * Monitor approve product endpoint logs
 * This script helps debug production issues
 */

import pool from './src/config/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function monitorLogs() {
  console.log('📊 Monitoring Approve Product Endpoint\n');
  console.log('─'.repeat(60));
  
  try {
    // Check recent products that were attempted to approve
    console.log('\n📋 Recent Products Status:');
    const recentProducts = await pool.query(`
      SELECT id, title, status, seller_id, duration, 
             approved_at, auction_end_time, updated_at,
             rejection_reason
      FROM products
      ORDER BY updated_at DESC
      LIMIT 10
    `);
    
    console.log(`\nFound ${recentProducts.rows.length} recent products:\n`);
    recentProducts.rows.forEach((p, index) => {
      console.log(`${index + 1}. Product ID: ${p.id}`);
      console.log(`   Title: ${p.title}`);
      console.log(`   Status: ${p.status}`);
      console.log(`   Seller ID: ${p.seller_id || 'NULL (Company)'}`);
      console.log(`   Duration: ${p.duration || 'NULL'} days`);
      console.log(`   Approved At: ${p.approved_at || 'NULL'}`);
      console.log(`   Auction End: ${p.auction_end_time || 'NULL'}`);
      console.log(`   Updated At: ${p.updated_at}`);
      console.log(`   Rejection Reason: ${p.rejection_reason || 'NULL'}`);
      console.log('');
    });
    
    // Check pending products
    console.log('\n📋 Pending Products:');
    const pendingProducts = await pool.query(`
      SELECT id, title, status, seller_id, duration, created_at
      FROM products
      WHERE status = 'pending'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (pendingProducts.rows.length === 0) {
      console.log('   ✅ No pending products');
    } else {
      console.log(`   Found ${pendingProducts.rows.length} pending products:`);
      pendingProducts.rows.forEach(p => {
        console.log(`   - ID: ${p.id}, Title: ${p.title}, Seller: ${p.seller_id || 'Company'}`);
      });
    }
    
    // Check database constraints
    console.log('\n📋 Database Constraints Check:');
    const constraints = await pool.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
      AND table_name = 'products'
      AND constraint_type IN ('CHECK', 'NOT NULL')
    `);
    
    if (constraints.rows.length > 0) {
      console.log('   Constraints found:');
      constraints.rows.forEach(c => {
        console.log(`   - ${c.constraint_name}: ${c.constraint_type}`);
      });
    } else {
      console.log('   ✅ No problematic constraints found');
    }
    
    // Test query that approve endpoint uses
    console.log('\n🧪 Testing Approve Query Logic:');
    const testProductId = 139;
    
    const testProduct = await pool.query(`
      SELECT id, title, status, duration, seller_id
      FROM products
      WHERE id = $1
    `, [testProductId]);
    
    if (testProduct.rows.length > 0) {
      const product = testProduct.rows[0];
      console.log(`\n   Testing with Product ID: ${testProductId}`);
      console.log(`   Current Status: ${product.status}`);
      console.log(`   Duration: ${product.duration || 1}`);
      console.log(`   Seller ID: ${product.seller_id || 'NULL'}`);
      
      if (product.status === 'pending') {
        console.log('\n   ✅ Product is pending - can be approved');
        
        // Test the actual update query
        try {
          const testUpdate = await pool.query(`
            UPDATE products 
            SET status = 'approved', 
                rejection_reason = NULL,
                updated_at = CURRENT_TIMESTAMP,
                approved_at = CURRENT_TIMESTAMP,
                auction_end_time = CURRENT_TIMESTAMP + INTERVAL '1 day' * $2
            WHERE id = $1
            RETURNING id, status, approved_at, auction_end_time
          `, [testProductId, product.duration || 1]);
          
          if (testUpdate.rows.length > 0) {
            console.log('   ✅ Test update successful!');
            console.log(`   New Status: ${testUpdate.rows[0].status}`);
            console.log(`   Approved At: ${testUpdate.rows[0].approved_at}`);
            console.log(`   Auction End: ${testUpdate.rows[0].auction_end_time}`);
            
            // Rollback for testing
            await pool.query(`
              UPDATE products 
              SET status = 'pending',
                  approved_at = NULL,
                  auction_end_time = NULL
              WHERE id = $1
            `, [testProductId]);
            console.log('   ✅ Rolled back to pending status');
          }
        } catch (updateError) {
          console.error('   ❌ Test update failed:', updateError.message);
          console.error('   Error Code:', updateError.code);
          console.error('   Error Detail:', updateError.detail);
          console.error('   Error Constraint:', updateError.constraint);
        }
      } else {
        console.log(`   ⚠️  Product is ${product.status} - cannot approve`);
      }
    } else {
      console.log(`   ❌ Product ID ${testProductId} not found`);
    }
    
    console.log('\n✅ Monitoring complete!');
    
  } catch (error) {
    console.error('❌ Error monitoring:', error);
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    console.error('   Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

monitorLogs();




