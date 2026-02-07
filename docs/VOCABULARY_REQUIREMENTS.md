# Root Mastery Vocabulary Module - Requirements Document

**Version:** 1.1  
**Last Updated:** 2026-02-05  
**Status:** Draft for Review & Sign-off

**Deployment Context:** This application is developed by a parent (admin) for use by 3-5 students within a close family. All students have access to latest hardware (Mobile for Grade 3+, Tablet for Grade 7+) and stay together, allowing the admin to directly review performance with students.

---

## 1. EXECUTIVE SUMMARY

### 1.1 Objective
Integrate a "Root-Based" vocabulary module that shifts learning from rote memorization to **generative root mastery**. Students learn one root (e.g., *SPECT*) to unlock dozens of related words (e.g., *Inspect, Retrospect*).

### 1.2 Target Audience
- **Grade 3-5:** Emerging readers transitioning to chapter books. Focus on morphology (prefixes/suffixes) and concrete roots.
- **Grade 6-10:** Middle and high schoolers preparing for college texts. Focus on abstract roots, etymology, and academic nuance (Tier 2/3 words).

### 1.3 Target Devices
- **Grade 3+:** Mobile (Primary)
- **Grade 7+:** Tablet (Primary)

### 1.4 Technology Stack
- **Frontend:** React Native / React Web
- **Backend:** Firebase (Firestore, Auth, Cloud Functions)
- **AI:** Google Gemini Flash (for Level 5 assessment only)
- **Audio:** Native OS Text-to-Speech (TTS)
- **Search:** Client-side Fuse.js (Fuzzy search)

---

## 2. PEDAGOGICAL APPROACH

### 2.1 Core Concept: Generative Learning
Unlike traditional flashcards, this module treats a **Root** as a "Key" that unlocks a "Room" of words. Mastery is tracked at the **Root** level, not just the **Word** level.

### 2.2 The Learning Loop
1. **Introduce:** The Root (e.g., *SPECT* = To Look)
2. **Expand:** Show 3-5 words derived from it (e.g., *Inspect, Spectator, Respect*)
3. **Scaffold:** Move student through 5 distinct cognitive levels
4. **Generative Check:** Test if student can decipher a new word using the root

### 2.3 The 5-Level Mastery Ladder

Every Root must have questions for all 5 levels:

| Level | Name | Cognitive Skill | Activity Description | Grade 3 Implementation | Grade 7 Implementation |
|:------|:-----|:----------------|:---------------------|:-----------------------|:-----------------------|
| **1** | **The Detective** | **Recognition** (Passive) | Identifying the correct word when visible | Word Bank: 3 large buttons with images | Context Clues: Select word based on paragraph |
| **2** | **The Builder** | **Recall** (Active) | Constructing the word from memory with hints | **Tap-to-Fill:** Tap syllable options to fill blanks `[IN]` `[SPECT]` | Typing: Keyboard input with root hint |
| **3** | **The Editor** | **Precision** (Nuance) | Identifying correct vs. incorrect usage | True/False: "A Spectator plays the game" | Error Spotting: Fix incorrect word in sentence |
| **4** | **The Logic Master** | **Connection** (Logic) | Relational thinking and analogies | Grouping: "Which word belongs with Eyes?" | Analogies: "Ear:Audio :: Eye:____" |
| **5** | **The Author** | **Synthesis** (Creative) | Spontaneous usage in original context | Sentence Builder: Arrange scrambled words | Open Response: Write sentence (AI graded) |

---

## 3. GAMIFICATION STRATEGY

### 3.1 Visual Metaphor: "The Garden of Knowledge"

Root mastery is visualized through tree growth stages:

| Icon | State | Description | Level Range |
|:-----|:------|:------------|:------------|
| 🟤 | **The Seed** | Locked/New - Root assigned but untouched | Level 0 |
| 🌱 | **The Sprout** | Learning - Engaging with basic questions | Levels 1-2 |
| 🌿 | **The Sapling** | Growing - Tackling nuance and logic | Levels 3-4 |
| 🌳 | **The Mighty Oak** | Mastered - Passed Level 5 | Level 5 Complete |

**Maintenance Mode:** Mastered trees occasionally drop "Golden Leaves" (Review Questions).

### 3.2 Progress Metrics
- **Avoid:** Only tracking "Days Played"
- **Emphasize:** "Trees Grown" - Students feel pride in having a "Forest of 10 Trees" (10 Roots mastered)

---

## 4. GRADE-LEVEL DIFFERENTIATION

### 4.1 Grade 3 Requirements (Tactile & Concrete)
- **Visuals:** Every Root introduction must include an illustration (e.g., *STRUCT* shows construction site)
- **Input:** Minimize typing. Use **Tap-to-Fill** interaction (see Section 6.3.2), tap-to-select, syllable blocks
- **Feedback:** Instant visual rewards (stars, animations) after every question
- **Session Length:** Maximum 5-7 minutes (approximately 10 questions)
- **Font Size:** Minimum 24sp (Dyslexia-friendly font option recommended)

### 4.2 Grade 7 Requirements (Abstract & Efficient)
- **Visuals:** Clean, minimal iconography. Focus on etymology trees (Latin/Greek origin)
- **Input:** Standard keyboard typing and multi-select
- **Feedback:** Progress bars and "Accuracy %". Rewards at end of session
- **Session Length:** 10-15 minutes (approximately 20 questions)
- **Font Size:** Minimum 16sp (Standard Sans Serif)

