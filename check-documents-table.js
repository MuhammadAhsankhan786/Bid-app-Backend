/**
 * Check Documents Table Schema
 */

import pool from './src/config/db.js';

async function checkDocumentsTable() {
  try {
    console.log('🔍 Checking Documents Table...\n');
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'documents'
      )
    `);
    
    console.log(`Table exists: ${tableCheck.rows[0].exists}\n`);
    
    if (tableCheck.rows[0].exists) {
      // Get all columns
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'documents'
        ORDER BY ordinal_position
      `);
      
      console.log('Columns:');
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      });
      
      // Test query
      console.log('\n📋 Testing query...');
      try {
        const result = await pool.query(`
          SELECT d.*, p.title as product_title
          FROM documents d
          LEFT JOIN products p ON d.product_id = p.id
          WHERE d.product_id = $1
          LIMIT 1
        `, [132]);
        console.log(`✅ Query successful: ${result.rows.length} rows`);
      } catch (error) {
        console.log(`❌ Query failed: ${error.message}`);
        console.log(`   Code: ${error.code}`);
        console.log(`   Detail: ${error.detail}`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDocumentsTable();

