# Short Answer Implementation - Deployment Guide

## Overview
This guide covers the deployment of all four priority features for the Short Answer question type:
1. Firebase Cloud Functions with Gemini API integration
2. Admin Monitoring Dashboard for AI logs
3. Firebase App Check and rate limiting
4. Dry Run validator for testing rubrics

## Prerequisites

- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase project with Blaze plan (required for Cloud Functions)
- Google Cloud account with Gemini API access
- Node.js 18+ installed

## Part 1: Firebase Cloud Functions Setup

### 1.1 Install Dependencies

```bash
cd functions
npm install
```

### 1.2 Configure Gemini API Key

1. Get your Gemini API key from: https://makersuite.google.com/app/apikey
2. Store it as a Firebase secret:

```bash
firebase functions:secrets:set GEMINI_API_KEY
# Paste your API key when prompted
```

### 1.3 Build and Deploy Functions

```bash
# Build TypeScript
npm run build

# Deploy to Firebase
firebase deploy --only functions
```

### 1.4 Verify Deployment

```bash
# Check function logs
firebase functions:log --only evaluateShortAnswer

# Test the function (optional)
firebase functions:shell
> evaluateShortAnswer({question: "Test?", student_answer: "Test", evaluation_criteria: ["Correct"], max_points: 1})
```

## Part 2: Firebase App Check Setup

### 2.1 Register Your App with reCAPTCHA v3

1. Go to: https://www.google.com/recaptcha/admin
2. Click "+" to create a new site
3. Select "reCAPTCHA v3"
4. Add your domain (e.g., `blue-ninja.web.app`)
5. Copy the **Site Key**

### 2.2 Enable App Check in Firebase Console

1. Go to Firebase Console > App Check
2. Click "Get Started"
3. Select your web app
4. Choose "reCAPTCHA v3"
5. Paste your site key
6. Click "Save"

### 2.3 Configure Environment Variables

Add to your `.env.local`:

```bash
VITE_APP_CHECK_ENABLED=true
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key_here
```

### 2.4 Enable Enforcement

In Firebase Console > App Check:
- Enable enforcement for **Cloud Functions**
- Enable enforcement for **Firestore**

⚠️ **Important**: Test thoroughly before enabling enforcement in production!

## Part 3: Admin Monitoring Dashboard

### 3.1 Add Route to Admin Panel

Update your admin routing to include the AI Monitoring Dashboard:

```typescript
// In your admin routes file
import { AIMonitoringDashboard } from '../components/admin/AIMonitoringDashboard';

// Add route
{
  path: '/admin/ai-monitoring',
  element: <AIMonitoringDashboard />
}
```

### 3.2 Add Navigation Link

In your admin navigation menu:

```tsx
<Link to="/admin/ai-monitoring">
  <Activity className="w-5 h-5" />
  AI Monitoring
</Link>
```

### 3.3 Firestore Security Rules

Ensure admin users can read monitoring logs:

```javascript
// firestore.rules
match /admin/system/ai_monitoring/{quarter} {
  allow read: if request.auth != null && 
              get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

## Part 4: Dry Run Validator Integration

The Dry Run Validator is already integrated into `BundlePreviewSimulator.tsx`. To use it:

1. Open any Short Answer question in the Bundle Editor
2. Click "Preview" to open the simulator
3. Click "Test AI Evaluation" button in the header
4. The sidebar will show:
   - Model answer vs. student input comparison
   - Evaluation criteria (rubric)
   - "View System Logic" toggle to see Gemini prompt
   - Test input field
   - "Execute Dry Run" button

All dry run tests are logged to the admin monitoring dashboard with `studentName: "ADMIN_DRY_RUN"`.

## Part 5: Testing Checklist

### 5.1 Cloud Function Tests

- [ ] Function deploys successfully
- [ ] Function responds to valid requests
- [ ] Rate limiting works (10 requests/minute per user)
- [ ] Invalid requests return proper error messages
- [ ] Logs appear in Firebase Console

### 5.2 App Check Tests

- [ ] App Check initializes without errors
- [ ] Requests work with App Check enabled
- [ ] Unauthorized requests are blocked (test with curl)
- [ ] Token refresh works automatically

### 5.3 Admin Dashboard Tests

- [ ] Dashboard loads without errors
- [ ] Quarter selector shows correct options
- [ ] Logs display properly
- [ ] Filtering by status works
- [ ] Search functionality works
- [ ] CSV export downloads correctly
- [ ] Detail modal shows all information
- [ ] Cost calculations are accurate

### 5.4 Dry Run Validator Tests

- [ ] Validator opens in Bundle Preview
- [ ] System prompt displays correctly
- [ ] Test answers submit successfully
- [ ] AI evaluation returns proper JSON
- [ ] Results display with correct formatting
- [ ] Dry run logs appear in monitoring dashboard

## Part 6: Monitoring and Maintenance

### 6.1 Monitor Costs

Check Gemini API usage:
1. Go to: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com
2. Navigate to "Quotas & System Limits"
3. Monitor token usage

Estimated costs (as of 2026):
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens
- Average question: ~500 input + 200 output tokens = $0.0001 per evaluation

### 6.2 Monitor Function Performance

```bash
# View function metrics
firebase functions:log --only evaluateShortAnswer --limit 100

