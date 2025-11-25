#!/usr/bin/env node

/**
 * Email System Setup Script
 * This script helps you set up the email system for receiving emails
 */

console.log('📧 Bestibule Email System Setup');
console.log('================================\n');

console.log('🎯 What we need to set up:');
console.log('1. Resend webhook for receiving emails');
console.log('2. Email forwarding from connect@bestibule.ca');
console.log('3. Test the complete flow\n');

console.log('📋 Step-by-step instructions:');
console.log('');

console.log('STEP 1: Resend Webhook Setup');
console.log('----------------------------');
console.log('1. Go to: https://resend.com/webhooks');
console.log('2. Click "Create Webhook"');
console.log('3. Set endpoint URL to: https://yourdomain.com/api/webhook-incoming');
console.log('4. Select event: "Email Received"');
console.log('5. Generate a secret key');
console.log('');

console.log('STEP 2: Domain Email Forwarding');
console.log('-------------------------------');
console.log('1. Go to your domain registrar (where you bought bestibule.ca)');
console.log('2. Set up email forwarding:');
console.log('   - From: connect@bestibule.ca');
console.log('   - To: your-resend-email@resend.com');
console.log('3. OR use Resend\'s domain setup in their dashboard');
console.log('');

console.log('STEP 3: Test the System');
console.log('-----------------------');
console.log('1. Go to your app: http://localhost:5173/admin/email/inbox');
console.log('2. Use the "Webhook Tester" to simulate incoming emails');
console.log('3. Send a real test email to connect@bestibule.ca');
console.log('');

console.log('STEP 4: Production Deployment');
console.log('-----------------------------');
console.log('1. Deploy your app to Vercel/Netlify/etc.');
console.log('2. Update webhook URL to your production domain');
console.log('3. Test with real emails');
console.log('');

console.log('🚀 Ready to start?');
console.log('Run: npm run dev');
console.log('Then go to: http://localhost:5173/admin/email/inbox');
console.log('');

console.log('📚 For detailed instructions, see: EMAIL_SETUP_GUIDE.md');
console.log('');

// Check if we're in development
if (process.env.NODE_ENV !== 'production') {
  console.log('🔧 Development Mode Detected');
  console.log('You can test the system using the Webhook Tester in the inbox!');
}

