# Vocabulary Requirements Update Summary

**Document:** VOCABULARY_REQUIREMENTS.md  
**Version:** 1.0 → 1.1  
**Date:** 2026-02-05  
**Status:** Changes Incorporated

---

## Changes Made (Based on Stakeholder Approval)

### 1. ✅ Deployment Context Added
**Location:** Document Header (after version info)

**Added:**
> This application is developed by a parent (admin) for use by 3-5 students within a close family. All students have access to latest hardware (Mobile for Grade 3+, Tablet for Grade 7+) and stay together, allowing the admin to directly review performance with students.

**Impact:** Clarifies that this is a family deployment, removing concerns about:
- Security at scale
- Performance on low-end devices
- Remote monitoring requirements

---

### 2. ✅ AI Failure Fallback → Self-Assessment
**Location:** Section 6.3 (Level 5 UI), Section 10.4 (AI Latency Management)

**Changed From:**
- "Good effort! We've recorded your answer." (Fail Open)

**Changed To:**
- Display model answer and evaluation criteria
- Prompt student: "Based on the criteria, how many points do you deserve? (0-3)"
- Numeric input for self-grading
- Log with `isSelfEvaluated: true` flag

**Impact:** 
- Students learn from model answers even when AI fails
- Maintains educational value during downtime
- Tracks self-assessed vs AI-assessed questions

---

### 3. ✅ "Wilting Tree" → "Thirsty Tree" (Positive Reinforcement)
**Location:** Section 6.1 (Garden Dashboard - Root Card States)

**Changed From:**
- Wilting/Decaying visual for trees needing review

**Changed To:**
- 💧 "Thirsty Tree" with water droplet badge
- Subtext: "Review Available"
- Neutral/positive framing

**Rationale:** 
> The "Thirsty Tree" state replaces the original "Wilting Tree" concept to maintain positive reinforcement. Trees that haven't been reviewed in > 7 days show a water droplet badge, indicating they need attention without negative connotation.

**Impact:** Encourages review without discouragement

---

### 4. ✅ Drag-and-Drop → Tap-to-Fill
**Location:** Section 2.3 (Mastery Ladder Table), Section 4.1 (Grade 3 Requirements), Section 6.3.2 (Level 2 UI)

**Changed From:**
- "Drag syllable blocks `[IN]` `[SPECT]`"
- Drag-and-drop interaction

**Changed To:**
- **"Tap-to-Fill:** Tap syllable options to fill blanks"
- Detailed interaction flow:
  - Blank highlighted with pulsing border
  - Tap syllable → fills blank in Blue (draft state)
  - Auto-advance to next blank
  - Tap filled blank to change selection
  - Submit → Green (correct) / Red (incorrect)
- Reference to full spec: `docs/TAP_TO_FILL.md`

**Impact:** 
- Simpler interaction (no drag precision needed)
- Follows existing TAP_TO_FILL pattern
- Better for touch screens

---

### 5. ✅ Question Exposure Tracking
**Location:** Section 5.3 (User Mastery Snapshot Schema), Section 7.2 (Session Builder Algorithm)

**Added to `word_mastery` Schema:**
```json
"verdict": {
  "strength": 4,
  "next_review_due": "2026-02-12",
  "error_count": 1,
  "last_seen_questions": ["q_dict_l1_01", "q_dict_l3_05"]  // ← NEW
}
```

**Added Algorithm Logic:**
- **Purpose:** Prevent same question appearing too frequently
- **Max Size:** 10 question IDs per word
- **Filter Logic:**
  1. Prefer questions NOT in `last_seen_questions`
  2. If all seen recently, select oldest (FIFO)
  3. After session, append new IDs (trim to 10)

**Impact:** Ensures variety across sessions for same word

---

### 6. ✅ Image Compression & Optimization
**Location:** Section 5.2 (Curriculum Pack Schema)

**Added Requirements:**
- **Format:** WebP (better compression than PNG/JPG)
- **Max Size:** 50KB per image
- **Loading Strategy:** Lazy load (download on-demand, not bundled)
- **Storage:** `gs://bucket/icons/` references (not embedded base64)

**Impact:** 
- Reduces pack download size
- Faster initial load
- Better performance on mobile

---

### 7. ✅ AI Cost Tracking Reference
**Location:** Section 10.5 (Cost Control & Monitoring)

**Added:**
- **Reference:** Follows same pattern as `docs/SHORT_ANSWER.md`
- **Admin Log Path:** `admin/{adminId}/ai_monitoring_logs/{YYYY-QTR}`
- **Tracked Metrics:** 
  - `date`, `studentId`, `questionId`
  - `inputText`, `outputText`
  - `responseTime`, `inputTokensCount`, `outputTokensCount`
  - `isSuccess`, `errorMessage`
- **Purpose:** Track API usage, costs, performance issues

**Impact:** Consistent monitoring across all AI features

---

### 8. ✅ Device Target Clarification
**Location:** Section 1.3 (Target Devices)

**Changed From:**
- Grade 3: Tablet (Primary), Landscape
- Grade 7: Mobile/Tablet, Portrait

**Changed To:**
- Grade 3+: Mobile (Primary)
- Grade 7+: Tablet (Primary)

**Impact:** Aligns with stakeholder's hardware setup

---

## Summary of Improvements

| Category | Change | Benefit |
|:---------|:-------|:--------|
| **Context** | Added family deployment note | Removes unnecessary enterprise concerns |
| **UX** | AI failure → Self-assessment | Maintains learning during downtime |
| **UX** | Wilting → Thirsty tree | Positive reinforcement |
| **Interaction** | Drag → Tap-to-Fill | Simpler, touch-friendly |
| **Algorithm** | Question exposure tracking | Prevents repetition |
| **Performance** | Image optimization | Faster load, smaller packs |
| **Monitoring** | AI cost tracking | Consistent with SHORT_ANSWER |
| **Hardware** | Device clarification | Matches actual setup |

---

## Files Modified

1. **VOCABULARY_REQUIREMENTS.md** (Main document)
   - Version: 1.0 → 1.1
   - 8 sections updated
   - 1 new section added (Question Exposure Tracking)

2. **VOCABULARY_SUGGESTIONS.md** (Unchanged)
   - Remains as reference for future improvements
   - Stakeholder can review remaining suggestions later

---

## Next Steps

1. ✅ **Review Updated Requirements** - Stakeholder to review v1.1
2. ⏳ **Sign-Off** - Obtain approvals from all stakeholders
3. ⏳ **Implementation Planning** - Break down into development tasks
4. ⏳ **Content Creation** - Begin creating first curriculum pack

---

**Document Status:** Ready for Final Review & Sign-Off
