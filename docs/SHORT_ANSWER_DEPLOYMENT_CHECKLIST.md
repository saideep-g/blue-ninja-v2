# Short Answer Implementation - Deployment Checklist

Use this checklist to ensure all components are properly deployed and tested.

## Pre-Deployment

### Prerequisites
- [ ] Firebase project on Blaze plan (required for Cloud Functions)
- [ ] Node.js 18+ installed locally
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Logged into Firebase CLI (`firebase login`)
- [ ] Gemini API key obtained from https://makersuite.google.com/app/apikey
- [ ] reCAPTCHA v3 site key obtained from https://www.google.com/recaptcha/admin

### Code Review
- [ ] All TypeScript files compile without errors
- [ ] No console errors in development mode
- [ ] All imports resolve correctly
- [ ] Environment variables documented in `.env.example.v2`

---

## Part 1: Cloud Functions Deployment

### Setup
- [ ] Navigate to `functions` directory
- [ ] Run `npm install` successfully
- [ ] TypeScript compiles (`npm run build`)
- [ ] No build errors or warnings

### Configuration
- [ ] Gemini API key set as Firebase secret:
  ```bash
  firebase functions:secrets:set GEMINI_API_KEY
  ```
- [ ] Verify secret exists:
  ```bash
  firebase functions:secrets:access GEMINI_API_KEY
  ```

### Deployment
- [ ] Deploy function:
  ```bash
  firebase deploy --only functions
  ```
- [ ] Deployment completes without errors
- [ ] Function appears in Firebase Console > Functions
- [ ] Function status shows "Healthy"

### Testing
- [ ] Test function with Firebase shell:
  ```bash
  firebase functions:shell
  > evaluateShortAnswer({question: "Test?", student_answer: "Test", evaluation_criteria: ["Correct"], max_points: 1})
  ```
- [ ] Function returns valid JSON response
- [ ] Check logs for errors:
  ```bash
  firebase functions:log --only evaluateShortAnswer
  ```

---

## Part 2: Firebase App Check

### reCAPTCHA Setup
- [ ] reCAPTCHA v3 site registered at https://www.google.com/recaptcha/admin
- [ ] Domain added to allowed domains list
- [ ] Site key copied

### Firebase Console
- [ ] Go to Firebase Console > App Check
- [ ] Click "Get Started"
- [ ] Select web app
- [ ] Choose "reCAPTCHA v3"
- [ ] Paste site key
- [ ] Save configuration

### Frontend Configuration
- [ ] Add to `.env.local`:
  ```bash
  VITE_APP_CHECK_ENABLED=true
  VITE_RECAPTCHA_SITE_KEY=your_site_key_here
  ```
- [ ] Restart dev server
- [ ] Check browser console for App Check initialization message
- [ ] No App Check errors in console

### Enforcement (Do Last!)
- [ ] **WAIT** until all testing is complete
- [ ] Enable enforcement for Cloud Functions in Firebase Console
- [ ] Enable enforcement for Firestore in Firebase Console
- [ ] Test that requests still work
- [ ] Test that unauthorized requests are blocked

---

## Part 3: Admin Monitoring Dashboard

### Route Setup
- [ ] Add route to admin routing configuration
- [ ] Navigation link added to admin menu
- [ ] Route accessible at `/admin/ai-monitoring`

### Firestore Rules
- [ ] Add security rule for admin monitoring logs:
  ```javascript
  match /admin/system/ai_monitoring/{quarter} {
    allow read: if request.auth != null && 
                get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
  }
  ```
- [ ] Deploy Firestore rules:
  ```bash
  firebase deploy --only firestore:rules
  ```

### Testing
- [ ] Dashboard loads without errors
- [ ] Quarter selector shows current and past quarters
- [ ] Stats cards display (even if zero)
- [ ] Table renders correctly
- [ ] No console errors
- [ ] Dark mode works

### With Real Data
- [ ] Submit a test Short Answer question
- [ ] Wait for log to appear (may take a few seconds)
- [ ] Refresh dashboard
- [ ] Log appears in table
- [ ] Click "View Details" - modal opens
- [ ] All log fields populated correctly
- [ ] CSV export downloads successfully

---

## Part 4: Dry Run Validator

