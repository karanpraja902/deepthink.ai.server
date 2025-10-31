# Google OAuth Troubleshooting Guide

## Error: "redirect_uri_mismatch" (Error 400)

This error occurs when the redirect URI your application uses doesn't match what's configured in Google Cloud Console.

### Quick Fix Steps

#### 1. Check Your Production Environment Variables

Ensure these environment variables are set correctly in your production environment:

```bash
NODE_ENV=production
BACKEND_URL=https://your-actual-domain.com
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Important**: Replace `your-actual-domain.com` with your actual production domain!

#### 2. Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID
4. Add these **Authorized redirect URIs**:

For Development:
```
http://localhost:5000/api/auth/google/callback
```

For Production:
```
https://your-actual-domain.com/api/auth/google/callback
```

#### 3. Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Using `http://` in production | Change `BACKEND_URL` to use `https://` |
| Wrong domain in redirect URI | Update Google Console with correct production domain |
| Missing environment variables | Set `BACKEND_URL` in production environment |
| Localhost in production | Replace localhost with actual domain |

#### 4. Verification Steps

1. Check server logs for the callback URL being used:
   ```
   Google OAuth callback URL: https://your-domain.com/api/auth/google/callback
   ```

2. Ensure the URL in logs matches exactly what's in Google Console

3. Test with a fresh browser session or incognito mode

#### 5. Environment Variable Examples

**Development (.env):**
```bash
NODE_ENV=development
BACKEND_URL=http://localhost:5000
GOOGLE_CLIENT_ID=your-dev-client-id
GOOGLE_CLIENT_SECRET=your-dev-client-secret
```

**Production:**
```bash
NODE_ENV=production
BACKEND_URL=https://yourdomain.com
GOOGLE_CLIENT_ID=your-prod-client-id
GOOGLE_CLIENT_SECRET=your-prod-client-secret
```

### Testing the Fix

After making changes:

1. Restart your server
2. Check server logs for correct callback URL
3. Try signing in with Google again
4. If still failing, verify Google Console settings match exactly

### Need Help?

If you're still experiencing issues:

1. Check server logs for the exact callback URL being used
2. Verify your production domain is accessible via HTTPS
3. Ensure no typos in environment variables
4. Try creating a new OAuth client in Google Console if the issue persists
