/**
 * Phone Number Verification Helper Script
 * 
 * This script helps you verify phone numbers in Twilio Console
 * for trial accounts.
 * 
 * Usage: node src/scripts/verifyPhoneNumber.js
 */

console.log('📱 Twilio Phone Number Verification Guide\n');
console.log('=' .repeat(60));

console.log('\n⚠️  TRIAL ACCOUNT LIMITATION:');
console.log('   Trial accounts can only send OTPs to verified phone numbers.\n');

console.log('📋 Steps to Verify Phone Numbers:\n');

console.log('1. Go to Twilio Console:');
console.log('   https://console.twilio.com/us1/develop/phone-numbers/manage/verified\n');

console.log('2. Click "Add a new number" or "+"\n');

console.log('3. Enter your phone number in E.164 format:');
console.log('   Example: +9647700914000\n');

console.log('4. Twilio will send a verification code via SMS\n');

console.log('5. Enter the code to verify the number\n');

console.log('6. Once verified, you can send OTPs to this number\n');

console.log('=' .repeat(60));
console.log('\n💡 Quick Links:');
console.log('   • Verify Numbers: https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
console.log('   • Account Dashboard: https://console.twilio.com/');
console.log('   • Upgrade Account: https://console.twilio.com/us1/develop/billing/overview\n');

console.log('📝 Common Phone Number Formats:');
console.log('   ✅ Correct: +9647700914000');
console.log('   ✅ Correct: +9647501234567');
console.log('   ❌ Wrong: 07700914000 (missing country code)');
console.log('   ❌ Wrong: 9647700914000 (missing + sign)');
console.log('   ❌ Wrong: 009647700914000 (wrong format)\n');

console.log('🔍 To check which numbers are verified:');
console.log('   1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
console.log('   2. You will see a list of all verified numbers\n');

console.log('🚀 After verifying, test OTP sending:');
console.log('   curl -X POST http://localhost:5000/api/auth/send-otp \\');
console.log('     -H "Content-Type: application/json" \\');
console.log('     -d \'{"phone": "+9647700914000"}\'\n');

