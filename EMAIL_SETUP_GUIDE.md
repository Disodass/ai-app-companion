# 📧 Email System Setup Guide

This guide will help you set up the complete email system to receive emails from people at `connect@bestibule.ca`.

## 🎯 **What We're Setting Up:**

1. **Resend Webhook** - To receive incoming emails
2. **Email Forwarding** - From your domain to Resend
3. **Inbox System** - To read and reply to emails

## 📋 **Step-by-Step Setup:**

### **Step 1: Resend Webhook Configuration**

1. **Go to Resend Dashboard:**
   - Visit: https://resend.com/webhooks
   - Sign in with your account

2. **Create New Webhook:**
   - Click "Create Webhook"
   - **Endpoint URL:** `https://yourdomain.com/api/webhook-incoming`
   - **Events:** Select "Email Received"
   - **Secret:** Generate a random secret key

3. **Note the Webhook Details:**
   - Webhook URL: `https://yourdomain.com/api/webhook-incoming`
   - Secret Key: `[your-secret-key]`

### **Step 2: Domain Email Forwarding**

1. **Go to your domain registrar** (where you bought bestibule.ca)

2. **Set up Email Forwarding:**
   - **From:** `connect@bestibule.ca`
   - **To:** `your-resend-email@resend.com`
   - Or use Resend's email forwarding service

3. **Alternative: Use Resend's Email API:**
   - Go to Resend Dashboard → Domains
   - Add `bestibule.ca` as a domain
   - Configure MX records as instructed

### **Step 3: Test the Setup**

1. **Send a test email:**
   - From: `your-email@example.com`
   - To: `connect@bestibule.ca`
   - Subject: `Test Email`
   - Content: `This is a test email to verify the system works.`

2. **Check your inbox:**
   - Go to your app → Email Management → Inbox
   - You should see the test email appear

### **Step 4: Production Deployment**

1. **Deploy your app** to a hosting service (Vercel, Netlify, etc.)

2. **Update webhook URL:**
   - Change webhook URL to your production domain
   - Test with a real email

## 🛠️ **Development Testing:**

For now, you can test the system using the "Add Test Email" button in the inbox.

## 📞 **Support:**

If you need help with any step, let me know and I can guide you through it!

## 🔧 **Technical Details:**

- **Webhook Endpoint:** `/api/webhook-incoming`
- **Inbox Collection:** `email_inbox` in Firestore
- **Reply System:** Uses Resend API for sending replies
- **Email Threading:** Supports conversation history

---

**Ready to start? Let me know which step you'd like to tackle first!**

