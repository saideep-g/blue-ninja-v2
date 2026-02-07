# Vocabulary Module - Review Suggestions & Observations

**Document Purpose:** Identify potential improvements, risks, and clarifications for the Vocabulary Requirements  
**Status:** For Discussion  
**Date:** 2026-02-05

---

## 1. CRITICAL CLARIFICATIONS NEEDED

### 1.1 AI Cost Projections Missing
**Issue:** No cost estimates for Gemini API usage  
**Impact:** Budget risk if adoption exceeds expectations  
**Recommendation:**
- Calculate: (10 requests/user/day) × (expected DAU) × (Gemini Flash pricing)
- Define hard monthly budget cap
- Specify what happens when cap is reached (disable AI? throttle users?)

### 1.2 Content Creation Ownership Unclear
**Issue:** Section 17.1 asks "Who creates initial content?" but this blocks launch  
**Impact:** Cannot estimate timeline without knowing content pipeline  
**Recommendation:**
- Decide now: Internal team vs. outsourced content writers
- Define content quality review process
- Estimate: How long to create 1 complete pack (20 roots × 5 levels × 5 questions = 500 questions)?

### 1.3 Offline Mode Edge Case
**Issue:** What if user plays 50 sessions offline and hits AsyncStorage limit?  
**Impact:** Data loss or app crash  
**Recommendation:**
- Define max offline session queue (e.g., 10 sessions)
- Show warning: "Please connect to sync your progress"
- Block new sessions until sync completes

---

## 2. TECHNICAL RISKS

### 2.1 Client-Side Question Generation Complexity
**Concern:** 200ms generation time may be optimistic for complex SRS calculations  
**Risk:** UI lag on older devices (especially Grade 3 tablets)  
**Mitigation:**
- Benchmark on low-end Android tablet (e.g., Samsung Tab A7 Lite)
- Consider pre-generating next session in background after current session ends
- Add loading skeleton if generation takes > 200ms

### 2.2 Firestore Read Costs Underestimated
**Concern:** "1-2 reads per session" assumes perfect caching  
**Risk:** Cache invalidation, version updates, or multi-device usage could spike reads  
**Mitigation:**
- Monitor actual read patterns in pilot phase
- Implement aggressive client-side caching with 7-day TTL
- Add "Download for Offline" button to pre-cache packs

### 2.3 Quarterly Log Rotation Logic Missing
**Concern:** Document says "rotate quarterly" but no implementation details  
**Risk:** App could write to wrong quarter or create duplicate logs  
**Mitigation:**
- Define exact rotation logic: "If current date > Q1 end date, create log_2026_Q2"
- Handle edge case: User plays at 11:59 PM on March 31 (Q1 end)
- Add Cloud Function to auto-create next quarter's log document

---

## 3. UX/DESIGN CONCERNS

### 3.1 Level 5 Failure Mode Confusing
**Issue:** If AI fails, user sees "Good effort! We've recorded your answer"  
**Problem:** Student doesn't know if they were correct or not  
**Recommendation:**
- Change to: "We couldn't grade this right now. Your teacher will review it."
- Add "Pending Review" badge in history
- OR: Fallback to showing model answer and ask for self-assessment

### 3.2 "Retry Queue" Extends Session Unpredictably
**Issue:** Session can grow from 20 to 25+ questions if user makes many mistakes  
**Problem:** Breaks "5-7 minute" session promise for Grade 3  
**Recommendation:**
- Cap retries at 3 per session
- OR: Move retries to "end of session bonus round" (optional)
- Show progress as "18/20 + 2 Bonus" instead of "20/22"

### 3.3 "Wilting Tree" Metaphor May Discourage
**Issue:** Showing trees as "wilting" could feel punishing  
**Problem:** Negative reinforcement vs. positive growth mindset  
**Recommendation:**
- Reframe as "Thirsty Tree" (needs water, not dying)
- OR: Use neutral "Review Available" badge instead of visual decay
- A/B test both approaches in pilot

---

## 4. MISSING REQUIREMENTS

