import pool from "../config/db.js";

const requiredTables = [
  'users',
  'products',
  'categories',
  'bids',
  'orders',
  'notifications'
];

const requiredProductColumns = [
  'id',
  'seller_id',
  'title',
  'description',
  'image_url',
  'status',
  'created_at',
  'category_id',
  'starting_price',
  'starting_bid',
  'current_price',
  'current_bid',
  'auction_end_time',
  'total_bids',
  'highest_bidder_id'
];

async function verifyDatabaseSchema() {
  console.log('🔍 Verifying database schema...\n');

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection: SUCCESS\n');

    // Check tables
    console.log('📋 Checking required tables...');
    const missingTables = [];
    
    for (const table of requiredTables) {
      try {
        const result = await pool.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )`,
          [table]
        );
        
        if (result.rows[0].exists) {
          console.log(`  ✅ ${table} table exists`);
        } else {
          console.log(`  ❌ ${table} table MISSING`);
          missingTables.push(table);
        }
      } catch (error) {
        console.log(`  ❌ Error checking ${table}: ${error.message}`);
        missingTables.push(table);
      }
    }

    if (missingTables.length > 0) {
      console.log(`\n⚠️  Missing tables: ${missingTables.join(', ')}`);
      console.log('   Run migrations to create missing tables:\n');
      console.log('   psql $DATABASE_URL -f migrations/005_create_complete_schema.sql\n');
    } else {
      console.log('\n✅ All required tables exist\n');
    }

    // Check products table columns
    console.log('📋 Checking products table columns...');
    const missingColumns = [];
    
    for (const column of requiredProductColumns) {
      try {
        const result = await pool.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'products' 
            AND column_name = $1
          )`,
          [column]
        );
        
        if (result.rows[0].exists) {
          console.log(`  ✅ products.${column} column exists`);
        } else {
          console.log(`  ❌ products.${column} column MISSING`);
          missingColumns.push(column);
        }
      } catch (error) {
        console.log(`  ❌ Error checking products.${column}: ${error.message}`);
        missingColumns.push(column);
      }
    }

    if (missingColumns.length > 0) {
      console.log(`\n⚠️  Missing columns: ${missingColumns.join(', ')}`);
      console.log('   Run migration to add missing columns:\n');
      console.log('   psql $DATABASE_URL -f migrations/005_create_complete_schema.sql\n');
    } else {
      console.log('\n✅ All required product columns exist\n');
    }

    // Test a sample query
    console.log('🧪 Testing sample query...');
    try {
      const result = await pool.query(`
        SELECT 
          p.id, p.seller_id, p.title, p.status,
          COALESCE(c.name, 'Uncategorized') as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LIMIT 1
      `);
      console.log('  ✅ Sample query executed successfully');
      if (result.rows.length > 0) {
        console.log(`  📦 Found ${result.rows.length} sample product(s)`);
      } else {
        console.log('  ⚠️  No products found in database');
      }
    } catch (error) {
      console.log(`  ❌ Sample query failed: ${error.message}`);
      console.log(`     Error code: ${error.code}`);
      if (error.code === '42703') {
        console.log('     → Column does not exist in table');
      } else if (error.code === '42P01') {
        console.log('     → Table does not exist');
      }
    }

    console.log('\n✅ Database schema verification complete\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database verification failed:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

verifyDatabaseSchema();