---

## 5. DATA ARCHITECTURE

### 5.1 Firestore Collections Strategy

Three distinct data categories:
1. **Static Content (`curriculum_packs`):** The "Textbook" - Read-heavy, rarely written
2. **User State (`students/stats/mastery_snapshot`):** The "Save File" - Read/Write every session
3. **Analytics (`students/logs/...`):** The "Audit Trail" - Write-only (append), rarely read

### 5.2 Curriculum Pack Schema

**Path:** `/curriculum_packs/{pack_id}`  
**Document ID Convention:** `pack_{grade}_{sequence}` (e.g., `pack_g07_01`)  
**Access Pattern:** Read 1 document on App Launch (Cached for offline use)

**Image Optimization Requirements:**
- **Format:** WebP (better compression than PNG/JPG)
- **Max Size:** 50KB per image
- **Loading Strategy:** Lazy load images (download on-demand, not bundled with pack)
- **Icon URLs:** Store as `gs://bucket/icons/` references, not embedded base64

```json
{
  "pack_id": "pack_g07_01",
  "title": "Foundations of Logic",
  "grade_level": 7,
  "version": 1.2,
  "description": "Essential roots for academic argumentation",
  
  "roots": {
    "root_dict": {
      "name": "Dict",
      "meaning": "To Speak / Say",
      "etymology": "Latin (dicere)",
      "icon_url": "gs://bucket/icons/dict_speaker.png",
      
      "words": {
        "verdict": {
          "definition": "A final decision or judgment",
          "part_of_speech": "noun",
          "tier": 2,
          "audio_url": "gs://bucket/audio/verdict.mp3"
        },
        "predict": { }
      },

      "levels": {
        "1": [
          {
            "id": "q_dict_l1_01",
            "type": "mcq_context",
            "question_text": "The judge read the __ aloud.",
            "correct_word": "verdict",
            "distractors": ["predict", "contradict"]
          }
        ],
        "2": [
          {
            "id": "q_dict_l2_01",
            "type": "fill_hint",
            "hint_root": "DICT",
            "sentence": "I pre___ that it will rain.",
            "answer": "predict"
          }
        ]
      }
    }
  }
}
```

**Size Constraints:**
- Pack with 20 Roots × 5 Levels × 5 Questions = ~500 Questions
- Estimated JSON size: 150KB - 250KB (Safe within 1MB Firestore limit)

### 5.3 User Mastery Snapshot Schema

**Path:** `/users/{user_id}/stats/mastery_snapshot`  
**Purpose:** Stores current progress. Only document read to build Dashboard/Garden  
**Size Constraint:** Even with 5 years of data, remains under 300KB

```json
{
  "uid": "user_12345",
  "current_grade": 7,
  "last_active_timestamp": 1765432100,

  "content_state": {
    "current_pack_id": "pack_g07_01",
    "completed_packs": []
  },

  "active_queue": ["root_dict", "root_spect"],
  
  "root_progress": {
    "root_dict": {
      "status": "active",
      "current_level": 2,
      "level_progress_percent": 60,
      "questions_answered_total": 15,
      "last_played": "2026-02-05"
    },
    "root_spect": {
      "status": "mastered",
      "current_level": 5,
      "mastery_date": "2026-01-20"
    }
  },

  "word_mastery": {
    "verdict": {
      "strength": 4,
      "next_review_due": "2026-02-12",
      "error_count": 1,
      "last_seen_questions": ["q_dict_l1_01", "q_dict_l3_05"]
    },
    "predict": {
      "strength": 1,
      "next_review_due": "2026-02-06",
      "last_seen_questions": ["q_dict_l2_01"]
    }
  }
}
```

### 5.4 Activity Logs Schema (Quarterly Buckets)

**Path:** `/users/{user_id}/activity_logs/log_{YYYY}_Q{1-4}`  
**Write Strategy:** Use `arrayUnion` to append sessions (1 write per session instead of 1 per question)  
**Capacity:** Max 1MB limit ≈ 2,000 sessions per quarter

```json
{
  "period": "2026_Q1",
  "student_id": "user_123",
  "created_at": 1765432100,
  
  "session_history": [
    {
      "sess_id": "uuid_v4_string",
      "ts_start": 1765432100,
      "ts_end": 1765432500,
      "roots_practiced": ["root_spect", "root_dict"],
      "final_score": 18,
      "xp_earned": 150,
      
      "q_data": [
        { "r": "spect", "l": 2, "w": "inspect", "c": 1, "t": 3200 },
        { "r": "dict", "l": 3, "w": "verdict", "c": 0, "t": 5100 }
      ]
    }
  ]
}
```

**Key Compression:** Minified keys to save space (r=root, l=level, w=word, c=correct, t=time)

### 5.5 Data Access Patterns

| Action | Path | Operation | Frequency |
|:-------|:-----|:----------|:----------|
| App Launch | `students/{uid}/stats/mastery_snapshot` | READ (1) | Once per session |
| Load Content | `curriculum_packs/{pack_id}` | READ (1) | Only if pack changed or cache expired |
| Finish Session | `students/{uid}/stats/mastery_snapshot` | WRITE (1) | Updates levels & SRS dates |
| Log History | `students/{uid}/activity_logs/log_...` | WRITE (1) | Appends session details |

