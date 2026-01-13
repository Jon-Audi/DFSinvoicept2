# Vercel Test Deployment Configuration

## Overview
This guide walks you through connecting the `test` branch to your Vercel test environment and configuring the required environment variables.

**Test URL**: https://df-sinvoicept2-git-test-jons-projects-c8708275.vercel.app

---

## Step 1: Connect Test Branch to Vercel

### Via Vercel Dashboard
1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your DFSinvoicept2 project
3. Go to **Settings > Git**
4. In **Connected Git Repository**, ensure it's connected to: `Jon-Audi/DFSinvoicept2`
5. Go to **Deployments**
6. You should see the `test` branch available
7. Create a new deployment from the `test` branch if not automatic

### Verify Test Branch Deployment
- The test branch should automatically deploy to your preview URL
- Check **Deployments** tab to see build status
- Test URL: https://df-sinvoicept2-git-test-jons-projects-c8708275.vercel.app

---

## Step 2: Configure Environment Variables in Vercel

### Access Environment Variables
1. Go to your Vercel project dashboard
2. Click **Settings** in the top navigation
3. Select **Environment Variables** from the left sidebar

### Required Variables for Test Environment

Add the following environment variables. You can set different values for `test` branch:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-test-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-test-firebase-auth-domain.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-test-firebase-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-test-firebase-storage-bucket.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-test-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-test-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-test-measurement-id
FROM_EMAIL=noreply@yourdomain.com
RESEND_API_KEY=re_your-resend-test-key
NODE_ENV=production
```

### Step-by-Step to Add Variables in Vercel UI

1. **Click "Add New" button**
2. **Enter variable name** (e.g., `NEXT_PUBLIC_FIREBASE_API_KEY`)
3. **Enter variable value**
4. **Select environments**:
   - ✅ Check **Production** (for test branch)
   - ✅ Check **Preview** (for PR previews)
   - ✅ Check **Development** (for local `vercel env pull`)
5. **Click "Save"**
6. **Repeat for each variable**

### Important: Branch-Specific Configuration

If you want **different values for test vs production**:

1. After adding a variable, edit it
2. In the **Environments** dropdown, you can set **different values** per environment
3. Example:
   - **Production** → uses production Firebase project
   - **Preview/Test** → uses test Firebase project

---

## Step 3: Firebase Configuration for Test

Your test environment should use a **separate Firebase project** for safety.

### Create Test Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project: `DFSInvoice-Test`
3. Enable:
   - ✅ Authentication (Email/Password, OAuth)
   - ✅ Firestore Database (Production Mode)
   - ✅ Cloud Storage
4. Get credentials from **Project Settings > General**
5. Deploy Firestore rules:
   ```bash
   firebase use DFSInvoice-Test
   firebase deploy --only firestore:rules,storage
   ```

---

## Step 4: Redeploy After Environment Variables

### Option A: Automatic Redeploy
1. Once you save environment variables in Vercel
2. Push a new commit to `test` branch:
   ```bash
   git commit --allow-empty -m "trigger: Redeploy with env vars"
   git push origin test
   ```
3. Vercel will automatically rebuild with new environment variables

### Option B: Manual Redeploy
1. Go to **Deployments** in Vercel dashboard
2. Find the latest `test` branch deployment
3. Click **⋮ (three dots)** → **Redeploy**
4. Check the rebuild logs

---

## Step 5: Verify Test Deployment

### Test the Application
1. Visit: https://df-sinvoicept2-git-test-jons-projects-c8708275.vercel.app
2. Check browser console (F12) for errors
3. Test login functionality
4. Verify Firestore connections

### Check Deployment Logs
1. Go to **Deployments** in Vercel
2. Click on latest `test` deployment
3. Check **Logs** tab for:
   - Build logs (TypeScript compilation, Next.js build)
   - Runtime logs (Firebase initialization, API calls)

### Monitor for Errors
Look for:
```
Missing required Firebase environment variables: [...]
Email service not configured
Database not initialized
```

If you see these, go back to Step 2 and verify all variables are set.

---

## Step 6: Deployment Workflow

### Future Deployments to Test
```bash
# Make changes on test branch
git checkout test
# ... make changes ...
git add .
git commit -m "feat: your change"
git push origin test
```

Vercel will **automatically deploy** to https://df-sinvoicept2-git-test-jons-projects-c8708275.vercel.app

### Promote to Production
When ready to deploy to production:
```bash
# Merge test branch to main
git checkout main
git merge test
git push origin main
```

---

## Troubleshooting

### Build Fails with "Environment Variables Missing"
**Solution**: Check Vercel Settings > Environment Variables
- Verify all `NEXT_PUBLIC_*` variables are set
- Save and redeploy

### Firebase Connection Errors
**Solution**: Verify Firebase credentials
```javascript
// Check in browser console
console.log(window.firebaseConfig || "Not loaded")
```

Should show:
```
{
  apiKey: "...",
  projectId: "...",
  // ... other fields
}
```

### TypeScript Errors During Build
**Solution**: This is expected if using a different Firebase project
- Type mismatches are pre-existing in the codebase
- Does not prevent deployment (see PRODUCTION_READINESS.md)

### Test URL Shows "Project Not Found"
**Solution**: 
1. Wait 2-3 minutes for Vercel DNS to propagate
2. Check project is connected in Vercel dashboard
3. Verify `test` branch exists: `git branch -a`

---

## Environment Variables Reference

| Variable | Type | Example | Required |
|----------|------|---------|----------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Public | `AIza...` | ✅ Yes |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Public | `project.firebaseapp.com` | ✅ Yes |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Public | `my-project-id` | ✅ Yes |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Public | `project.appspot.com` | ✅ Yes |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Public | `123456789` | ✅ Yes |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Public | `1:123:web:abc...` | ✅ Yes |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Public | `G-XXXXXX` | ❌ Optional |
| `FROM_EMAIL` | Private | `noreply@domain.com` | ✅ Yes |
| `RESEND_API_KEY` | Private | `re_xxxxx` | ✅ Yes |
| `NODE_ENV` | Private | `production` | ✅ Yes |

---

## Security Best Practices for Test Environment

1. **Use Separate Firebase Project**
   - Never share production credentials with test
   - Use test Firebase project in Vercel

2. **Limit Access**
   - Share test URL only with team members
   - Consider password protection via Vercel middleware

3. **Monitor Logs**
   - Check Vercel deployment logs for errors
   - Monitor Firebase Firestore activity

4. **Clean Test Data**
   - Regularly delete test documents from Firestore
   - Don't use production customer data in tests

---

## Next Steps

After test deployment is working:

1. ✅ Test all features on https://df-sinvoicept2-git-test-jons-projects-c8708275.vercel.app
2. ✅ Verify Firestore operations work correctly
3. ✅ Test email functionality with RESEND_API_KEY
4. ✅ Check error handling and logging
5. ✅ Review ENVIRONMENT_CONFIGURATION.md for production setup
6. ✅ When confident, merge to main and deploy to production

---

## Quick Commands

```bash
# Switch to test branch
git checkout test

# Pull latest test branch
git pull origin test

# Push changes to test
git push origin test

# View test branch commits
git log test --oneline -10

# Compare test vs main
git diff main test

# Create a PR from test to main
# (use GitHub UI at https://github.com/Jon-Audi/DFSinvoicept2)
```

---

**Last Updated**: January 13, 2026
**Status**: Ready for test deployment
**Test URL**: https://df-sinvoicept2-git-test-jons-projects-c8708275.vercel.app