### Integration Check
- [ ] Open Bundle Editor
- [ ] Create or edit a Short Answer question
- [ ] Add evaluation criteria (at least 3)
- [ ] Add model answer
- [ ] Click "Preview"
- [ ] "Test AI Evaluation" button appears
- [ ] Click button - sidebar opens

### Validator Testing
- [ ] "View System Logic" toggle works
- [ ] System prompt displays correctly
- [ ] Model answer shows in left panel
- [ ] Can type in student answer field
- [ ] Rubric criteria display correctly
- [ ] "Execute Dry Run" button enabled when text entered

### AI Testing
- [ ] Enter a good answer
- [ ] Click "Execute Dry Run"
- [ ] Loading state shows
- [ ] Results appear after ~2-3 seconds
- [ ] Score is correct (should be max points)
- [ ] Criteria breakdown shows
- [ ] AI summary displays
- [ ] Repeat for partial answer (should get 1-2 points)
- [ ] Repeat for bad answer (should get 0 points)

### Audit Trail
- [ ] Open AI Monitoring Dashboard
- [ ] Filter or search for "ADMIN_DRY_RUN"
- [ ] Dry run tests appear in logs
- [ ] Student name shows as "ADMIN_DRY_RUN"

---

## Part 5: End-to-End Student Flow

### Question Creation
- [ ] Create a new Short Answer question
- [ ] Add question text
- [ ] Add model answer
- [ ] Add 3-5 evaluation criteria
- [ ] Add explanation
- [ ] Test with Dry Run Validator
- [ ] Publish to bundle

### Student Experience
- [ ] Log in as student (or test user)
- [ ] Start quiz with Short Answer question
- [ ] Question displays correctly
- [ ] Can type in answer field
- [ ] Character/word counter works
- [ ] Voice input button appears (if enabled)
- [ ] Submit button enabled when answer > 5 chars
- [ ] Click submit

### AI Evaluation
- [ ] Loading indicator shows
- [ ] Evaluation completes in < 5 seconds
- [ ] Results display:
  - [ ] Score shown
  - [ ] Criteria checklist with green checks/gray circles
  - [ ] AI summary displayed
  - [ ] Model answer revealed
  - [ ] Explanation shown
- [ ] "Next Challenge" button appears
- [ ] Click to proceed to next question

### Logging Verification
- [ ] Open AI Monitoring Dashboard
- [ ] Find the student's submission
- [ ] Verify all fields populated:
  - [ ] Student name
  - [ ] Question text
  - [ ] Student answer
  - [ ] AI response
  - [ ] Tokens counted
  - [ ] Latency recorded
  - [ ] Status = success
  - [ ] Valid JSON = true

---

## Part 6: Error Handling & Edge Cases

### Rate Limiting
- [ ] Submit 11 requests in 1 minute (use dry run validator)
- [ ] 11th request should fail with "Rate limit exceeded"
- [ ] Wait 1 minute
- [ ] Next request succeeds

### Invalid Inputs
- [ ] Try submitting empty answer - should be blocked by frontend
- [ ] Try submitting very short answer (< 5 chars) - should be blocked
- [ ] Try submitting very long answer (> 1000 chars) - should work but may be truncated

### AI Failures
- [ ] Temporarily set invalid Gemini API key
- [ ] Submit answer
- [ ] Should see error message
- [ ] Error logged in monitoring dashboard
- [ ] Student sees fallback message

### Network Issues
- [ ] Disable internet briefly
- [ ] Try to submit answer
- [ ] Should see network error
- [ ] Re-enable internet
- [ ] Retry - should work

---

## Part 7: Performance & Monitoring

### Initial Metrics
- [ ] Record baseline metrics:
  - [ ] Average latency: _____ ms
  - [ ] Average tokens: _____ input, _____ output
  - [ ] Cost per evaluation: $_____ 
  - [ ] Success rate: _____%

### Load Testing (Optional)
- [ ] Have 5-10 students submit answers simultaneously
- [ ] All requests complete successfully
- [ ] No rate limit errors (unless > 10 from same user)
- [ ] Latency remains acceptable (< 5 seconds)

### Cost Monitoring
- [ ] Check Gemini API usage in Google Cloud Console
- [ ] Verify costs match estimates
- [ ] Set up billing alerts if needed
- [ ] Export logs for cost analysis

---

## Part 8: Documentation & Training