### 5.6 Firestore Indexes Required
1. **Composite Index:** `students/{uid}/activity_logs` → Fields: `period` (Asc) + `timestamp` (Desc)
2. **Collection Group Index:** None required (all reads are direct ID lookups)

---

## 6. USER INTERFACE REQUIREMENTS

### 6.1 The "Garden" Dashboard (Home Screen)

**Purpose:** Central hub where students track mastery  
**Data Source:** `mastery_snapshot` document (Fast Read)

**Layout:**
- Scrollable grid of "Root Cards"
- Header Stats:
  - Watering Can Icon: Daily Streak (e.g., "3 Day Streak")
  - Golden Leaf Icon: Total Roots Mastered (e.g., "12/50")

**Root Card States:**

| State | Icon Visual | Subtext | Interaction |
|:------|:------------|:--------|:------------|
| Locked | 🟤 Brown Seed (Padlock) | "Unlocks at Lvl 5" | Tapping shakes lock (Haptic feedback) |
| New | 🌱 Tiny Sprout | "New!" | Opens Intro Lesson (Video/Slide) |
| Active | 🌿 Growing Sapling | "Lvl 2 - Builder" | Opens Quiz Session |
| Needs Review | 💧 Thirsty Tree (Water droplet badge) | "Review Available" | Opens targeted review session |
| Mastered | 🌳 Golden Oak Tree | "Mastered" | Opens Review Mode (Hard questions) |

**Note:** The "Thirsty Tree" state replaces the original "Wilting Tree" concept to maintain positive reinforcement. Trees that haven't been reviewed in > 7 days show a water droplet badge, indicating they need attention without negative connotation.

**"Next Step" FAB (Floating Action Button):**
- Logic: Uses `active_queue` from mastery snapshot
- Label: "Continue Journey" (G7) or "Play!" (G3)
- Action: Immediately launches Generated Quiz Session

### 6.2 Quiz Interface (Session View)

**Global Elements (Always Visible):**
- **Top Bar:**
  - Progress: Segmented bar (1-20 segments). Fills green/red as they answer
  - Close Button: "X" (Triggers "Save progress?" modal)
- **The Stage (Center):** Where question template renders
- **The Dock (Bottom):** Input area (Keyboard, Drag Tray, or Buttons)

### 6.3 Level-Specific UI Templates

#### Level 1: The Detective (Recognition)

**Grade 3 UI (Tablet):**
- Stage: Large illustration + Sentence: "He checked the ___"
- Dock: 3 Large "Card" Buttons with Images + Text

**Grade 7 UI (Mobile):**
- Stage: Short text paragraph with context clue highlighted
- Dock: Standard 4-option Vertical List (Text Only)

#### Level 2: The Builder (Recall/Morphology)

**Grade 3 UI (Tap-to-Fill):**
- **Stage:** Sentence: "The teacher asked for ___" (Target: *Silence*)
- **Dock:** Dynamic option tray showing syllable options: `[SIL]` `[ENCE]` `[LENT]`
- **Interaction:** 
  - Blank is highlighted (pulsing border)
  - User taps a syllable option (e.g., `[SIL]`)
  - Selected syllable fills the blank in **Blue** (draft state)
  - Focus auto-advances to next blank
  - User can tap filled blank to change selection
  - "Check Answer" button enabled when all blanks filled
  - On submit: Correct syllables turn **Green**, incorrect turn **Red**
- **Reference:** Full Tap-to-Fill specification in `docs/TAP_TO_FILL.md`

**Grade 7 UI (Ghost Typing):**
- Stage: Sentence: "The judge gave the `VER____`"
- Dock: QWERTY Keyboard
- Interaction: User types `DICT`. Success = Green flash

#### Level 3: The Editor (Nuance/Correction)

**UI (Shared):** "Tinder-style" Card Stack or Split View  
**Content:** "The **Spectator** played the game."

**Interaction:**
- Grade 3: Two giant buttons: 👍 (Yes) / 👎 (No)
- Grade 7: Tap the incorrect word in sentence to fix it

#### Level 4: The Logic Master (Analogies)

**UI:** 2×2 Grid Layout

**Visual:**
```
[ Ear ] → [ Audio ]
[ Eye ] → [   ?   ]
```

**Interaction:** Tap correct word from bottom tray to fill empty box

#### Level 5: The Author (Synthesis/Creative)

**UI:** Chat Interface  
**Stage:** Prompt: "Write a sentence using *INSPECT*"  
**Dock:** Text Field + "Check" Button

**Feedback States:**
- **Loading:** "AI is reading..." (3s delay)
- **Success:** "Great job! +50 XP" (AI validated)
- **AI Failure/Timeout:** Fallback to self-assessment mode:
  - Display: "We couldn't reach the AI grader. Please review the model answer below."
  - Show: Model answer and evaluation criteria
  - Prompt: "Based on the model answer, how many points do you deserve? (0-3)"
  - Input: Numeric slider or buttons
  - Log: Mark entry as `isSelfEvaluated: true` in session data
- **Retry:** "Try again: Ensure you use the word as a Verb" (AI feedback)

### 6.4 Feedback & Transition Design

#### Immediate Feedback (Post-Answer)

**Correct:**
- Sound: Pleasant "Ding"
- Visual: Screen flashes soft green
- Transition: Next question slides in from right

