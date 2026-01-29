import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Update ALL admin roles (Super Admin, Moderator, Viewer) to use verified Twilio number
 * This allows admin panel login with the verified Twilio number for all roles
 */

const VERIFIED_TWILIO_NUMBER = '+9647700914000';
const ADMIN_ROLES = ['superadmin', 'moderator', 'viewer'];

async function updateAllAdminPhones() {
  try {
    console.log('🔄 Updating all admin roles to verified Twilio number...\n');
    console.log('🔌 Connecting to database...\n');

    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    let updatedCount = 0;
    let createdCount = 0;

    for (const role of ADMIN_ROLES) {
      try {
        // Check if user exists for this role
        const existingUser = await pool.query(
          'SELECT id, name, phone, role FROM users WHERE role = $1 LIMIT 1',
          [role]
        );

        if (existingUser.rows.length > 0) {
          const user = existingUser.rows[0];
          const oldPhone = user.phone;
          
          if (oldPhone === VERIFIED_TWILIO_NUMBER) {
            console.log(`✅ ${user.name} (${role}) already has verified number: ${user.phone}`);
          } else {
            // Update phone number
            await pool.query(
              'UPDATE users SET phone = $1 WHERE id = $2',
              [VERIFIED_TWILIO_NUMBER, user.id]
            );

            console.log(`🔄 Updated ${user.name} (${role}):`);
            console.log(`   Old: ${oldPhone}`);
            console.log(`   New: ${VERIFIED_TWILIO_NUMBER}\n`);
            updatedCount++;
          }
        } else {
          // Create new user for this role
          const roleNames = {
            'superadmin': 'Super Admin',
            'moderator': 'Moderator User',
            'viewer': 'Viewer User'
          };
          
          const roleEmails = {
            'superadmin': 'superadmin@bidmaster.com',
            'moderator': 'moderator@bidmaster.com',
            'viewer': 'viewer@bidmaster.com'
          };

          const result = await pool.query(
            `INSERT INTO users (name, email, phone, role, status, password, created_at)
             VALUES ($1, $2, $3, $4, $5, '', NOW())
             RETURNING id, name, phone, role`,
            [roleNames[role], roleEmails[role], VERIFIED_TWILIO_NUMBER, role, 'approved']
          );

          const newUser = result.rows[0];
          console.log(`🆕 Created ${newUser.name} (${role}):`);
          console.log(`   Phone: ${newUser.phone}\n`);
          createdCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing ${role}:`, error.message);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   🔄 Updated: ${updatedCount}`);
    console.log(`   🆕 Created: ${createdCount}`);
    console.log(`   📝 Total roles: ${ADMIN_ROLES.length}\n`);

    // Verification: Query all admin users
    console.log('🔍 Verifying all admin users...\n');
    const verification = await pool.query(
      `SELECT name, phone, role, status 
       FROM users 
       WHERE role IN ($1, $2, $3)
       ORDER BY role`,
      ADMIN_ROLES
    );

    if (verification.rows.length > 0) {
      console.log('✅ All admin users verified:\n');
      console.table(verification.rows.map(row => ({
        Name: row.name,
        Phone: row.phone,
        Role: row.role,
        Status: row.status
      })));
      console.log('\n');
      
      // Check if all use verified number
      const allVerified = verification.rows.every(row => row.phone === VERIFIED_TWILIO_NUMBER);
      if (allVerified) {
        console.log('✅ All admin roles now use verified Twilio number!');
        console.log(`   Phone: ${VERIFIED_TWILIO_NUMBER}\n`);
        console.log('✅ You can now login to Admin Panel with this number for all roles.\n');
      } else {
        console.warn('⚠️  Warning: Some admin users do not have verified number');
      }
    } else {
      console.warn('⚠️  Warning: No admin users found');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating admin phones:', error);
    console.error('   Error details:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the update function
updateAllAdminPhones();

