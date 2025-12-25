/**
 * Test Script: Superadmin Updating Moderator Phone
 * 
 * Verifies that a Superadmin can update a Moderator's phone number 
 * using the /users/:id/change-admin-phone endpoint.
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { normalizeIraqPhone } from './src/utils/phoneUtils.js';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api';
const ADMIN_PHONE = '+9647500914000'; // Superadmin phone
const ADMIN_PASSWORD = 'admin123'; // Hardcoded for verification

// Colors
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};
function log(msg, color = 'reset') { console.log(`${colors[color]}${msg}${colors.reset}`); }

async function runTest() {
    try {
        log('🚀 Starting Moderator Phone Update Test...', 'cyan');

        // 1. Login as Superadmin
        log('\n🔐 Logging in as Superadmin...', 'blue');
        const loginRes = await axios.post(`${BASE_URL}/auth/admin-login`, {
            phone: ADMIN_PHONE,
            role: 'superadmin'
        });
        const token = loginRes.data.token || loginRes.data.accessToken;
        log('✅ Login successful', 'green');

        // 2. Find a Moderator
        log('\n🔍 Finding a Moderator...', 'blue');
        const usersRes = await axios.get(`${BASE_URL}/admin/users`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { limit: 100 }
        });

        // Look for a moderator
        let moderator = usersRes.data.users.find(u => u.role === 'moderator');

        // If no moderator, try to finding one manually or warn
        if (!moderator) {
            log('⚠️ No moderator found in list. Trying to find hardcoded moderator...', 'yellow');
            moderator = usersRes.data.users.find(u => u.phone === '+9647800914000');
        }

        if (!moderator) {
            log('❌ No moderator found to test with. Please create a moderator first.', 'red');
            return;
        }

        log(`✅ Found Moderator: ${moderator.name} (${moderator.phone}) - ID: ${moderator.id}`, 'green');

        // 3. Update Moderator Phone
        const newPhone = '+9647800914999'; // Test number
        log(`\n📞 Updating Moderator phone to ${newPhone}...`, 'blue');

        const updateRes = await axios.put(
            `${BASE_URL}/admin/users/${moderator.id}/change-admin-phone`,
            {
                phone: newPhone,
                confirmPassword: ADMIN_PASSWORD
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        log(`✅ Update successful! Message: ${updateRes.data.message}`, 'green');

        // 4. Verify Update
        if (updateRes.data.user.phone === newPhone) {
            log('\n🎉 TEST PASSED: Moderator phone validated in response.', 'green');

            // 5. Revert Changes
            log(`\n↺ Reverting Moderator phone to original ${moderator.phone}...`, 'blue');
            await axios.put(
                `${BASE_URL}/admin/users/${moderator.id}/change-admin-phone`,
                {
                    phone: moderator.phone,
                    confirmPassword: ADMIN_PASSWORD
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            log('✅ Revert successful', 'green');
        } else {
            log('\n❌ TEST FAILED: Response phone does not match.', 'red');
        }

    } catch (error) {
        if (error.response) {
            console.log('\n❌ API Error Response:', error.response.data);
        }
        log(`\n❌ TEST FAILED: ${error.message}`, 'red');
    }
}

runTest();
