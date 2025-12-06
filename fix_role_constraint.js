import pool from "./src/config/db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n========================================');
console.log('🔧 Database Role Constraint Fix');
console.log('========================================\n');

async function fixRoleConstraint() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Connected to Neon PostgreSQL\n');

    // Read SQL file
    const sqlFile = path.join(__dirname, 'fix_role_constraint.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Remove comments and split SQL into individual statements
    const cleanSql = sql
      .split('\n')
      .map(line => {
        // Remove single-line comments
        const commentIndex = line.indexOf('--');
        if (commentIndex >= 0) {
          return line.substring(0, commentIndex);
        }
        return line;
      })
      .join('\n');

    // Split by semicolon and filter empty statements
    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.match(/^\s*$/));

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip very short statements (likely empty after cleaning)
      if (statement.length < 5) continue;

      try {
        // Check if it's a SELECT (query) or DDL/DML (command)
        const trimmed = statement.trim().toUpperCase();
        const isQuery = trimmed.startsWith('SELECT');
        
        if (isQuery) {
          // For SELECT queries, show results
          const result = await client.query(statement);
          if (result.rows && result.rows.length > 0) {
            console.log(`📊 Query ${i + 1} Result:`);
            console.table(result.rows);
            console.log('');
          } else {
            console.log(`📊 Query ${i + 1}: No rows returned\n`);
          }
        } else {
          // For DDL/DML commands, execute and show what was done
          const commandType = trimmed.split(' ')[0];
          await client.query(statement);
          console.log(`✅ ${commandType} statement ${i + 1} executed successfully`);
        }
      } catch (error) {
        // Ignore "constraint does not exist" errors (expected when dropping)
        if (error.message.includes('does not exist') && statement.includes('DROP CONSTRAINT')) {
          console.log(`⚠️  Constraint already dropped (expected - safe to ignore)`);
          continue;
        }
        // Ignore "constraint already exists" errors
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Constraint already exists (expected - safe to ignore)`);
          continue;
        }
        console.error(`\n❌ Error in statement ${i + 1}:`);
        console.error(`   SQL: ${statement.substring(0, 100)}...`);
        console.error(`   Error: ${error.message}\n`);
        throw error;
      }
    }

    console.log('\n✅ Database fix completed successfully!');
    console.log('   - Old constraint removed');
    console.log('   - New constraint added');
    console.log('   - Old roles updated (if any)\n');

  } catch (error) {
    console.error('\n❌ Error fixing database constraint:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    console.error('\n');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the fix
fixRoleConstraint();

