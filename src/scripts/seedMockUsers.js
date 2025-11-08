import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Seed Mock Admin Users for Phone-Based Login
 * Ensures Super Admin, Moderator, and Viewer users exist with mock phone numbers
 */

const mockUsers = [
  {
    phone: '+9647701234567',
    name: 'Super Admin',
    role: 'superadmin',
    email: 'superadmin@bidmaster.com',
    status: 'approved'
  },
  {
    phone: '+9647701234568',
    name: 'Moderator User',
    role: 'moderator',
    email: 'moderator@bidmaster.com',
    status: 'approved'
  },
  {
    phone: '+9647701234569',
    name: 'Viewer User',
    role: 'viewer',
    email: 'viewer@bidmaster.com',
    status: 'approved'
  }
];

async function seedMockUsers() {
  try {
    console.log('🌱 Starting mock users seed...\n');
    console.log('🔌 Connecting to database...\n');

    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    let insertedCount = 0;
    let existingCount = 0;

    for (const user of mockUsers) {
      try {
        // Check if user exists by phone number
        const existingUser = await pool.query(
          'SELECT id, name, phone, role FROM users WHERE phone = $1',
          [user.phone]
        );

        if (existingUser.rows.length > 0) {
          // User exists - verify role and name match
          const existing = existingUser.rows[0];
          
          const needsUpdate = existing.role !== user.role || existing.name !== user.name;
          
          if (needsUpdate) {
            // Update role and/or name if they don't match
            await pool.query(
              'UPDATE users SET role = $1, name = $2 WHERE phone = $3',
              [user.role, user.name, user.phone]
            );
            const updates = [];
            if (existing.role !== user.role) updates.push(`role: ${existing.role} → ${user.role}`);
            if (existing.name !== user.name) updates.push(`name: ${existing.name} → ${user.name}`);
            console.log(`🔄 Updated ${user.name} (${user.phone}): ${updates.join(', ')}`);
          } else {
            console.log(`✅ ${user.name} exists (${user.phone}) - role: ${user.role}`);
            existingCount++;
          }
        } else {
          // User doesn't exist - insert new user
          // Password is required (NOT NULL), use empty string since login is via OTP
          const result = await pool.query(
            `INSERT INTO users (name, email, phone, role, status, password, created_at)
             VALUES ($1, $2, $3, $4, $5, '', NOW())
             RETURNING id, name, phone, role`,
            [user.name, user.email, user.phone, user.role, user.status]
          );

          const inserted = result.rows[0];
          console.log(`🆕 Inserted missing user: ${inserted.name} (${inserted.phone}) - role: ${inserted.role}`);
          insertedCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing ${user.name}:`, error.message);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Existing users: ${existingCount}`);
    console.log(`   🆕 New users inserted: ${insertedCount}`);
    console.log(`   📝 Total users checked: ${mockUsers.length}\n`);

    // Verification: Query all mock users
    console.log('🔍 Verifying mock users in database...\n');
    const verification = await pool.query(
      `SELECT name, phone, role, status 
       FROM users 
       WHERE phone IN ($1, $2, $3)
       ORDER BY role`,
      [mockUsers[0].phone, mockUsers[1].phone, mockUsers[2].phone]
    );

    if (verification.rows.length === mockUsers.length) {
      console.log('✅ All mock users verified:\n');
      console.table(verification.rows.map(row => ({
        Name: row.name,
        Phone: row.phone,
        Role: row.role,
        Status: row.status
      })));
      console.log('\n✅ Mock users seeded successfully!');
      console.log('   Super Admin, Moderator, and Viewer are now available for phone-based login.\n');
    } else {
      console.warn(`⚠️  Warning: Expected ${mockUsers.length} users, found ${verification.rows.length}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding mock users:', error);
    console.error('   Error details:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    await pool.end();
  }
}

// Run the seed function
seedMockUsers();