**Incorrect:**
- Sound: Soft "Thud"
- Visual: Screen shakes slightly
- Remediation: Definition Card slides up from bottom
  - "Oops! *Spectator* means someone who WATCHES. Try again."
- Interaction: User must tap "Got it" to proceed

#### "Level Up" Moment

**Trigger:** Algorithm detects Level Jump (e.g., L1 → L2)

**Animation:**
- Confetti bursts from Progress Bar
- Overlay Modal: "Level Up! You are now a Builder"
- Icon: Root Icon transforms (Seed cracks open → Sprout)

### 6.5 Practice History (The Journal)

**Access:** "History" tab or "Journal" icon  
**Data Source:** `activity_logs` collection with pagination  
**Initial Load:** Current Quarter log document, parse last 20 sessions

**Session Card (Summary Item):**
- Date/Time: "Today, 10:30 AM" or "Feb 5"
- Focus: Icons of Roots practiced (e.g., [SPECT] [DICT])
- Score: Large percentage (e.g., "85%")
- Visual Indicator:
  - Green Border: Perfect score
  - Yellow Border: Good practice
  - Red Dot: Struggles detected

### 6.6 Detailed Session Review (Drill-Down)

**Triggered:** When student taps Session Card in History

**Header:** "Session Analysis - 4m 20s Duration"

**Question Detail Row:**

**State A (Correct):**
- Compact row
- Text: "Q4: **Predict** (Fill-in) - ✅"

**State B (Incorrect):**
- Expanded row (Highlighted Red)
- Question: "The judge read the ___"
- Your Answer: "Spectator" (Strikethrough)
- Correct Answer: "Verdict"
- Time Taken: "12s" (Shows hesitation)
- Action: "Flag" button to bookmark word for later

### 6.7 Accessibility Requirements

**Text-to-Speech (TTS):**
- Every Root/Word card must have "Speaker" icon
- Use native OS TTS (Android/iOS) to save bandwidth
- Configuration:
  - Rate: 0.8× (Slightly slower for clarity)
  - Pitch: 1.0 (Neutral)

**Color Blindness:**
- Never rely on Green/Red alone
- Use Icons (Checkmark / X) alongside colors

**Font Requirements:**
- Grade 3: Minimum 24sp (Dyslexia-friendly font option)
- Grade 7: Minimum 16sp (Standard Sans Serif)

**"Tap to Hear" UX:**
- Location: Every Word Card in Library and Question Header in Quiz
- Icon: Speaker symbol
- Action: Highlights text being spoken (Karaoke style) if possible

---

## 7. DYNAMIC QUESTION GENERATION ENGINE

### 7.1 Objective
Algorithmically generate unique, personalized quiz sessions balancing spaced repetition (Review) with new skill acquisition (Growth).

**Technical Constraint:** Must run 100% client-side using cached data  
**Latency Goal:** Quiz generation time < 200ms

### 7.2 Session Builder Algorithm

**Inputs:**
1. User Snapshot: `active_queue`, `mastered_roots`, `word_mastery` (SRS Scores)
2. Curriculum Pack: Static Question Bank
3. Session Config: `total_questions` (Default: 20), `review_ratio` (Default: 0.5)

**Bucket Allocation Logic:**

**Bucket A: "Iron" Slot (Maintenance) - 50% (10 Questions)**
- Source: `mastered_roots` (Level 5 Completed)
- Filter: ONLY Difficulty Level 3, 4, or 5
- Priority Sort:
  1. Weakest Words: `strength < 3` (SRS logic)
  2. Oldest Mastered: Roots not seen in > 14 days
  3. Random Challenge: If all strong, pick random Level 4 (Analogy)

**Bucket B: "Growth" Slot (Progression) - 50% (10 Questions)**
- Source: `active_queue` (Roots currently in L1-L4)
- Filter:
  - 70% at `current_level` (Reinforcement)
  - 30% at `current_level + 1` (Stretch Goal)
- Priority Sort:
  1. New Words: `strength == 0`
  2. Recent Errors: Words marked "Incorrect" in last session

**No-Repeat Rule:**
- Same word cannot appear twice in 20-question session unless it's a "Retry"
- If `active_queue` is small (only 1 root), pull from `mastered_roots` to fill gap

**Question Exposure Tracking:**
- **Purpose:** Prevent same question appearing too frequently across sessions
- **Implementation:** Use `last_seen_questions` array in `word_mastery` (max 10 question IDs)
- **Filter Logic:** When selecting questions for a word:
  1. Check if question ID exists in `last_seen_questions` array
  2. Prefer questions NOT in the array
  3. If all questions have been seen recently, select oldest (FIFO)
  4. After session ends, append new question IDs to array (trim to max 10)
- **Benefit:** Ensures variety even when practicing same word multiple times

### 7.3 In-Session Logic

**Auto-Progression (Level Up Trigger):**
- State Tracking: Maintain temporary counter `consecutive_correct_per_root`
- Rule: If `consecutive_correct_per_root >= 3`:
  - Look ahead in queue
  - Find next question for that Root
  - Upgrade to next Difficulty Level
  - Display "Level Up!" toast notification

**Retry Queue (Immediate Remediation):**
- Trigger: User answers question incorrectly
- Action:
  1. Show Correction Card immediately
  2. Clone the question
  3. Insert clone 10 slots later (Spaced repetition)
  4. Note: This extends session from 20 to 21 questions

