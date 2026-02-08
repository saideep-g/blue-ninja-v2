# Short Answer - Quick Reference Card

## 🚀 Quick Start

### For Developers

```bash
# 1. Install dependencies
cd functions && npm install

# 2. Set Gemini API key
firebase functions:secrets:set GEMINI_API_KEY

# 3. Deploy
npm run build
firebase deploy --only functions

# 4. Configure App Check
# Add to .env.local:
VITE_APP_CHECK_ENABLED=true
VITE_RECAPTCHA_SITE_KEY=your_key_here
```

---

## 📁 File Locations

| Component | Path |
|-----------|------|
| **Cloud Function** | `functions/src/index.ts` |
| **AI Service** | `src/services/aiEvaluationService.ts` |
| **Student UI** | `src/components/templates/ShortAnswerTemplate.tsx` |
| **Admin Dashboard** | `src/components/admin/AIMonitoringDashboard.tsx` |
| **Dry Run Validator** | `src/components/admin/bundles/DryRunValidator.tsx` |
| **App Check Config** | `src/services/db/appCheck.ts` |
| **Deployment Guide** | `docs/SHORT_ANSWER_DEPLOYMENT.md` |

---

## 🔑 Environment Variables

### Frontend (.env.local)
```bash
VITE_APP_CHECK_ENABLED=true
VITE_RECAPTCHA_SITE_KEY=6Lc...
VITE_AI_EVALUATION_ENABLED=true
```

### Backend (Firebase Secrets)
```bash
GEMINI_API_KEY=AIza...
```

---

## 🎯 Key Features

### ✅ Cloud Function
- **Endpoint**: `evaluateShortAnswer`
- **Model**: Gemini 1.5 Flash
- **Temperature**: 0.0 (deterministic)
- **Rate Limit**: 10 req/min per user
- **Max Tokens**: 1024 output

### ✅ Admin Dashboard
- **Route**: `/admin/ai-monitoring`
- **Features**: Quarterly logs, filtering, CSV export, cost tracking
- **Data Source**: `/admin/system/ai_monitoring/{YYYY-QUARTER}`

### ✅ Dry Run Validator
- **Location**: Bundle Preview → "Test AI Evaluation"
- **Tests**: Good/Partial/Bad answers
- **Logs**: Marked as `ADMIN_DRY_RUN`

### ✅ Security
- **App Check**: reCAPTCHA v3
- **Auth**: Firebase Auth required
- **Rate Limiting**: Firestore-based
- **API Key**: Stored in Firebase Secrets

---

## 📊 Data Schema

### Student Monthly Log
```typescript
/students/{uid}/monthly_logs/{YYYY-MM}
{
  entries: [
    {
      date: "2026-02-07T13:22:00Z",
      timestamp: 1707311520000,
      questionId: "q123",
      questionText: "...",
      studentAnswer: "...",
      aiFeedback: { score, results, summary },
      responseTime: 1234,
      inputTokensCount: 500,
      outputTokensCount: 200,
      isSuccess: true,
      isValid: true
    }
  ]
}
```

### Admin Monitoring Log
```typescript
/admin/system/ai_monitoring/{YYYY-QUARTER}
{
  entries: [
    {
      // Same as student log, plus:
      studentId: "uid123",
      studentName: "John Doe",
      errorMessage?: "...",
      isSelfEvaluated?: true
    }
  ]
}
```

---

## 🧪 Testing Commands

```bash
# Test Cloud Function locally
cd functions
npm run serve

# View logs
firebase functions:log --only evaluateShortAnswer

# Check rate limits
firebase firestore:get rate_limits/{userId}

# Export monitoring data
# Use admin dashboard CSV export button
```

---

## 💰 Cost Tracking

### Gemini Pricing (2026)
- Input: $0.075 / 1M tokens
- Output: $0.30 / 1M tokens

### Average Cost
- **Per evaluation**: ~$0.0001
- **1000 evaluations**: ~$0.10
- **10,000 evaluations**: ~$1.00

### Monitor in Dashboard
- Total tokens (input + output)
- Estimated cost per quarter
- Average latency

---

## 🔧 Common Tasks

### Add New Rubric Criterion
1. Edit question in Bundle Editor
2. Add to `evaluation_criteria` array
3. Test with Dry Run Validator
4. Publish bundle

### View AI Logs
1. Go to `/admin/ai-monitoring`
2. Select quarter
3. Filter/search as needed
4. Click "View Details" for full info

### Test Rubric Before Deploy
1. Open question in Bundle Editor
2. Click "Preview"
3. Click "Test AI Evaluation"
4. Enter test answers (good/partial/bad)
5. Review AI feedback

### Export Data for Analysis
1. Open AI Monitoring Dashboard
2. Filter to desired period
3. Click "Export CSV"
4. Open in Excel/Sheets

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| Function won't deploy | Check Node.js version (need 18+) |
| Rate limit hit | Wait 1 minute or increase limit |
| App Check fails | Verify reCAPTCHA site key |
| Invalid JSON from AI | Check Gemini API status |
| High costs | Review rate limits and token usage |
| Logs not appearing | Check Firestore rules for admin access |

---

## 📞 Quick Links

- **Firebase Console**: https://console.firebase.google.com
- **Gemini API**: https://makersuite.google.com
- **reCAPTCHA Admin**: https://www.google.com/recaptcha/admin
- **Full Deployment Guide**: `docs/SHORT_ANSWER_DEPLOYMENT.md`
- **Implementation Summary**: `docs/SHORT_ANSWER_IMPLEMENTATION_SUMMARY.md`

---

## ⚡ Emergency Rollback

```bash
# 1. Disable Cloud Function
firebase functions:delete evaluateShortAnswer

# 2. Disable App Check
# In Firebase Console > App Check > Disable enforcement

# 3. Disable in Frontend
# .env.local:
VITE_APP_CHECK_ENABLED=false
VITE_AI_EVALUATION_ENABLED=false

# 4. Redeploy
npm run build
firebase deploy --only hosting
```

---

## ✨ Best Practices

1. **Always test with Dry Run Validator** before deploying questions
2. **Monitor costs weekly** via admin dashboard
3. **Review AI feedback quality** regularly
4. **Keep rubrics clear and specific** (3-5 criteria max)
5. **Use semantic equivalents** in model answers
6. **Export logs monthly** for analysis
7. **Check rate limits** if users report issues

---

**Last Updated**: 2026-02-07  
**Status**: ✅ Ready for Production
