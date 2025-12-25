import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function fixSuperadminPhone() {
    const client = await pool.connect();
    try {
        console.log('🔌 Connected to database...');

        const TARGET_PHONE = '+9647500914000';
        const FARE_PHONE = '+9647900914000';

        // 1. Check if TARGET_PHONE is already taken by a non-superadmin
        console.log(`🔍 Checking for conflicts with ${TARGET_PHONE}...`);
        const conflictRes = await client.query(
            `SELECT * FROM users WHERE phone = $1`,
            [TARGET_PHONE]
        );

        if (conflictRes.rows.length > 0) {
            const conflictUser = conflictRes.rows[0];
            console.log(`⚠️ Found user with ${TARGET_PHONE}: ID=${conflictUser.id}, Role=${conflictUser.role}`);

            if (conflictUser.role !== 'superadmin') {
                console.log('❌ User is NOT superadmin. Deleting to resolve conflict...');
                await client.query(`DELETE FROM users WHERE id = $1`, [conflictUser.id]);
                console.log('✅ Conflict resolved.');
            } else {
                console.log('✅ Matches Superadmin. No action needed for conflict.');
            }
        } else {
            console.log('✅ Target phone is free.');
        }

        // 2. Find the Superadmin
        console.log('🔍 Locating Superadmin account...');
        const superadminRes = await client.query(
            `SELECT * FROM users WHERE role = 'superadmin' LIMIT 1`
        );

        if (superadminRes.rows.length === 0) {
            console.error('❌ No Superadmin found!');
            return;
        }

        const superadmin = superadminRes.rows[0];
        console.log(`👤 Found Superadmin: ID=${superadmin.id}, Phone=${superadmin.phone}`);

        // 3. Update Superadmin phone if needed
        if (superadmin.phone !== TARGET_PHONE) {
            console.log(`🔄 Updating Superadmin phone to ${TARGET_PHONE}...`);
            await client.query(
                `UPDATE users SET phone = $1, updated_at = NOW() WHERE id = $2`,
                [TARGET_PHONE, superadmin.id]
            );
            console.log('✅ Superadmin phone number force-updated successfully.');
        } else {
            console.log('✅ Superadmin already has the correct phone number.');
        }

        // 4. Cleanup Fake Phone if it exists (and wasn't the superadmin)
        const fakeRes = await client.query(
            `SELECT * FROM users WHERE phone = $1 AND id != $2`,
            [FARE_PHONE, superadmin.id]
        );

        if (fakeRes.rows.length > 0) {
            console.log(`🧹 Removing fake phone user (${FARE_PHONE})...`);
            await client.query(`DELETE FROM users WHERE phone = $1`, [FARE_PHONE]);
            console.log('✅ Fake phone removed.');
        }

    } catch (err) {
        console.error('❌ Error fixing phone:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

fixSuperadminPhone();