### 7.4 Edge Case Handling

**New User State (Empty Mastered List):**
- Scenario: User just joined, `mastered_roots` is empty
- Fallback: `review_ratio` becomes 0.0
- Allocation: 100% questions from `active_queue`
- Flow: Rapidly cycle L1 (Recognition) → L2 (Recall) for first 3 roots

**Empty Queue State (All Mastered):**
- Scenario: User mastered all 20 roots in pack
- Action:
  1. Show "Pack Complete!" Celebration
  2. Force "Mastery Mode" (100% Hard Questions)
  3. Prompt user to download/unlock "Pack 2"

**Data Mismatch (Missing Questions):**
- Scenario: User is Level 4, but Pack only has questions up to Level 3
- Fallback: Downgrade to Level 3. Never show empty screen or error

### 7.5 Session Output Object

```json
{
  "session_id": "temp_sess_123",
  "config": { "allow_retry": true },
  "queue": [
    {
      "q_index": 1,
      "source": "bucket_a",
      "root_id": "root_spect",
      "level": 4,
      "type": "analogy_drag",
      "data": { }
    },
    {
      "q_index": 2,
      "source": "bucket_b",
      "root_id": "root_dict",
      "level": 1,
      "type": "mcq_image",
      "data": { }
    }
  ]
}
```

---

## 8. ASSESSMENT & ANALYTICS

### 8.1 Write Optimization Strategy

**Key Strategy:** "Session Batching"  
- Do NOT write to database after every question
- Store results locally in Redux/State
- Perform **single write** at end of 20-question session or if the session is interrupted or not completed. When they open the app again, the session should resume from where it left off. However, they open the app next day, the previous days session should be synced with DB and fresh session should start based on the date in the device.

### 8.2 Metric Calculation Logic

**Update Payload (Calculated locally at session end):**

**Word Strength (SRS):**
- If Correct: Increment strength (+1)
- If Incorrect: Reset strength to 0 or 1
- Calculate `next_review_date`

**Root Mastery:**
- Calculate `accuracy_last_10_attempts` for Root
- Trigger: If > 80% AND Level < 5 → Increment `current_level`

**Global Stats:**
- Increment `total_questions_answered`
- Add `session_duration` to `total_time_spent`

### 8.3 Batch Write Operation

**Atomic Operation (Both writes succeed or both fail):**

```javascript
const batch = firestore.batch();

// 1. Append Log (History)
const logRef = db.doc(`students/${uid}/activity_logs/log_2026_Q1`);
batch.update(logRef, {
  session_history: firebase.firestore.FieldValue.arrayUnion(newSessionData)
});

// 2. Update Profile (Live State)
const profileRef = db.doc(`students/${uid}/stats/mastery_snapshot`);
batch.update(profileRef, {
  "root_progress.root_spect.accuracy": 85,
  "root_progress.root_spect.current_level": 3,
  "word_mastery.inspect.strength": 4,
  "word_mastery.inspect.next_review": "2026-02-12"
});

await batch.commit();
```

### 8.4 Offline Mode Support

**Detection:** App detects "No Connection"  
**Storage:** Session data saved to AsyncStorage (Local Device Storage) as "Pending Log"  
**Queue:** App allows multiple sessions offline  
**Sync:** When connection restored:
- Read AsyncStorage
- Batch all pending logs
- Perform one massive `arrayUnion` to Firestore

### 8.5 Analytics Dashboard (Teacher/Admin View)

**Metrics to Derive:**

**Time on Task:**
- Sum of `ts_end - ts_start`

**Trouble Spots:**
- Identify Words where `c` (correct) is consistently 0

**Root Velocity:**
- How many days from Level 1 to Level 5?
- Calculation: `Timestamp(Level 5) - Timestamp(First Interaction)`

**Data Retention Policy:**
- Active Logs: Current Quarter in "Hot Storage" (Firestore)
- Archived Logs: Old Quarters kept in Firestore
- Can move to "Cold Storage" (BigQuery/Storage Bucket) if user hits 10MB

---

## 9. ROOT DISCOVERY LIBRARY

### 9.1 Purpose
Searchable "Encyclopedia of Roots" for self-directed learning without quiz pressure.

### 9.2 UI Structure

**Entry Point:** "Library" Tab in bottom navigation  
**Search Bar:** "Search for a root (e.g., Spect) or word (e.g., Inspector)..."  
**Filter Chips:** [Show All] [My Mastered] [Locked] [Grade 7 Only]

### 9.3 Family Tree Visualization

**When user selects a Root:**
- Central Node: The Root (e.g., *STRUCT*)
- Branches: Derived words (e.g., *Construct*, *Structure*, *Instruct*)

**Interaction:**
- Tapping Word Node opens "Definition Card" overlay
- "Audio" Button: Triggers native TTS to pronounce word
- "Practice" Button: Launches quiz focused only on this Root

### 9.4 Technical Implementation

**Data Source:** Aggregates data from all downloaded `curriculum_packs`  
**Optimization:** Creates local search index on app launch (0 network calls)  
**Search Technology:** Client-side Fuse.js (Fuzzy search)

---

## 10. AI INTEGRATION (GEMINI)

### 10.1 Scope
Strictly limited to Level 5 ("The Author") to manage costs and complexity.

