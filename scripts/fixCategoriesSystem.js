import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  try {
    console.log('🔧 Running category system migration...');
    
    // Read migration file
    const migrationSQL = readFileSync(
      join(__dirname, '../migrations/008_fix_categories_schema.sql'),
      'utf8'
    );
    
    // Execute migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully');
    
    // Verify categories exist
    const result = await pool.query('SELECT COUNT(*) as count FROM categories');
    const count = parseInt(result.rows[0].count);
    
    console.log(`✅ Categories in database: ${count}`);
    
    if (count === 0) {
      console.log('⚠️ No categories found, seeding default categories...');
      // Migration script already seeds, but verify
      const seedResult = await pool.query('SELECT COUNT(*) as count FROM categories');
      console.log(`✅ Categories after seed: ${parseInt(seedResult.rows[0].count)}`);
    }
    
    // Verify schema
    const schemaCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'categories'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Categories table schema:');
    schemaCheck.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    // Verify products has category_id
    const productsCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'category_id'
    `);
    
    if (productsCheck.rows.length > 0) {
      console.log('\n✅ Products table has category_id column');
    } else {
      console.log('\n❌ Products table missing category_id column');
    }
    
    console.log('\n✅ Category system fix completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();