# Check for errors
firebase functions:log --only evaluateShortAnswer | grep ERROR
```

### 6.3 Monitor Rate Limits

Check Firestore for rate limit hits:

```javascript
// Query rate_limits collection
db.collection('rate_limits')
  .where('requestCount', '>=', 10)
  .get()
```

### 6.4 Update Gemini Model

If Google releases a new model version:

1. Update `functions/src/index.ts`:
```typescript
model: 'gemini-1.5-flash-002' // or latest version
```

2. Redeploy:
```bash
cd functions
npm run build
firebase deploy --only functions
```

## Part 7: Rollback Procedure

If issues arise:

### 7.1 Disable Cloud Function

```bash
# Delete the function
firebase functions:delete evaluateShortAnswer
```

### 7.2 Disable App Check

In Firebase Console > App Check:
- Disable enforcement for Cloud Functions
- Disable enforcement for Firestore

### 7.3 Disable in Frontend

Update `.env.local`:

```bash
VITE_APP_CHECK_ENABLED=false
VITE_AI_EVALUATION_ENABLED=false
```

Redeploy:

```bash
npm run build
firebase deploy --only hosting
```

## Part 8: Security Best Practices

### 8.1 API Key Protection

- ✅ Gemini API key stored in Firebase Secrets (not in code)
- ✅ App Check protects Cloud Functions from unauthorized access
- ✅ Rate limiting prevents abuse (10 req/min per user)
- ✅ Firestore rules restrict admin log access

### 8.2 Data Privacy

- Student answers are logged for quality monitoring
- Logs are stored in Firestore with proper access controls
- Admin users can view logs but cannot modify them
- Dry run tests are clearly marked with `ADMIN_DRY_RUN` identifier

### 8.3 Cost Controls

- `maxOutputTokens: 1024` limits response size
- Rate limiting prevents runaway costs
- Monitoring dashboard tracks usage and costs
- Quarterly log batching reduces Firestore reads

## Troubleshooting

### Issue: "Function deployment failed"

**Solution**: Ensure you're on Firebase Blaze plan and Node.js 18 is installed.

```bash
firebase projects:list
node --version  # Should be 18+
```

### Issue: "App Check token invalid"

**Solution**: Check reCAPTCHA site key is correct and domain is whitelisted.

```bash
# Verify environment variable
echo $VITE_RECAPTCHA_SITE_KEY
```

### Issue: "Rate limit exceeded"

**Solution**: This is expected behavior. Wait 1 minute or increase limit in `functions/src/index.ts`:

```typescript
const maxRequests = 20; // Increase from 10
```

### Issue: "AI returns invalid JSON"

**Solution**: Check Gemini API status and model version. The function includes JSON validation and will log errors.

```bash
firebase functions:log --only evaluateShortAnswer | grep "invalid response"
```

## Support

For issues or questions:
1. Check Firebase Console logs
2. Review admin monitoring dashboard for patterns
3. Test with dry run validator
4. Check Gemini API quotas

## Next Steps

After successful deployment:
1. Test with real students (small group first)
2. Monitor costs and performance for 1 week
3. Adjust rate limits if needed
4. Train admins on monitoring dashboard
5. Create rubrics for all Short Answer questions
6. Use dry run validator to verify rubrics
