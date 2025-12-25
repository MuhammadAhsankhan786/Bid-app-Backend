
import axios from 'axios';
import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Configure dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const API_URL = 'http://localhost:5000/api';
const ADMIN_PHONE_DEFAULT = process.env.ADMIN_PHONE || '+9647500914000';
const MODERATOR_PHONE_DEFAULT = process.env.MODERATOR_PHONE || '+9647800914000';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const TEMP_ADMIN_PHONE = '+9647500914999';
const TEMP_MODERATOR_PHONE = '+9647800914999';

const results = {
    success: false,
    logs: [],
    error: null
};

function log(msg) {
    console.log(msg);
    results.logs.push(msg);
}

function logError(msg) {
    console.error(msg);
    results.logs.push(`ERROR: ${msg}`);
}

async function login(phone, password) {
    try {
        // Admin Panel uses direct login with phone + role (no password/OTP for login itself)
        // Password is required for sensitive actions like changing phone
        const response = await axios.post(`${API_URL}/auth/admin-login`, {
            phone,
            role: 'superadmin' // Assuming we are logging in as superadmin context
        });
        return response.data.token || response.data.accessToken;
    } catch (error) {
        if (error.response) {
            logError(`❌ Login failed for ${phone}: ${error.response.status} - ${error.response.data.message || error.response.statusText}`);
        } else {
            logError(`❌ Login failed for ${phone}: ${error.message}`);
        }
        return null;
    }
}

async function getAdminId(phone) {
    const result = await pool.query("SELECT id FROM users WHERE phone = $1", [phone]);
    return result.rows[0]?.id;
}

