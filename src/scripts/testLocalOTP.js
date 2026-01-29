
import axios from 'axios';

async function testLocalBackendOTP() {
    const phone = '+9647700914000';
    console.log(`🔌 Connecting to Local Backend to send OTP to ${phone}...`);

    try {
        const response = await axios.post('http://localhost:5000/api/auth/send-otp', {
            phone: phone
        });

        console.log('✅ Response Received:');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Request Failed:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

testLocalBackendOTP();