### Documentation
- [ ] `SHORT_ANSWER_DEPLOYMENT.md` reviewed
- [ ] `SHORT_ANSWER_IMPLEMENTATION_SUMMARY.md` reviewed
- [ ] `SHORT_ANSWER_QUICK_REFERENCE.md` printed/bookmarked
- [ ] All team members have access to docs

### Admin Training
- [ ] Show admins how to:
  - [ ] Create Short Answer questions
  - [ ] Use Dry Run Validator
  - [ ] Access AI Monitoring Dashboard
  - [ ] Export logs to CSV
  - [ ] Interpret AI feedback
  - [ ] Refine rubrics based on results

### Student Communication
- [ ] Prepare announcement about new question type
- [ ] Create tutorial/help doc for students
- [ ] Explain how AI grading works
- [ ] Set expectations for feedback

---

## Part 9: Rollout Plan

### Phase 1: Internal Testing (Week 1)
- [ ] 2-3 admin users test system
- [ ] Create 5-10 test questions
- [ ] Run dry run tests on all questions
- [ ] Submit test answers as students
- [ ] Review all logs in dashboard
- [ ] Document any issues

### Phase 2: Beta Testing (Week 2)
- [ ] Select 10-20 beta students
- [ ] Deploy 1-2 quizzes with Short Answer questions
- [ ] Monitor closely for issues
- [ ] Collect student feedback
- [ ] Review AI feedback quality
- [ ] Adjust rubrics as needed

### Phase 3: Limited Rollout (Week 3)
- [ ] Deploy to 25% of students
- [ ] Monitor costs daily
- [ ] Review success rate
- [ ] Address any issues quickly
- [ ] Gather more feedback

### Phase 4: Full Rollout (Week 4+)
- [ ] Deploy to all students
- [ ] Continue monitoring weekly
- [ ] Refine rubrics based on data
- [ ] Optimize costs if needed
- [ ] Celebrate success! 🎉

---

## Part 10: Post-Deployment

### Week 1 Monitoring
- [ ] Check dashboard daily
- [ ] Review error logs
- [ ] Monitor costs
- [ ] Respond to student questions
- [ ] Adjust rate limits if needed

### Week 2-4 Monitoring
- [ ] Check dashboard 2-3x per week
- [ ] Export logs for analysis
- [ ] Review AI feedback quality
- [ ] Identify common issues
- [ ] Refine rubrics

### Monthly Tasks
- [ ] Export all logs to CSV
- [ ] Analyze cost trends
- [ ] Review success rate trends
- [ ] Update documentation if needed
- [ ] Share insights with team

---

## Rollback Procedure (If Needed)

If critical issues arise:

### Immediate Actions
- [ ] Disable Cloud Function:
  ```bash
  firebase functions:delete evaluateShortAnswer
  ```
- [ ] Disable App Check enforcement in Firebase Console
- [ ] Update `.env.local`:
  ```bash
  VITE_APP_CHECK_ENABLED=false
  VITE_AI_EVALUATION_ENABLED=false
  ```
- [ ] Redeploy frontend:
  ```bash
  npm run build
  firebase deploy --only hosting
  ```

### Communication
- [ ] Notify students of temporary issue
- [ ] Explain what happened
- [ ] Provide timeline for fix
- [ ] Offer alternative assessment if needed

### Investigation
- [ ] Review error logs
- [ ] Identify root cause
- [ ] Develop fix
- [ ] Test fix thoroughly
- [ ] Document issue and resolution

### Re-deployment
- [ ] Deploy fix
- [ ] Test extensively
- [ ] Re-enable features gradually
- [ ] Monitor closely
- [ ] Update documentation

---

## Sign-Off

### Development Team
- [ ] Developer 1: _________________ Date: _______
- [ ] Developer 2: _________________ Date: _______
- [ ] QA Lead: _____________________ Date: _______

### Stakeholders
- [ ] Product Owner: _______________ Date: _______
- [ ] Admin Lead: __________________ Date: _______
- [ ] IT/DevOps: ___________________ Date: _______

---

**Deployment Date**: _______________  
**Deployed By**: _______________  
**Status**: ⬜ Ready | ⬜ In Progress | ⬜ Complete | ⬜ Rolled Back

---

## Notes

Use this space to document any issues, observations, or deviations from the plan:

```
[Add notes here]
```

---

**Last Updated**: 2026-02-07  
**Version**: 1.0