### 10.2 Use Case
**Task:** "Write a sentence using **Benevolent** that demonstrates understanding"  
**Problem:** Regex cannot grade this. "Contains keyword" check is insufficient  
**Solution:** Generative AI evaluation

### 10.3 Gemini Prompt Strategy

**Input Payload:**
```json
{
  "root": "Bene (Good)",
  "target_word": "Benevolent",
  "student_input": "The benevolent king gave food to the poor.",
  "grade_level": 7
}
```

**System Prompt:**
```
You are a vocabulary teacher. Evaluate the student's sentence.
1. Is the target word used correctly? (Boolean)
2. Does the context prove understanding? (Score 1-5)
   'I am benevolent' is a 1. 'The benevolent king gave food' is a 5.
3. Provide short feedback.
Output JSON only.
```

**Expected AI Response:**
```json
{
  "is_correct": true,
  "quality_score": 5,
  "feedback": "Excellent! 'Gave food' perfectly matches the meaning of benevolent."
}
```

### 10.4 UX: Latency Management

**State 1 (Submit):** User hits "Check"  

**State 2 (Thinking):** Show animation: "Reading your sentence..." (Skeleton loader)
- **Timeout Safety:** If API takes > 5 seconds, trigger self-assessment fallback

**State 3A (AI Success):** Display AI's specific feedback text in bubble

**State 3B (AI Failure - Self-Assessment Fallback):**
1. Display message: "We couldn't reach the AI grader right now. Please compare your answer with the model answer below."
2. Show:
   - **Model Answer:** The ideal sentence using the target word
   - **Evaluation Criteria:** Key points the answer should demonstrate
3. Self-Evaluation Input:
   - Prompt: "Based on the criteria, how many points do you deserve?"
   - Input: Numeric input field (0 to max_points)
   - Instruction: "Be honest! This helps you learn."
