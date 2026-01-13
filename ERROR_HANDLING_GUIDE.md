# Error Handling & Logging Guide - Production Best Practices

## Overview
This document outlines error handling and logging standards implemented across the DFS Invoice application for production reliability and observability.

## Logging Strategy

### Logger Utility
A structured logging utility (`src/lib/logger.ts`) provides:
- **Log Levels**: debug (dev only), info, warn, error
- **Automatic Sanitization**: Removes sensitive data (passwords, tokens, emails, etc.)
- **Scoped Loggers**: Context-specific loggers for different modules
- **Development vs Production**: Debug logs only in development; errors always logged

### Scoped Loggers Available

```typescript
import { 
  logger,           // General logging
  firebaseLogger,   // Firebase operations
  authLogger,       // Authentication flows
  apiLogger,        // API routes
  formLogger        // Form operations
} from '@/lib/logger';

// Usage examples
firebaseLogger.info('Document created', { docId: '123', collectionId: 'orders' });
authLogger.error('Login failed', error, { email: '[REDACTED]' });
apiLogger.warn('Rate limit approaching', { remainingRequests: 100 });
```

## Error Handling Patterns

### 1. Firestore Operations
**Pattern**: Try-catch with user-facing toast + logging

```typescript
try {
  const docRef = doc(db, 'invoices', invoiceId);
  await setDoc(docRef, invoiceData);
  firebaseLogger.info('Invoice saved', { invoiceId });
  toast({ title: "Success", description: "Invoice saved" });
} catch (error) {
  firebaseLogger.error('Failed to save invoice', error, { invoiceId });
  toast({ 
    title: "Error", 
    description: "Could not save invoice. Please try again.", 
    variant: "destructive" 
  });
}
```

### 2. API Routes
**Pattern**: Structured error responses with logging

```typescript
export async function POST(request: NextRequest) {
  try {
    // Validate input
    if (!requiredField) {
      apiLogger.warn('Missing required field', { action: 'create_order' });
      return NextResponse.json({ error: 'Missing field' }, { status: 400 });
    }

    // Execute operation
    const result = await processOrder(data);
    apiLogger.info('Order processed', { orderId: result.id });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    apiLogger.error('Order processing failed', error, { action: 'create_order' });
    return NextResponse.json({ error: 'Failed to process order' }, { status: 500 });
  }
}
```

### 3. Authentication Flows
**Pattern**: Consistent error messages with context logging

```typescript
try {
  await signInWithEmailAndPassword(auth, email, password);
  authLogger.info('User signed in', { userId: user.uid });
} catch (error) {
  if (error.code === 'auth/user-not-found') {
    authLogger.warn('Login attempt: user not found');
    toast({ title: "Error", description: "Email not found" });
  } else if (error.code === 'auth/wrong-password') {
    authLogger.warn('Login attempt: wrong password');
    toast({ title: "Error", description: "Invalid password" });
  } else {
    authLogger.error('Login failed', error);
    toast({ title: "Error", description: "Login failed. Please try again." });
  }
}
```

### 4. Form Auto-Save
**Pattern**: Silent failures with optional logging

```typescript
const saveFormData = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    // Storage quota exceeded or private mode - fail silently
    formLogger.warn('Auto-save failed', error, { key });
  }
};
```

## Security Considerations

### 1. Sensitive Data Protection
Never log:
- Passwords or authentication tokens
- Credit card information
- Social Security numbers
- API keys
- Personal email addresses (in production)

The logger automatically redacts common sensitive fields:
```typescript
// These are automatically sanitized
logger.info('User action', { 
  password: 'secret123',    // → '[REDACTED]'
  apiKey: 'sk_live_...',    // → '[REDACTED]'
  email: 'user@example.com' // → '[REDACTED]'
});
```

### 2. Error Message Exposure
- **User-Facing**: Generic, friendly messages
- **Logged**: Detailed technical information (dev only)

```typescript
// ❌ BAD - Exposes internal details to user
toast({ description: "Database connection failed on server dbd-prod-01" });

// ✅ GOOD - User-friendly message
toast({ description: "Could not save changes. Please try again." });

// ✅ GOOD - Detailed logging for developers
apiLogger.error('Database error', error, { server: 'dbd-prod-01' });
```

