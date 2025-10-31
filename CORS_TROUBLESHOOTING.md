# CORS Troubleshooting Guide

## Error: "Access-Control-Allow-Origin header... specified an origin different from the origin"

This error occurs when your frontend and backend are on different domains and the CORS (Cross-Origin Resource Sharing) configuration doesn't allow the frontend domain.

### Quick Fix

The server has been updated to automatically allow these origins:
- `http://localhost:3000` (local development)
- `https://deepseek-ai-web.vercel.app` (production frontend)
- Any custom domain set in `CLIENT_URL` environment variable

### Environment Variable Setup

**Development:**
```bash
CLIENT_URL=http://localhost:3000
```

**Production:**
```bash
CLIENT_URL=https://deepseek-ai-web.vercel.app
# or your custom domain:
# CLIENT_URL=https://your-custom-domain.com
```

### How the Fix Works

1. **Multiple Origins Support**: The server now accepts requests from multiple predefined origins
2. **Dynamic Origin Checking**: Each request's origin is validated against the allowed list
3. **Automatic Fallback**: If no custom `CLIENT_URL` is set, it uses the default production domain
4. **Better Logging**: Server logs show which origins are allowed and any blocked requests

### Verifying the Fix

1. **Check Server Logs**: Look for this message when the server starts:
   ```
   Allowed CORS origins: ['http://localhost:3000', 'https://deepseek-ai-web.vercel.app']
   ```

2. **Test API Requests**: Try making requests from your frontend. You should see successful responses instead of CORS errors.

3. **Monitor Blocked Requests**: If requests are still blocked, check server logs for:
   ```
   CORS blocked origin: https://some-domain.com
   ```

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| New frontend domain | Add it to `allowedOrigins` array in `server.ts` |
| Custom domain not working | Set `CLIENT_URL` environment variable |
| Local development blocked | Ensure `http://localhost:3000` is in allowed origins |
| Subdomain issues | Add specific subdomains to allowed origins |

### Adding New Allowed Origins

To add a new frontend domain, edit `server.ts`:

```typescript
const allowedOrigins = [
  'http://localhost:3000', // Local development
  'https://deepseek-ai-web.vercel.app', // Production frontend
  'https://your-new-domain.com', // Add your new domain here
  process.env.CLIENT_URL // Custom client URL from environment
].filter(Boolean);
```

### Testing CORS Configuration

1. **Browser DevTools**: Check the Network tab for CORS-related errors
2. **Server Logs**: Monitor for "CORS blocked origin" messages
3. **Preflight Requests**: Ensure OPTIONS requests are handled correctly
4. **Credentials**: Verify `credentials: true` is working for authenticated requests

### Production Deployment Checklist

- [ ] Set `CLIENT_URL` environment variable to your frontend domain
- [ ] Ensure frontend domain uses HTTPS in production
- [ ] Verify server logs show correct allowed origins
- [ ] Test API requests from production frontend
- [ ] Check that authentication (cookies) work across domains

### Advanced Configuration

If you need more complex CORS rules, you can modify the CORS configuration in `server.ts`:

```typescript
app.use(cors({
  origin: function (origin, callback) {
    // Custom logic for determining allowed origins
    // e.g., database lookup, pattern matching, etc.
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));
```

### Need Help?

If CORS issues persist:

1. Check server logs for the exact blocked origin
2. Verify your frontend URL matches exactly (including protocol)
3. Ensure no typos in environment variables
4. Test with a simple curl request to isolate the issue
