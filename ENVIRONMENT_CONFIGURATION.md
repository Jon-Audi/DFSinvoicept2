# Environment Configuration Guide - Production Deployment

## Overview
This document outlines all required environment variables and security configurations needed for production deployment.

## Critical Security Fixes Applied ✅

### 1. Removed Hardcoded Firebase Credentials
**File**: `src/components/firebase-provider.tsx`
- **Before**: Hardcoded production API keys as fallback values exposed in source code
- **After**: Requires all Firebase env vars to be explicitly set; fails fast if missing
- **Risk Mitigated**: Prevents API key extraction from compiled bundles

### 2. Hardened Firestore Security Rules
**File**: `firestore.rules`
- **Before**: Permissive `allow read, write: if request.auth != null;` (all authenticated users could read/write everything)
- **After**: Document-level access control with company ownership validation
- **Rules Implemented**:
  - Users can only read/write their own user document
  - Access to company documents requires ownership or membership
  - Invoices, estimates, orders restricted to company members
  - All other documents denied by default

### 3. Hardened Storage Security Rules
**File**: `storage.rules`
- **Before**: Unauthenticated public reads allowed on all storage
- **After**: All operations require authentication; organized by collection with size limits
- **Rules Implemented**:
  - Invoices: 50MB max per file
  - Images (customers/products): 5MB max per file
  - All other paths denied by default

### 4. Email Configuration Validation
**File**: `src/app/api/send-email/route.ts`
- **Before**: Fallback to demo email `onboarding@resend.dev`
- **After**: Requires proper FROM_EMAIL configuration; warns in production if missing
- **Impact**: Prevents accidental emails from demo address in production

---

## Required Environment Variables

### Firebase Configuration (Browser)
These must be set in `.env.local` or deployment platform:

```env
# Required - Get from Firebase Console > Project Settings > General
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Optional but recommended
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

**Deployment Platforms**:
- **Vercel**: Set in Project Settings > Environment Variables
- **Firebase Hosting**: Set in `.env` or `.env.local` before build
- **Docker**: Pass as build arguments or in runtime environment

### Email Service (Server-side)
```env
# Required for email functionality
RESEND_API_KEY=re_your-api-key
FROM_EMAIL=noreply@yourdomain.com
```

### Application Configuration
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Optional: Analytics
```env
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your-analytics-id
```

---

## Pre-Deployment Checklist

### Firebase Setup
- [ ] Firebase project created and configured
- [ ] Authentication enabled (Email/Password or OAuth)
- [ ] Firestore database created (production mode)
- [ ] Storage bucket created
- [ ] Service account key generated for admin operations
- [ ] Firebase security rules deployed (see below)

### Firestore Security Rules Deployment
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy rules
firebase deploy --only firestore:rules

# Verify deployment
firebase rules:list
```

### Storage Rules Deployment
```bash
# Deploy storage rules
firebase deploy --only storage

# Verify deployment
firebase rules:list
```

### Environment Variables
- [ ] All NEXT_PUBLIC_FIREBASE_* variables set in deployment platform
- [ ] FROM_EMAIL configured for production domain
- [ ] RESEND_API_KEY configured if using email features
- [ ] NODE_ENV set to `production`
- [ ] NEXT_PUBLIC_APP_URL set to production domain

### Security Verification
- [ ] Firebase credentials NOT in git history
- [ ] `.env.local` added to `.gitignore`
- [ ] No hardcoded API keys in source code
- [ ] Firestore rules tested in Firebase Console
- [ ] Storage rules tested for appropriate access
- [ ] CORS configuration reviewed if using APIs

### Build Verification
```bash
# Build production bundle
npm run build

# Verify no console errors about missing env vars
# Check for "Missing required Firebase environment variables" message
```

---

## Troubleshooting

### "Missing required Firebase environment variables" Error
**Cause**: Environment variables not set in deployment platform
**Solution**:
1. Get values from Firebase Console > Project Settings > General
2. Set each NEXT_PUBLIC_FIREBASE_* variable in your deployment platform
3. Rebuild application

### Firebase Connection Timeout
**Cause**: Network issues or incorrect projectId
**Solution**:
1. Verify projectId matches Firebase project
2. Check firebaseConfig in browser console: `window.__FIREBASE_CONFIG__`
3. Test connectivity to Firebase endpoints

### Email Send Fails in Production
**Cause**: RESEND_API_KEY not set or FROM_EMAIL invalid
**Solution**:
1. Verify RESEND_API_KEY in environment variables
2. Check FROM_EMAIL is valid for your Resend account
3. Review Resend dashboard for API limits/errors

### Firestore Rules Blocking Legitimate Requests
**Cause**: Users don't have company membership or companyId not set
**Solution**:
1. Verify companyId field exists on documents
2. Check user has companyId in their user document
3. Test rules in Firebase Console > Firestore > Rules tab

---

## Environment-Specific Configuration

### Development (.env.local)
```env
NODE_ENV=development
NEXT_PUBLIC_FIREBASE_API_KEY=your-dev-key
# ... other vars
```

### Production (Vercel)
```
Set in Project Settings > Environment Variables
- Select "Production" environment
- Add all required variables
```

### Staging (if applicable)
```
Create separate Firebase project for staging
Set staging-specific environment variables
```

---

## Security Best Practices

1. **Never commit `.env.local` or `.env.production`**
   - Add to `.gitignore`
   - Use deployment platform's environment variable management

2. **Rotate credentials periodically**
   - Firebase API keys can be regenerated in Console
   - Resend API keys should be rotated quarterly

3. **Use separate projects for staging/production**
   - Prevents accidental data modifications
   - Easier to manage security rules per environment

4. **Monitor Firestore usage**
   - Set up billing alerts in Google Cloud Console
   - Review security rules for excessive reads

5. **Enable Firebase Security Audit Logs**
   - Firestore > Rules tab > Show audit logs
   - Track rule changes and deployment history

---

## Verification Commands

```bash
# Check Firebase connectivity
curl -X GET "https://firestore.googleapis.com/v1/projects/YOUR_PROJECT_ID/databases/default"

# Test authentication
firebase auth:list

# Validate Firestore rules syntax
firebase deploy --only firestore:rules --dry-run

# View current rules
firebase rules:list
```

---

## Related Documentation
- [Firebase Project Setup](./DEPLOYMENT.md)
- [Firestore Security Rules Best Practices](https://firebase.google.com/docs/firestore/security/rules-best-practices)
- [Firebase Authentication Setup](https://firebase.google.com/docs/auth/web/start)

---

**Last Updated**: January 13, 2026
**Status**: ✅ Security hardening complete, ready for production review
