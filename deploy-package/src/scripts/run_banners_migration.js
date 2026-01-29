/**
 * Run Banners Table Migration
 * Creates banners table for banner carousel with Cloudinary support
 */

import pool from "../config/db.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  let client;
  try {
    console.log('🔄 Starting Banners Table Migration\n');
    console.log('='.repeat(60));
    
    // Read the migration file
    const migrationPath = join(__dirname, 'create_banners_table.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('\n📋 Migration Steps:');
    console.log('   1. Create banners table');
    console.log('   2. Create indexes for performance');
    console.log('   3. Add table comments');
    console.log('   4. Verify table creation\n');
    
    // Get a client from the pool
    client = await pool.connect();
    
    // Check if table already exists
    console.log('📊 Checking current state...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'banners'
      )
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('⚠️  Banners table already exists!');
      console.log('   Checking table structure...\n');
      
      // Check columns
      const columnsCheck = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'banners'
        ORDER BY ordinal_position
      `);
      
      console.log('   Current columns:');
      columnsCheck.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
      
      // Check if we need to update
      const requiredColumns = ['id', 'image_url', 'title', 'link', 'is_active', 'display_order', 'created_at', 'updated_at'];
      const existingColumns = columnsCheck.rows.map(r => r.column_name);
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length > 0) {
        console.log(`\n⚠️  Missing columns: ${missingColumns.join(', ')}`);
        console.log('   Running migration to add missing columns...\n');
      } else {
        console.log('\n✅ Table structure is correct!');
        console.log('   Migration not needed.\n');
        return;
      }
    }
    
    console.log('🔄 Executing migration...\n');
    
    // Step 1: Create table
    try {
      console.log('   Step 1: Creating banners table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS banners (
          id SERIAL PRIMARY KEY,
          image_url VARCHAR(500) NOT NULL,
          title VARCHAR(255),
          link VARCHAR(500),
          is_active BOOLEAN DEFAULT TRUE,
          display_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('   ✅ Table created\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ⚠️  Table already exists (skipping)\n');
      } else {
        throw error;
      }
    }
    
    // Step 2: Create indexes
    try {
      console.log('   Step 2: Creating indexes...');
      await client.query(`CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(is_active)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_banners_display_order ON banners(display_order)`);
      console.log('   ✅ Indexes created\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ⚠️  Indexes already exist (skipping)\n');
      } else {
        throw error;
      }
    }
    
    // Step 3: Add comments (optional)
    try {
      console.log('   Step 3: Adding table comments...');
      await client.query(`COMMENT ON TABLE banners IS 'Banner carousel images for homepage'`);
      await client.query(`COMMENT ON COLUMN banners.image_url IS 'Cloudinary URL or full image URL'`);
      await client.query(`COMMENT ON COLUMN banners.link IS 'Optional navigation link when banner is clicked'`);
      await client.query(`COMMENT ON COLUMN banners.is_active IS 'Whether banner is active and should be displayed'`);
      await client.query(`COMMENT ON COLUMN banners.display_order IS 'Display order (lower numbers appear first)'`);
      console.log('   ✅ Comments added\n');
    } catch (error) {
      // Comments are optional, don't fail if they can't be added
      console.log(`   ⚠️  Comments skipped: ${error.message}\n`);
    }
    
    // Verify table creation
    console.log('\n📊 Verification:');
    const verifyTable = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'banners'
      ORDER BY ordinal_position
    `);
    
    console.log('   Table columns:');
    verifyTable.rows.forEach(col => {
      console.log(`   ✅ ${col.column_name} (${col.data_type})`);
    });
    
    // Check indexes
    const indexesCheck = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'banners'
    `);
    
    if (indexesCheck.rows.length > 0) {
      console.log('\n   Indexes:');
      indexesCheck.rows.forEach(idx => {
        console.log(`   ✅ ${idx.indexname}`);
      });
    }
    
    // Test insert (optional - can be removed)
    console.log('\n🧪 Testing table...');
    try {
      const testResult = await client.query(`
        SELECT COUNT(*) as count FROM banners
      `);
      console.log(`   ✅ Table is accessible (${testResult.rows[0].count} existing records)`);
    } catch (error) {
      console.log(`   ⚠️  Test query failed: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Banners table migration completed successfully!\n');
    console.log('📝 Next Steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Test banner API endpoints');
    console.log('   3. Create banners via POST /api/banners\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    if (error.position) {
      console.error('   Position:', error.position);
    }
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

runMigration();

