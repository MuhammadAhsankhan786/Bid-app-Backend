/**
 * Debug Script: Check User ID 50 and Moderators
 */

import pool from './src/config/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkUsers() {
    try {
        console.log('🔍 Checking User ID 50...');
        const user50 = await pool.query("SELECT id, name, email, phone, role, status FROM users WHERE id = $1", [50]);
        if (user50.rows.length === 0) {
            console.log('❌ User 50 NOT FOUND');
        } else {
            console.log('✅ User 50 found:', user50.rows[0]);
        }

        // console.log('\n🔍 Listing All Moderators:');
        // const mods = await pool.query("SELECT id, name, email, phone, role, status FROM users WHERE role = 'moderator'");
        // console.log(JSON.stringify(mods.rows, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        pool.end();
    }
}

checkUsers();
