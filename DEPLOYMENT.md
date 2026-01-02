# Deployment Guide - Vercel

This guide will help you deploy your Next.js 16 + Firebase application to Vercel with optimal performance.

## Prerequisites

- [x] GitHub account
- [x] Vercel account (sign up at https://vercel.com)
- [x] Firebase project configured
- [x] All environment variables ready

## Performance Optimizations Implemented

### 1. **Next.js Configuration**
- ✅ React Strict Mode enabled
- ✅ Console logs removed in production
- ✅ Compression enabled
- ✅ Source maps disabled for smaller bundles
- ✅ Package imports optimized (lucide-react, radix-ui, recharts, date-fns)
- ✅ Security headers configured (HSTS, X-Frame-Options, CSP, etc.)
- ✅ Static asset caching (1 year)
- ✅ Image optimization (AVIF, WebP)

### 2. **React Query Optimization**
- ✅ Stale time: 5 minutes
- ✅ GC time: 30 minutes
- ✅ Retry logic with exponential backoff
- ✅ Network-aware fetching

### 3. **Code Splitting**
- ✅ Dynamic imports for heavy components (Analytics, Charts)
- ✅ Lazy loading with loading skeletons
- ✅ Client-side only rendering for chart components

### 4. **Real-time Updates**
- ✅ Dashboard preferences sync with onSnapshot
- ✅ Optimistic UI updates
- ✅ Efficient Firestore listeners

## Deployment Steps

### Step 1: Prepare Your Repository

1. **Commit all changes:**
   ```bash
   git add .
   git commit -m "Add production optimizations and Vercel config"
   git push origin main
   ```

2. **Ensure `.env.local` is in `.gitignore`** (never commit secrets!)

### Step 2: Import to Vercel

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your GitHub repository
4. Vercel will auto-detect Next.js

### Step 3: Configure Environment Variables

In Vercel dashboard, add these environment variables:

#### Firebase (Required)
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
```

#### Firebase Admin (Optional - for server-side features)
```
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY
```

#### Other Services
```
OPENAI_API_KEY (if using AI features)
RESEND_API_KEY (if using email)
```

**Important:** Copy values from your `.env.local` file.

### Step 4: Deploy

1. Click "Deploy"
2. Wait for build to complete (2-5 minutes)
3. Vercel will provide a production URL

### Step 5: Configure Custom Domain (Optional)

1. Go to Project Settings > Domains
2. Add your custom domain
3. Update DNS records as instructed
4. SSL certificates are auto-provisioned

## Post-Deployment

### 1. Firebase Security Rules

Update Firestore security rules for production:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Ensure authenticated users only
    match /{document=**} {
      allow read, write: if request.auth != null;
    }

    // Add specific rules for each collection
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // ... add other collection rules
  }
}
```

### 2. Firebase Hosting (Optional)

If you want Firebase Hosting instead of Vercel:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### 3. Performance Monitoring

#### Enable Vercel Analytics
1. Go to Project Settings > Analytics
2. Enable Web Analytics
3. Monitor Core Web Vitals

#### Enable Firebase Performance
Already configured in the app. View metrics at:
https://console.firebase.google.com/project/YOUR_PROJECT/performance

### 4. Run Lighthouse Audit

1. Open deployed site in Chrome
2. Open DevTools (F12)
3. Go to Lighthouse tab
4. Run audit

**Target Scores:**
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 90+

## Optimization Checklist

- [ ] Fix all TypeScript errors before production
  - Set `ignoreBuildErrors: false` in [next.config.ts](next.config.ts:41)
  - Run `npm run typecheck`

- [ ] Remove console logs
  - Already configured to remove in production

- [ ] Test on slow 3G network
  - Use Chrome DevTools Network throttling

- [ ] Verify Firebase indexes
  - Check Firebase Console > Firestore > Indexes
  - Add composite indexes for complex queries

- [ ] Configure Firebase Security Rules
  - Never allow public read/write in production

- [ ] Set up error tracking (optional)
  - Consider Sentry or LogRocket

- [ ] Enable CDN caching
  - Already configured in [next.config.ts](next.config.ts)

- [ ] Monitor bundle size
  - Run `npm run build` locally
  - Check `.next/analyze` for bundle report

## Common Issues

### Issue: Build Fails Due to Type Errors

**Solution:**
```bash
npm run typecheck
# Fix reported errors
```

### Issue: Environment Variables Not Working

**Solution:**
- Ensure variables start with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding/changing variables
- Check Vercel dashboard > Settings > Environment Variables

### Issue: Firebase Connection Errors

**Solution:**
- Verify all Firebase config variables are correct
- Check Firebase Console for quota limits
- Ensure Firebase project is on Blaze (pay-as-you-go) plan

### Issue: Slow Page Loads

**Solution:**
- Check Network tab for large bundles
- Verify dynamic imports are working
- Enable Vercel Analytics to identify bottlenecks
- Consider adding ISR (Incremental Static Regeneration) for static content

## Performance Monitoring

### Real User Monitoring (RUM)

Monitor these metrics in Vercel Analytics:

1. **Largest Contentful Paint (LCP)** - Target: < 2.5s
2. **First Input Delay (FID)** - Target: < 100ms
3. **Cumulative Layout Shift (CLS)** - Target: < 0.1
4. **Time to First Byte (TTFB)** - Target: < 600ms

### Firebase Performance Monitoring

Track custom traces:
```typescript
import { trace } from 'firebase/performance';

const t = trace(perf, 'custom_trace');
t.start();
// ... your code
t.stop();
```

## Rollback Strategy

If deployment has issues:

1. **Instant Rollback in Vercel:**
   - Go to Deployments
   - Find previous working deployment
   - Click "Promote to Production"

2. **Revert Git Commit:**
   ```bash
   git revert HEAD
   git push origin main
   ```

## Scaling Considerations

### When Traffic Increases:

1. **Enable Vercel Pro** for higher limits
2. **Upgrade Firebase plan** if hitting quotas
3. **Add Firestore indexes** for all queries
4. **Enable Firebase CDN** for static assets
5. **Consider Redis** for session management (via Upstash)

## Support

- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- Firebase Docs: https://firebase.google.com/docs

## Environment-Specific Configuration

### Development
```bash
npm run dev:turbo  # Uses local .env.local
```

### Production
- Environment variables managed in Vercel dashboard
- Automatic HTTPS
- Global CDN distribution
- Edge network optimization

## Security Best Practices

1. ✅ Never commit `.env.local` to Git
2. ✅ Use Firebase Security Rules
3. ✅ Enable CORS only for your domain
4. ✅ Rotate API keys regularly
5. ✅ Use environment-specific Firebase projects
6. ✅ Enable Firebase App Check (optional)
7. ✅ Implement rate limiting on API routes

## Continuous Deployment

Vercel automatically:
- ✅ Builds on every push to `main`
- ✅ Creates preview deployments for PRs
- ✅ Runs build checks
- ✅ Provides deployment notifications

## Conclusion

Your application is now optimized for production deployment on Vercel with:
- **Fast loading times** through code splitting and caching
- **Real-time data sync** with Firebase
- **Global CDN** distribution
- **Automatic HTTPS** and security headers
- **Zero-config deployment** workflow

For questions or issues, check the Vercel and Firebase documentation or create an issue in the repository.