async function changePhone(token, userId, newPhone, confirmPassword) {
    try {
        const response = await axios.put(
            `${API_URL}/admin/users/${userId}/change-admin-phone`,
            {
                phone: newPhone,
                confirmPassword: confirmPassword
            },
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        return response.data;
    } catch (error) {
        logError(`❌ Change phone failed: ${error.response?.data?.error || error.message}`);
        throw error;
    }
}

async function runVerification() {
    log('🚀 Starting Admin/Moderator Phone Change Verification...');
    log(`📋 Config:
    - Superadmin Phone: ${ADMIN_PHONE_DEFAULT}
    - Moderator Phone:  ${MODERATOR_PHONE_DEFAULT}
  `);

    try {
        // 1. Initial Check & Cleanup
        log('\n🔍 [1/6] Checking Database State...');
        await pool.query("UPDATE users SET phone = $1 WHERE phone = $2", [ADMIN_PHONE_DEFAULT, TEMP_ADMIN_PHONE]);
        await pool.query("UPDATE users SET phone = $1 WHERE phone = $2", [MODERATOR_PHONE_DEFAULT, TEMP_MODERATOR_PHONE]);

        let superAdminId = await getAdminId(ADMIN_PHONE_DEFAULT);
        if (!superAdminId) {
            log('⚠️ Superadmin not found with default phone. Checking by role...');
            const saRes = await pool.query("SELECT id, phone FROM users WHERE role = 'superadmin' LIMIT 1");
            if (saRes.rows.length > 0) {
                log(`ℹ️ Found Superadmin with phone ${saRes.rows[0].phone}. Updating to default...`);
                superAdminId = saRes.rows[0].id;
                await pool.query("UPDATE users SET phone = $1 WHERE id = $2", [ADMIN_PHONE_DEFAULT, superAdminId]);
            } else {
                throw new Error("Superadmin not found in database!");
            }
        }
        log(`✅ Superadmin confirmed (ID: ${superAdminId})`);

        let moderatorId = await getAdminId(MODERATOR_PHONE_DEFAULT);
        if (!moderatorId) {
            log('⚠️ Moderator not found with default phone. Creating/Updating...');
            const modRes = await pool.query("SELECT id FROM users WHERE role = 'moderator' LIMIT 1");
            if (modRes.rows.length > 0) {
                moderatorId = modRes.rows[0].id;
                await pool.query("UPDATE users SET phone = $1 WHERE id = $2", [MODERATOR_PHONE_DEFAULT, moderatorId]);
                log(`✅ Updated existing moderator to default phone.`);
            } else {
                throw new Error("Moderator not found. Please create a moderator first.");
            }
        }
        log(`✅ Moderator confirmed (ID: ${moderatorId})`);

        // 2. Login
        log('\n🔑 [2/6] Logging in as Superadmin...');
        const token = await login(ADMIN_PHONE_DEFAULT, ADMIN_PASSWORD);
        if (!token) throw new Error("Failed to login as Superadmin");
        log('✅ Login successful');

        // 3. Test Moderator Phone Change
        log('\n🧪 [3/6] Testing Moderator Phone: Default -> Temp');
        await changePhone(token, moderatorId, TEMP_MODERATOR_PHONE, ADMIN_PASSWORD);

        let modCheck = await pool.query("SELECT phone FROM users WHERE id = $1", [moderatorId]);
        if (modCheck.rows[0].phone !== TEMP_MODERATOR_PHONE) throw new Error("DB verification failed for Moderator temp phone");
        log('✅ Moderator phone changed successfully');

        // 4. Test Moderator Phone Revert
        log('\n🧪 [4/6] Testing Moderator Phone: Temp -> Default');
        await changePhone(token, moderatorId, MODERATOR_PHONE_DEFAULT, ADMIN_PASSWORD);

        modCheck = await pool.query("SELECT phone FROM users WHERE id = $1", [moderatorId]);
        if (modCheck.rows[0].phone !== MODERATOR_PHONE_DEFAULT) throw new Error("DB verification failed for Moderator default phone");
        log('✅ Moderator phone reverted successfully');

        // 5. Test Superadmin Phone Change
        log('\n🧪 [5/6] Testing Superadmin Phone: Default -> Temp');
        await changePhone(token, superAdminId, TEMP_ADMIN_PHONE, ADMIN_PASSWORD);

        let adminCheck = await pool.query("SELECT phone FROM users WHERE id = $1", [superAdminId]);
        if (adminCheck.rows[0].phone !== TEMP_ADMIN_PHONE) throw new Error("DB verification failed for Superadmin temp phone");
        log('✅ Superadmin phone changed successfully');

        log('   Testing login with new Admin phone...');
        const newToken = await login(TEMP_ADMIN_PHONE, ADMIN_PASSWORD);
        if (!newToken) throw new Error("Could not login with new Admin phone number");
        log('✅ Login with new Admin phone successful');

        // 6. Test Superadmin Phone Revert
        log('\n🧪 [6/6] Testing Superadmin Phone: Temp -> Default');
        await changePhone(newToken, superAdminId, ADMIN_PHONE_DEFAULT, ADMIN_PASSWORD);

        adminCheck = await pool.query("SELECT phone FROM users WHERE id = $1", [superAdminId]);
        if (adminCheck.rows[0].phone !== ADMIN_PHONE_DEFAULT) throw new Error("DB verification failed for Superadmin default phone");
        log('✅ Superadmin phone reverted successfully');

        log('\n🎉 ALL TESTS PASSED!');
        results.success = true;

    } catch (error) {
        logError(`\n❌ TEST FAILED: ${error.message}`);
        if (error.response) logError(`Response: ${JSON.stringify(error.response.data)}`);
        results.error = error.message;
        process.exitCode = 1;
    } finally {
        log('\n🧹 Final Cleanup...');
        try {
            if (process.env.ADMIN_PHONE) {
                await pool.query("UPDATE users SET phone = $1 WHERE phone = $2", [process.env.ADMIN_PHONE, TEMP_ADMIN_PHONE]);
                const checkDefault = await pool.query("SELECT id FROM users WHERE phone = $1", [process.env.ADMIN_PHONE]);
                if (checkDefault.rows.length === 0) {
                    await pool.query("UPDATE users SET phone = $1 WHERE role = 'superadmin'", [process.env.ADMIN_PHONE]);
                }
            }
            if (process.env.MODERATOR_PHONE) {
                await pool.query("UPDATE users SET phone = $1 WHERE phone = $2", [process.env.MODERATOR_PHONE, TEMP_MODERATOR_PHONE]);
                const checkDefaultMod = await pool.query("SELECT id FROM users WHERE phone = $1", [process.env.MODERATOR_PHONE]);
                if (checkDefaultMod.rows.length === 0) {
                    await pool.query("UPDATE users SET phone = $1 WHERE id = (SELECT id FROM users WHERE role = 'moderator' LIMIT 1)", [process.env.MODERATOR_PHONE]);
                }
            }
            log('✅ Defaults enforced.');
        } catch (cleanupError) {
            logError(`⚠️ Cleanup failed: ${cleanupError.message}`);
        }

        // WRITE JSON RESULT
        fs.writeFileSync('result.json', JSON.stringify(results, null, 2), 'utf8');

        await pool.end();
        if (process.exitCode === 1) process.exit(1);
    }
}

runVerification();