4. On Submit:
   - If student enters full `max_points`, mark as `isCorrect: true`
   - Store score in `score` field
   - Set `isSelfEvaluated: true` in session log
   - Set `isSuccess: false` (to indicate AI didn't grade it)
5. Continue to next question normally

### 10.5 Cost Control & Monitoring

**Caching:**
- If student types exact same sentence again, return cached result

**Rate Limiting:**
- Max 10 AI requests per user/day
- After limit: Switch Level 5 questions to "Multiple Choice Logic" variants (Level 4 style)

**Cost Tracking:**
- **Reference:** AI monitoring and cost tracking follows the same pattern as `docs/SHORT_ANSWER.md`
- **Admin Monitoring Log Path:** `admin/{adminId}/ai_monitoring_logs/{YYYY-QTR}`
- **Tracked Metrics:** `date`, `studentId`, `questionId`, `inputText`, `outputText`, `responseTime`, `inputTokensCount`, `outputTokensCount`, `isSuccess`, `errorMessage`
- **Purpose:** Track API usage, costs, and identify performance issues

---

## 11. ADMIN PORTAL & CMS

### 11.1 Objective
Secure web-based portal for Admins/Educators to create "Curriculum Packs" without touching raw database.

**Core Function:** "Form-to-JSON" generator enforcing pedagogical structure  
**Access:** Web Browser (Desktop)

### 11.2 Dashboard (CMS Home)

**View:** List of all published and draft Packs

**Columns:**
- Pack ID
- Title
- Grade Level
- Status (Draft/Published)
- Version
- Last Edited

**Action:** "Create New Pack" button

### 11.3 Pack Editor Interface (Multi-Step Wizard)

#### Step 1: Pack Metadata
**Fields:**
- Title: e.g., "Grade 7 - Logic & Rhetoric"
- Description: "Focus on debating and essay writing terms"
- Grade Target: Dropdown (Grade 3 / Grade 7)
- Icon: Upload Pack Cover Image

#### Step 2: Root Builder
**UI:** Left Sidebar lists Roots added. Right Panel is Editor

**Root Fields:**
- Root Name: "SPECT"
- Meaning: "To Look"
- Icon: Select from Asset Library

#### Step 3: Word Manager
**Action:** "Add Word"

**Fields:**
- Word: "Retrospect"
- Definition: "A review of past events"
- Part of Speech: Noun
- Audio: Upload MP3 (or auto-generate via TTS API)

#### Step 4: Level Question Generator

**Tab Interface:** Level 1 | Level 2 | Level 3 | Level 4 | Level 5

**Level 1 (Detective):**
- Input: Select Target Word ("Spectator")
- Input: Upload Image / Write Context Sentence
- Input: Add 3 Distractors (Wrong answers)

**Level 2 (Builder):**
- Input: Sentence with blank: "The ___ cheered"
- Input: Root Hint: "SPECT"

**Validation Rule:**
- "Publish" button **Disabled** until every Root has at least:
  - 2 Questions for Level 1
  - 2 Questions for Level 2
  - 1 Question for Level 3, 4, 5

### 11.4 Integrity Checks & Safety

**Duplicate Detection:**
- If Admin adds "Inspect" to Pack B, but exists in Pack A
- Show warning: "Collision Detected: 'Inspect' is already in Pack A. Are you sure?"

**Broken Links:**
- Verify all referenced Audio/Image URLs function

**Grade Logic:**
- If Grade = 3, warn if definitions exceed reading level (Lexile check - optional)

### 11.5 Preview Mode

**Simulator:** Togglable view "Mobile (G7)" vs "Tablet (G3)"  
**Action:** Renders JSON in actual React Component used in app  
**Benefit:** Catches UI overflow issues (e.g., definition too long for card)

### 11.6 Publishing Workflow

**Save Draft:**
- Saves to `drafts` collection in Firestore

**Publish:**
1. Triggers Cloud Function
2. Validates JSON Schema
3. Moves data to `curriculum_packs` collection
4. Updates `version` number (e.g., 1.0 → 1.1)

**Client Notification:**
- App sees new version on startup
- Downloads update

---

## 12. SUCCESS METRICS & KPIs

### 12.1 Technical Performance

| Metric | Target | Measurement Method |
|:-------|:-------|:-------------------|
| Quiz Generation Time | < 200ms | Client-side performance monitoring |
| AI Response Latency | < 3 seconds average | Gemini API response time tracking |
| Write Efficiency | < 4 writes per user/day | Firestore usage analytics |
| App Launch Time | < 2 seconds | Time to render Garden Dashboard |
| Offline Sync Success | > 99% | AsyncStorage → Firestore sync logs |

### 12.2 User Engagement

| Metric | Target | Measurement Method |
|:-------|:-------|:-------------------|
| Session Completion Rate | > 85% | % of started sessions that finish all 20 questions |
| Daily Active Users (DAU) | Track trend | Firebase Analytics |
| Average Session Duration | 10-15 min (G7), 5-7 min (G3) | Session timestamp analysis |
| Library Discovery Rate | > 20% | % users who visit Library tab outside quiz |
| Streak Retention (7-day) | > 60% | Users who maintain 7+ day streak |

### 12.3 Learning Outcomes

| Metric | Target | Measurement Method |
|:-------|:-------|:-------------------|
| Root Mastery Rate | > 70% reach Level 5 within 30 days | Root progress tracking |
| Accuracy Improvement | +15% from L1 to L5 | Compare accuracy across levels |
| Retention Rate (30-day) | > 80% | Word strength scores after 30 days |
| AI Feedback Satisfaction | > 90% positive | Thumbs up/down on AI responses |

### 12.4 Admin/CMS Efficiency

| Metric | Target | Measurement Method |
|:-------|:-------|:-------------------|
| Pack Creation Time | < 10 min per Root Module | Admin portal usage tracking |
| Validation Error Rate | < 5% | Failed publish attempts |
| Preview Usage | > 80% of packs previewed before publish | CMS analytics |

---

## 13. TECHNICAL CONSTRAINTS & LIMITS

### 13.1 Firestore Limits

| Resource | Limit | Mitigation Strategy |
|:---------|:------|:-------------------|
| Document Size | 1 MB max | Pack size: 150-250KB. Quarterly logs: Rotate at 2,000 sessions |
| Writes per Day (Free Tier) | 20,000 | Session batching: 1 write per session instead of per question |
| Reads per Day (Free Tier) | 50,000 | Aggressive caching. 1-2 reads per session |

### 13.2 AI Cost Controls

| Control | Implementation |
|:--------|:---------------|
| Usage Scope | Level 5 questions only (< 10% of total questions) |
| Rate Limiting | Max 10 AI requests per user/day |
| Caching | Store identical sentence responses |
| Fallback | After limit, use MCQ variants instead |
| Timeout | 5-second max wait, then fail open |

### 13.3 Offline Support

**Requirements:**
- App must function 100% offline after initial pack download
- Session data persists in AsyncStorage
- Sync queue processes when connection restored
- No data loss if app crashes mid-session

---

## 14. SECURITY & PRIVACY

### 14.1 Authentication
- Firebase Auth required for all user actions
- Anonymous auth not permitted (need persistent user ID for progress tracking)

### 14.2 Data Access Rules

**Firestore Security Rules:**
```javascript
// Users can only read/write their own data
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
}

// Curriculum packs are read-only for students
match /curriculum_packs/{packId} {
  allow read: if request.auth != null;
  allow write: if request.auth.token.admin == true;
}
```

### 14.3 Admin Portal Access
- Separate authentication tier
- Role-based access control (RBAC)
- Audit logs for all pack modifications

### 14.4 Student Data Privacy
- No PII (Personally Identifiable Information) stored in activity logs
- Only user ID, timestamps, and performance data
- COPPA compliant (Children's Online Privacy Protection Act)
- GDPR compliant data export/deletion on request

---

## 15. DEPLOYMENT & ROLLOUT

### 15.1 Phased Rollout Strategy

**Phase 1: Internal Testing (Week 1-2)**
- Deploy to staging environment
- Admin creates 2 test packs (Grade 3 & Grade 7)
- Internal QA team tests all 5 levels
- Performance benchmarking

**Phase 2: Pilot Program (Week 3-4)**
- 50 students (25 Grade 3, 25 Grade 7)
- Monitor metrics daily
- Collect qualitative feedback
- Iterate on UX issues

**Phase 3: Limited Release (Week 5-6)**
- 500 students
- Enable AI grading for Level 5
- Monitor Gemini API costs
- Validate offline sync at scale

**Phase 4: General Availability (Week 7+)**
- Full rollout to all users
- Marketing campaign
- Teacher training materials
- Support documentation

### 15.2 Rollback Plan

**Trigger Conditions:**
- Session completion rate drops below 50%
- AI costs exceed $X per day
- Critical bug affecting > 10% of users
- Firestore write quota exceeded

**Rollback Actions:**
1. Disable new user onboarding
2. Revert to previous app version
3. Disable AI grading (fallback to MCQ)
4. Notify users via in-app banner

---

## 16. DEPENDENCIES & INTEGRATIONS

### 16.1 Third-Party Services

| Service | Purpose | Criticality | Fallback |
|:--------|:--------|:------------|:---------|
| Firebase Auth | User authentication | Critical | None - app unusable without auth |
| Firestore | Data storage | Critical | Offline mode with AsyncStorage |
| Gemini API | Level 5 grading | Medium | MCQ variants |
| Native TTS | Audio pronunciation | Low | Pre-recorded MP3s |
| Fuse.js | Library search | Low | Simple string matching |

### 16.2 Platform Requirements

**iOS:**
- Minimum version: iOS 13+
- Required permissions: None (TTS is built-in)

**Android:**
- Minimum version: Android 8.0 (API 26)+
- Required permissions: None

**Web:**
- Modern browsers (Chrome 90+, Safari 14+, Firefox 88+)
- No IE11 support

---

## 17. OPEN QUESTIONS & DECISIONS NEEDED

### 17.1 Content Strategy
- [ ] **Decision:** How many packs to launch with? (Recommendation: 2 per grade)
- [ ] **Decision:** Who creates initial content? (Internal team vs. outsource)
- [ ] **Decision:** Frequency of new pack releases? (Monthly? Quarterly?)

### 17.2 Monetization
- [ ] **Decision:** Free vs. Premium packs?
- [ ] **Decision:** AI grading included in free tier or premium only?
- [ ] **Decision:** Pricing model if premium (subscription vs. one-time purchase)

### 17.3 Localization
- [ ] **Decision:** Support non-English roots? (Latin/Greek etymology works globally)
- [ ] **Decision:** UI translation needed for which languages?
- [ ] **Decision:** TTS support for non-English words?

### 17.4 Analytics
- [ ] **Decision:** Third-party analytics tool? (Mixpanel, Amplitude, or Firebase Analytics only)
- [ ] **Decision:** Teacher dashboard access model? (Separate portal or in-app)

---

## 18. APPENDICES

### Appendix A: Glossary

| Term | Definition |
|:-----|:-----------|
| **Root** | A base morpheme (e.g., SPECT = To Look) from which words are derived |
| **Tier 2 Word** | High-utility academic vocabulary (e.g., analyze, benevolent) |
| **SRS** | Spaced Repetition System - algorithm for optimal review timing |
| **Mastery Snapshot** | Current state of user's progress (live data) |
| **Activity Log** | Historical record of past sessions (archive data) |
| **Curriculum Pack** | Collection of 15-20 roots with associated words and questions |
| **Session** | Single quiz attempt (typically 20 questions, 10-15 minutes) |
| **Bucket** | Subset of questions (Bucket A = Review, Bucket B = Growth) |

### Appendix B: Question Type Reference

| Type ID | Name | Description | Levels Used |
|:--------|:-----|:------------|:------------|
| `mcq_context` | Context MCQ | Choose word based on sentence context | 1 |
| `mcq_image` | Image MCQ | Choose word based on visual | 1 |
| `syllable_drag` | Syllable Drag | Drag syllable blocks to form word | 2 (G3) |
| `fill_hint` | Fill with Hint | Type word with root hint provided | 2 (G7) |
| `true_false` | True/False | Validate sentence correctness | 3 (G3) |
| `error_spot` | Error Spotting | Tap incorrect word to fix | 3 (G7) |
| `analogy_drag` | Analogy Drag | Complete A:B::C:? pattern | 4 |
| `grouping` | Word Grouping | Match word to category | 4 |
| `sentence_builder` | Sentence Builder | Arrange scrambled words | 5 (G3) |
| `open_response` | Open Response | Write original sentence (AI graded) | 5 (G7) |

### Appendix C: Sample Session Flow

**User:** Grade 7 student, 5 roots mastered, currently working on "DICT" (Level 2)

**Session Generation:**
1. Algorithm reads `mastery_snapshot`
2. Allocates 20 questions:
   - 10 from mastered roots (L3-L5 questions)
   - 7 from "DICT" at Level 2 (Reinforcement)
   - 3 from "DICT" at Level 3 (Stretch)
3. User answers questions
4. After 3 consecutive correct on "DICT":
   - System triggers "Level Up!"
   - Remaining "DICT" questions upgrade to Level 3
5. Session ends:
   - Batch write to Firestore
   - Update `current_level` for "DICT" to 3
   - Update SRS dates for all words practiced
6. User sees "Garden" dashboard:
   - "DICT" tree grows from Sprout to Sapling

---

## SIGN-OFF

### Stakeholder Approval

| Role | Name | Signature | Date |
|:-----|:-----|:----------|:-----|
| Product Owner | | | |
| Tech Lead | | | |
| UX Designer | | | |
| Content Lead | | | |
| QA Lead | | | |

### Document History

| Version | Date | Author | Changes |
|:--------|:-----|:-------|:--------|
| 1.0 | 2026-02-05 | System | Initial consolidated requirements document |

---

**END OF REQUIREMENTS DOCUMENT**