### 3. Console Removal in Production
All debug console.log statements have been removed. The `next.config.ts` automatically removes console.log from production builds:

```typescript
compiler: {
  removeConsole: process.env.NODE_ENV === 'production' ? {
    exclude: ['error', 'warn'],
  } : false,
}
```

This means:
- `console.log()` - removed in production
- `console.error()` - kept in production
- `console.warn()` - kept in production
- Structured logger calls - controlled by log level

## Fixed Issues

### Debug Logs Removed
1. **Dashboard Settings** (`settings/dashboard/page.tsx`)
   - Removed DB and user context logs
   - Now logs only via structured logger on save errors

2. **Analytics** (`lib/analytics.ts`)
   - Removed invoice processing logs
   - Removed data point sampling logs
   - Removed top products logs

3. **Chainlink Settings** (`settings/chainlink/page.tsx`)
   - Removed product loading logs
   - Removed mapping initialization logs
   - Kept error logging for troubleshooting

### Email API Enhanced
**File**: `app/api/send-email/route.ts`
- Added structured logging with `apiLogger`
- Added email validation before sending
- Improved error messages for API consumers
- Logs missing configuration warnings
- No sensitive email data exposed

## Monitoring & Debugging

### For Production Issues
1. **Check server logs** - Error and warning messages are preserved
2. **Review structured logs** - Use logger context for debugging
3. **Monitor error patterns** - Track recurring errors by context
4. **Firestore Audit Logs** - See rules changes and deployment history

### For Development Debugging
1. **Debug logs enabled** - Full context logging in development
2. **Console output** - All logs visible in browser DevTools
3. **Network debugging** - Firebase operations visible in Network tab

## Testing Error Handling

```typescript
// Test Firestore error handling
describe('Product Save', () => {
  it('should show user-friendly error on save failure', async () => {
    jest.spyOn(db, 'setDoc').mockRejectedValue(new Error('PERMISSION_DENIED'));
    
    await saveProduct(productData);
    
    expect(toast).toHaveBeenCalledWith({
      title: "Error",
      description: "Could not save product.",
      variant: "destructive"
    });
  });
});

// Test logger sanitization
describe('Logger', () => {
  it('should redact sensitive data', () => {
    const spy = jest.spyOn(console, 'error');
    
    logger.error('Auth failed', null, { 
      password: 'secret123',
      userId: 'user123'
    });
    
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR]'),
      expect.objectContaining({
        password: '[REDACTED]',
        userId: 'user123'
      })
    );
  });
});
```

## Deployment Checklist

- [ ] Logger utility configured (`src/lib/logger.ts`)
- [ ] All debug console.log statements removed
- [ ] Critical operations have try-catch blocks
- [ ] User-facing error messages are friendly
- [ ] Sensitive data is not exposed in logs
- [ ] Firebase operations log errors appropriately
- [ ] API routes return consistent error format
- [ ] Email validation implemented
- [ ] Production environment variables configured
- [ ] Firestore rules restrict data access
- [ ] Error monitoring service configured (optional: Sentry, LogRocket, etc.)

## Recommended Monitoring Services

### For Enhanced Production Observability (Optional)
1. **Sentry** - Error tracking and alerting
2. **LogRocket** - Session replay and logs
3. **Google Cloud Logging** - Firebase integration
4. **Datadog** - Full-stack monitoring

These services can automatically capture and organize logs from your application.

## Examples by Module

### Orders Page
- ✅ Firestore error handling with toast feedback
- ✅ Removed console.log of user.email (security)
- ✅ Structured error logging for debugging

### Invoices Page
- ✅ Proper transaction error handling
- ✅ Validation before Firestore writes
- ✅ User-friendly error messages

### Reports Page
- ✅ Query error handling with fallback data
- ✅ Timeout handling for large queries
- ✅ Structured logging of report generation

## Related Files
- [ENVIRONMENT_CONFIGURATION.md](./ENVIRONMENT_CONFIGURATION.md) - Environment setup
- [src/lib/logger.ts](./src/lib/logger.ts) - Logger utility
- [src/app/api/send-email/route.ts](./src/app/api/send-email/route.ts) - API error handling example
- [firestore.rules](./firestore.rules) - Security rules with proper access control

---

**Last Updated**: January 13, 2026
**Status**: ✅ Error handling and logging audit complete