### 4.1 Parental Controls / Monitoring
**Gap:** No mention of parent dashboard or progress sharing  
**User Need:** Parents want to see child's progress (especially Grade 3)  
**Recommendation:**
- Add "Share Progress" feature (email weekly report)
- OR: Parent view in app (read-only access to child's garden)
- Privacy consideration: Require parent email verification

### 4.2 Accessibility: Motor Impairments
**Gap:** Drag-and-drop may be difficult for some Grade 3 students  
**User Need:** Alternative input for students with motor challenges  
**Recommendation:**
- Add "Tap to Select" mode as alternative to drag
- Increase touch target size to 48×48px minimum (currently 44×44px)
- Support external keyboard navigation

### 4.3 Error Recovery: Accidental Close
**Gap:** What if user accidentally closes app mid-session?  
**User Need:** Resume session without losing progress  
**Recommendation:**
- Auto-save session state every 5 questions
- On relaunch, show "Resume Session?" modal
- Expire saved sessions after 24 hours

### 4.4 Competitive/Social Features
**Gap:** No multiplayer, leaderboards, or friend challenges  
**User Need:** Social motivation (especially Grade 7)  
**Recommendation (Future):**
- "Challenge a Friend" mode (same 10 questions, compare scores)
- Class leaderboard (opt-in, teacher-controlled)
- "Study Buddy" feature (practice together via video call)

---

## 5. DATA SCHEMA IMPROVEMENTS

### 5.1 Add "Last Sync" Timestamp
**Why:** Currently no way to detect stale data  
**Add to:** `mastery_snapshot`  
**Field:** `last_synced_at: timestamp`  
**Use:** Show "Synced 5 minutes ago" in UI

### 5.2 Track Question Exposure
**Why:** Prevent same question appearing too frequently  
**Add to:** `word_mastery`  
**Field:** `last_seen_questions: ["q_dict_l1_01", "q_dict_l2_03"]` (max 10)  
**Use:** Filter out recently seen questions in session generator

### 5.3 Capture Device Info in Logs
**Why:** Debug device-specific issues  
**Add to:** `session_history`  
**Fields:** `device_type: "tablet"`, `os_version: "Android 12"`  
**Use:** Analytics to identify performance issues on specific devices

---

## 6. CONTENT QUALITY CONTROLS

### 6.1 Question Difficulty Validation
**Issue:** No mechanism to verify Level 3 is actually harder than Level 2  
**Recommendation:**
- Track accuracy rates per question
- Flag questions with > 90% accuracy as "too easy for this level"
- Admin dashboard shows "Difficulty Mismatch" warnings

### 6.2 Etymology Accuracy Review
**Issue:** Latin/Greek meanings could be incorrect (e.g., "SPECT" has nuances)  
**Recommendation:**
- Require academic source citation for each root
- Peer review by linguist or Latin teacher
- Add "Report Error" button in Library view

### 6.3 Cultural Sensitivity Check
**Issue:** Some words may have different connotations across cultures  
**Recommendation:**
- Review all example sentences for cultural bias
- Avoid idioms that don't translate (e.g., "raining cats and dogs")
- Test with diverse student group in pilot

---

## 7. PERFORMANCE OPTIMIZATIONS

### 7.1 Lazy Load Question Data
**Current:** Pack contains all 500 questions upfront  
**Optimization:** Only load questions for current level  
**Benefit:** Reduce initial pack download from 250KB to ~50KB  
**Trade-off:** Requires additional read when user levels up

### 7.2 Image Compression Strategy Missing
**Issue:** "icon_url" and images could bloat pack size  
**Recommendation:**
- Specify max image size: 50KB per image
- Use WebP format (better compression than PNG/JPG)
- Lazy load images (download on-demand, not with pack)

### 7.3 Batch AI Requests
**Current:** 1 API call per Level 5 question  
**Optimization:** If user answers 3 Level 5 questions, batch into 1 API call  
**Benefit:** Reduce latency and cost  
**Implementation:** Gemini supports batch requests in single payload

---

## 8. SECURITY ENHANCEMENTS

### 8.1 Rate Limiting Too Permissive
**Issue:** "10 AI requests per user/day" could be gamed  
**Attack:** User creates multiple accounts to get unlimited AI grading  
**Recommendation:**
- Add device fingerprinting
- Limit to 10 requests per device per day (not just per user)
- OR: Require phone verification for AI access

### 8.2 Admin Portal Audit Trail
**Issue:** No mention of logging admin actions  
**Risk:** Malicious admin could corrupt content without detection  
**Recommendation:**
- Log all pack edits with timestamp and admin ID
- Immutable audit log (write-only Firestore collection)
- Monthly review of admin activity

---

## 9. TESTING REQUIREMENTS (MISSING)

### 9.1 Unit Test Coverage
**Recommendation:**
- Session Generator: 90% coverage (critical business logic)
- SRS Algorithm: 100% coverage (affects learning outcomes)
- AI Prompt Builder: 80% coverage

### 9.2 Integration Tests
**Scenarios to Test:**
- Offline → Online sync with 10 pending sessions
- User levels up mid-session (auto-progression)
- AI timeout fallback
- Pack version update while user is mid-session

### 9.3 Load Testing
**Scenarios:**
- 1,000 concurrent users finishing sessions (Firestore write spike)
- 10,000 users downloading new pack (Firestore read spike)
- 500 AI requests per minute (Gemini quota)

---

## 10. DOCUMENTATION GAPS

### 10.1 Teacher Onboarding Guide
**Need:** How do teachers assign packs to students?  
**Missing:** Teacher portal requirements  
**Recommendation:** Add Section 19: Teacher Experience

### 10.2 Student Tutorial Flow
**Need:** First-time user experience  
**Missing:** Onboarding screens, tooltips, tutorial session  
**Recommendation:** Define 5-screen tutorial for new users

### 10.3 API Documentation
**Need:** Gemini integration details  
**Missing:** Exact API endpoint, headers, error codes  
**Recommendation:** Add Appendix D: API Specifications

---

## 11. PRIORITIZATION SUGGESTIONS

### Must-Have for MVP (Phase 1-2 Launch)
- ✅ All 5 levels working
- ✅ Offline mode
- ✅ Garden dashboard
- ✅ 2 packs (Grade 3 & 7)
- ⚠️ AI grading (can fallback to MCQ if needed)

### Should-Have for Full Launch (Phase 3-4)
- Practice history
- Root library
- Admin CMS
- AI grading (stable)

### Nice-to-Have (Post-Launch)
- Parent dashboard
- Social features
- Advanced analytics
- Multi-language support

---

## 12. COST ESTIMATE (ROUGH)

### Development Time
- Frontend (React Native): 8-10 weeks
- Backend (Firebase setup): 2-3 weeks
- Admin CMS: 4-5 weeks
- AI Integration: 2 weeks
- Testing & QA: 3-4 weeks
- **Total:** 19-24 weeks (5-6 months)

### Ongoing Costs (Monthly, 10,000 active users)
- Firestore: ~$50-100 (with caching)
- Gemini API: ~$200-500 (10 requests/user/day, 30% adoption of Level 5)
- Firebase Hosting: ~$25
- **Total:** ~$275-625/month

### Content Creation (One-Time)
- 1 Pack (20 roots, 500 questions): 40-60 hours
- If outsourced at $50/hour: $2,000-3,000 per pack
- Need 4 packs for launch: $8,000-12,000

---

## SUMMARY OF KEY RECOMMENDATIONS

### 🔴 High Priority (Blockers)
1. **Decide content creation ownership** (Section 1.2)
2. **Define AI budget cap** (Section 1.1)
3. **Clarify offline session limits** (Section 1.3)
4. **Add quarterly log rotation logic** (Section 2.3)

### 🟡 Medium Priority (Quality)
5. **Improve AI failure UX** (Section 3.1)
6. **Cap retry queue** (Section 3.2)
7. **Add parent progress sharing** (Section 4.1)
8. **Track question exposure** (Section 5.2)

### 🟢 Low Priority (Nice-to-Have)
9. **Batch AI requests** (Section 7.3)
10. **Add social features** (Section 4.4)
11. **Multi-language support** (Section 17.3)

---

**END OF SUGGESTIONS DOCUMENT**
