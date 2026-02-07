# Product Requirement Document (PRD): Root Mastery Vocabulary Module

**Target Audience:**
* **Grade 3-5:** Emerging readers transitioning to chapter books. Focus on morphology (prefixes/suffixes) and concrete roots.
* **Grade 6-10:** Middle and High schoolers preparing for high school/ College texts. Focus on abstract roots, etymology, and academic nuance (Tier 2/3 words).
**Devices:** Tablet (Primary for Grade 3), Mobile/Tablet (Grade 7).
**Tech Stack:** React Native / React Web, Firestore, Firebase Auth, Google Gemini (Minimal)
**Core Concept:** Generative Vocabulary Learning via Root Mastery (Tier 2 Focus)

---

## Phase 1: Overview & Pedagogical Approach


### 1. Executive Summary
**Objective:** To integrate a "Root-Based" vocabulary module into the existing quiz application that shifts learning from rote memorization to "Generative Vocabulary" mastery. To shift vocabulary learning from rote memorization of isolated words to **generative root mastery**. Students learn one root (e.g., *SPECT*) to unlock dozens of related words (e.g., *Inspect, Retrospect*).



---

### 2. Pedagogical Approach: The "Generative" Method
Unlike traditional flashcards, this module treats a **Root** as a "Key" that unlocks a "Room" of words. Mastery is tracked at the **Key (Root)** level, not just the **Room (Word)** level. The system tracks progress per Root, moving students through 5 cognitive levels:


#### 2.1 The Core Loop
1.  **Introduce:** The Root (e.g., *SPECT* = To Look).
2.  **Expand:** Show 3-5 words derived from it (e.g., *Inspect, Spectator, Respect*).
3.  **Scaffold:** Move the student through 5 distinct cognitive levels (The "Mastery Ladder").
4.  **Generative Check:** Test if the student can decipher a *new* word they haven't seen, using the root.

---

### 3. The 5-Level Mastery Ladder (Scaffolding Strategy)
The system must support five distinct question types that increase in cognitive load. Every Root in the database must have questions generated for all 5 levels.

| Level | Name | Cognitive Skill | Activity Description | Grade 3 Nuance | Grade 7 Nuance |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **The Detective** | **Recognition** (Passive) | Identifying the correct word when it is visible. | **Word Bank:** 3 large buttons. Images used for context. | **Context Clues:** Select word based on paragraph context. |
| **2** | **The Builder** | **Recall** (Active) | Constructing the word from memory with root hints. | **Tap-to-Fill:** Drag syllable blocks `[IN]` `[SPECT]` to target. | **Typing:** Keyboard input with only the root `SPECT` provided as a hint. |
| **3** | **The Editor** | **Precision** (Nuance) | Identifying correct vs. incorrect usage/grammar. | **True/False:** "A *Spectator* plays the game." (False). | **Error Spotting:** Fix the incorrect word in a complex sentence. |
| **4** | **The Logic Master**| **Connection** (Logic) | Relational thinking and analogies. | **Grouping:** "Which word belongs with *Eyes*?" (Spectator). | **Analogies:** "Ear is to Audio as Eye is to _____." |
| **5** | **The Author** | **Synthesis** (Creative) | Spontaneous usage in original context. | **Sentence Builder:** Arrange scrambled words to make a sentence. | **Open Response:** Write a sentence. (Graded by AI/Admin). |

---

### 4. Gamification Strategy: "The Garden of Knowledge"
To visualize "Root Mastery" (which is abstract) into something tangible.

#### 4.1 Visual Metaphors (The Icons)
The dashboard and progress bars must use these states to indicate Root Status:

* **🟤 The Seed (Locked/New):** The root is assigned but untouched.
    * *State:* Level 0.
* **🌱 The Sprout (Learning):** The student is engaging with Level 1 & 2 questions.
    * *State:* Levels 1–2.
* **🌿 The Sapling (Growing):** The student is tackling Nuance and Logic.
    * *State:* Levels 3–4.
* **🌳 The Mighty Oak (Mastered):** The student has passed Level 5.
    * *State:* Level 5 Complete.
    * *Maintenance Mode:* This tree occasionally drops "Golden Leaves" (Review Questions).

#### 4.2 The "Streak" vs. "Growth"
* **Avoid:** Only tracking "Days Played."
* **Emphasize:** "Trees Grown." A Grade 3 student should feel pride in having a "Forest of 10 Trees" (10 Roots mastered).

---

### 5. Grade-Level Differentiation (UX Requirements)

#### 5.1 Grade 3 (Tactile & Concrete)
* **Visuals:** Every Root introduction must be accompanied by an illustration (e.g., *STRUCT* shows a construction site).
* **Input:** Minimize typing. Use drag-and-drop, tap-to-select, and syllable blocks.
* **Feedback:** Instant visual rewards (stars, animations) after *every* question.
* **Session Length:** Max 5-7 minutes (approx. 10 questions).

#### 5.2 Grade 7 (Abstract & Efficient)
* **Visuals:** Clean, minimal iconography. Focus on etymology trees (showing the Latin/Greek origin).
* **Input:** Standard keyboard typing and multi-select.
* **Feedback:** Progress bars and "Accuracy %". Rewards at the *end* of the session.
* **Session Length:** 10-15 minutes (approx. 20 questions).

---

### 6. Data Structure Implications for Phase 1
While code is not required, the pedagogy dictates the schema structure.

#### 6.1 Firestore Path: `curriculum_packs/{pack_id}`
To support the 5-Level Ladder, the data model for a **Single Root** within a pack must look like this:

```json
"root_spect": {
  "name": "Spect",
  "meaning": "To Look",
  "grade_level_suitability": [3, 7], // Can be used by both
  "levels": {
    "1_detective": {
      "question_pool": [
        { "id": "q101", "type": "mcq_image", "target_word": "spectator" },
        { "id": "q102", "type": "mcq_context", "target_word": "inspect" }
      ]
    },
    "2_builder": {
      "question_pool": [
        { "id": "q201", "type": "syllable_drag", "syllables": ["re", "spect"], "grade": 3 },
        { "id": "q202", "type": "text_input", "hint": "Look back", "grade": 7 }
      ]
    },
    // ... Levels 3, 4, 5
  }
}
```

#### 6.2 Firestore Path: `users/{uid}/stats/mastery_snapshot`
To support the "Garden" visualization, we need specific counters:

```json
{
  "garden_stats": {
    "seeds_count": 15,    // Available to learn
    "sprouts_count": 2,   // In progress (L1-2)
    "saplings_count": 1,  // Advanced (L3-4)
    "oaks_count": 5       // Mastered (L5)
  }
}
```

### 7. Success Metrics for Phase 1
The design is successful if:
1.  **Confusion Rate:** Grade 3 students do not struggle with the UI for "Level 2: Builder" (Testing drag-and-drop vs. typing).
2.  **Progression Flow:** A user naturally understands that "More correct answers = Tree grows."
3.  **Differentiation:** Grade 7 users do not feel the app is "babyish," and Grade 3 users do not feel it is "too hard."

==============================================================================================================

# Product Requirement Document: Phase 2
## Module: Database Architecture & Data Modeling (Firestore)

### 1. Executive Summary
**Objective:** Design a NoSQL schema that supports the "Curriculum Pack" strategy, allowing the app to load weeks of content in a single read while tracking granular mastery for Grade 3 and Grade 7 students.
**Constraints:**
* **Firestore Document Limit:** 1 MB per document.
* **Read Optimization:** Minimize reads to 1-2 per session.
* **Write Optimization:** Batch user logs to prevent "write hotspots."

---

### 2. Core Collections Strategy
The architecture relies on three distinct data categories:
1.  **Static Content (`curriculum_packs`):** The "Textbook." Read-heavy, rarely written.
2.  **User State (`users/stats/mastery_snapshot`):** The "Save File." Read/Write every session.
3.  **Analytics (`users/logs/...`):** The "Audit Trail." Write-only (append), rarely read by user.

---

### 3. Collection: `curriculum_packs` (Static Content)
* **Path:** `/curriculum_packs/{pack_id}`
* **Doc ID Convention:** `pack_{grade}_{sequence}` (e.g., `pack_g07_01`, `pack_g03_01`)
* **Access Pattern:** Read 1 document on App Launch (Cached for offline use).

#### 3.1 Schema Definition
```json
{
  "pack_id": "pack_g07_01",
  "title": "Foundations of Logic",
  "grade_level": 7,
  "version": 1.2, // For cache invalidation
  "description": "Essential roots for academic argumentation.",
  
  // The Core Content (Map: RootID -> Data)
  "roots": {
    "root_dict": {
      "name": "Dict",
      "meaning": "To Speak / Say",
      "etymology": "Latin (dicere)",
      "icon_url": "gs://bucket/icons/dict_speaker.png", // Visual for "Seed/Tree"
      
      // Words belonging to this root
      "words": {
        "verdict": {
          "definition": "A final decision or judgment.",
          "part_of_speech": "noun",
          "tier": 2,
          "audio_url": "gs://bucket/audio/verdict.mp3"
        },
        "predict": { ... }
      },

      // The 5-Level Question Bank
      "levels": {
        "1": [ // Level 1: Detective (Recognition)
          {
            "id": "q_dict_l1_01",
            "type": "mcq_context",
            "question_text": "The judge read the __ aloud.",
            "correct_word": "verdict",
            "distractors": ["predict", "contradict"]
          }
        ],
        "2": [ // Level 2: Builder (Recall)
          {
            "id": "q_dict_l2_01",
            "type": "fill_hint", 
            "hint_root": "DICT",
            "sentence": "I pre___ that it will rain.",
            "answer": "predict"
          }
        ],
        // ... Levels 3 (Editor), 4 (Logic), 5 (Author)
      }
    }
    // ... Repeat for 20 roots in this pack
  }
}
```

---

### 4. Collection: `users` (User State)
* **Path:** `/users/{user_id}/stats/mastery_snapshot`
* **Purpose:** Stores the *current* progress. This is the only document read to build the "Dashboard/Garden."
* **Size Constraint:** Even with 5 years of data, this JSON remains under 300KB.

#### 4.1 Schema Definition
```json
{
  "uid": "user_12345",
  "current_grade": 7,
  "last_active_timestamp": 1765432100,

  // 1. Pack Management (Which content does the user have?)
  "content_state": {
    "current_pack_id": "pack_g07_01",
    "completed_packs": [] 
  },

  // 2. The Queue (What is the algorithm juggling right now?)
  "active_queue": ["root_dict", "root_spect"], 
  
  // 3. Root Mastery (The Garden Visuals)
  "root_progress": {
    "root_dict": {
      "status": "active", // options: locked, active, mastered
      "current_level": 2, // "The Builder"
      "level_progress_percent": 60, // Progress bar for Level 2
      "questions_answered_total": 15,
      "last_played": "2026-02-05"
    },
    "root_spect": {
      "status": "mastered", // "Mighty Oak"
      "current_level": 5,
      "mastery_date": "2026-01-20"
    }
  },

  // 4. Word-Level SRS (Spaced Repetition System)
  // Only stores data for words the user has actually encountered
  "word_mastery": {
    "verdict": {
      "strength": 4, // 0-5 scale (0=New, 5=Permanent)
      "next_review_due": "2026-02-12",
      "error_count": 1
    },
    "predict": {
      "strength": 1,
      "next_review_due": "2026-02-06" // Due tomorrow
    }
  }
}
```

---

### 5. Collection: `activity_logs` (Historical Analytics)
* **Path:** `/users/{user_id}/activity_logs/log_{year}_Q{quarter}`
* **Doc ID Example:** `log_2026_Q1`
* **Write Strategy:** Use `arrayUnion` to append new session results. This limits writes to 1 per session (instead of 1 per question).

#### 5.1 Schema Definition
```json
{
  "period": "2026_Q1",
  "created_at": "2026-01-01",
  
  // Array of Session Objects
  "sessions": [
    {
      "session_id": "sess_888",
      "timestamp": 1765432100,
      "root_focus": ["root_dict", "root_spect"],
      "total_time_sec": 420,
      "score": 18, // out of 20
      
      // Granular Question Results
      "answers": [
        {
          "q_id": "q_dict_l1_01",
          "root": "root_dict",
          "level": 1,
          "is_correct": true,
          "time_taken_ms": 3200
        },
        {
          "q_id": "q_spect_l3_05",
          "root": "root_spect",
          "level": 3,
          "is_correct": false,
          "user_response": "True", // They said True, Answer was False
          "time_taken_ms": 5100
        }
      ]
    }
  ]
}
```

---

### 6. Data Access Patterns (Reads & Writes)

| Action | Path Accessed | Operation | Frequency |
| :--- | :--- | :--- | :--- |
| **App Launch** | `users/{uid}/stats/mastery_snapshot` | **READ (1)** | Once per session |
| **Load Content** | `curriculum_packs/{pack_id}` | **READ (1)** | Only if pack changed or cache expired (Rare) |
| **Finish Session**| `users/{uid}/stats/mastery_snapshot` | **WRITE (1)** | Updates levels & SRS dates |
| **Log History** | `users/{uid}/activity_logs/log_...` | **WRITE (1)** | Appends session details |

### 7. Scalability & Limits
* **Pack Size:** A pack with 20 Roots x 5 Levels x 5 Questions = ~500 Questions. Estimated JSON size: **150KB - 250KB**. (Safe within 1MB limit).
* **Snapshot Size:** A user with 1,000 mastered words. Estimated JSON size: **100KB**. (Safe within 1MB limit).
* **Log Rotation:** Logs are rotated quarterly. If a student plays excessively (>500 sessions/quarter), the app logic will create `log_2026_Q1_part2` to prevent overflow.

### 8. Indexes Required
1.  **Composite Index:** `users/{uid}/activity_logs` -> Fields: `period` (Asc) + `timestamp` (Desc). (Used for "Show History" graph).
2.  **Collection Group Index:** None required for Phase 2 (all reads are direct ID lookups).

================================================================================================================

# Product Requirement Document: Phase 3
## Module: UI/UX & Interaction Design

### 1. Executive Summary
**Objective:** Create a responsive, touch-friendly interface that visualizes the "Root Mastery" journey.
**Design Philosophy:**
* **Grade 3 Mode:** "Toy-like." High tactility (drag, tap), large targets, instant visual reward, minimal reading.
* **Grade 7 Mode:** "Tool-like." Efficiency (keyboard, fast tapping), cleaner density, progress-focused.
**Device Targets:** Tablet (Landscape) for G3; Mobile (Portrait) for G7.

---

### 2. The "Garden" Dashboard (Home Screen)
*The central hub where students track mastery.*

#### 2.1 Visual Structure
* **Layout:** A scrollable grid of "Root Cards."
* **Header Stats:**
    * **Watering Can Icon:** Daily Streak (e.g., "3 Day Streak").
    * **Golden Leaf Icon:** Total Roots Mastered (e.g., "12/50").

#### 2.2 Root Card States (The Icons)
Each card represents one Root (e.g., *SPECT*) and changes visually based on `mastery_snapshot`.

| State | Icon Visual | Subtext | Interaction |
| :--- | :--- | :--- | :--- |
| **Locked** | 🟤 Brown Seed (Padlock overlay) | "Unlocks at Lvl 5" | Tapping shakes the lock (Haptic feedback). |
| **New** | 🌱 Tiny Sprout | "New!" | Opens "Intro Lesson" (Video/Slide). |
| **Active** | 🌿 Growing Sapling | "Lvl 2 - Builder" | Opens Quiz Session. |
| **Mastered** | 🌳 Golden Oak Tree | "Mastered" | Opens "Review Mode" (Hard questions). |

#### 2.3 The "Next Step" FAB (Floating Action Button)
* **Logic:** Uses `active_queue` from Phase 2.
* **Label:** "Continue Journey" (G7) or "Play!" (G3).
* **Action:** Immediately launches the Generated Quiz Session (Phase 4 Logic).

---

### 3. The Quiz Interface (Session View)
*The container for all questions.*

#### 3.1 Global Elements (Always Visible)
* **Top Bar:**
    * **Progress:** Segmented bar (1 to 20 segments). Fills green/red as they answer.
    * **Close Button:** "X" (Triggers: "Save progress?" modal).
* **The Stage (Center):** Where the question template renders.
* **The Dock (Bottom):** Input area (Keyboard, Drag Tray, or Buttons).

---

### 4. Level-Specific UI Templates (The Scaffold)

#### Level 1: The Detective (Recognition)
* **Task:** Identify the word from options.
* **G3 UI (Tablet):**
    * **Stage:** A large illustration (e.g., a person looking at a watch) + Sentence: "He checked the ___."
    * **Dock:** 3 Large "Card" Buttons with Images + Text.
* **G7 UI (Mobile):**
    * **Stage:** A short text paragraph. Context clue highlighted.
    * **Dock:** Standard 4-option Vertical List (Text Only).

#### Level 2: The Builder (Recall/Morphology)
* **Task:** Construct the word using the root.
* **G3 UI (Syllable Drag):**
    * **Stage:** Sentence: "The teacher asked for ___." (Target: *Silence*).
    * **Dock:** Scrambled puzzle pieces: `[ENCE]` `[SIL]`.
    * **Interaction:** Drag pieces into the slot. Snap-to-fit animation.
* **G7 UI (Ghost Typing):**
    * **Stage:** Sentence: "The judge gave the `VER____`."
    * **Dock:** QWERTY Keyboard.
    * **Interaction:** User types `DICT`. Success = Green flash.

#### Level 3: The Editor (Nuance/Correction)
* **Task:** Spot the error or validate usage.
* **UI (Shared):** "Tinder-style" Card Stack or Split View.
* **Content:** "The **Spectator** played the game."
* **Interaction:**
    * **G3:** Two giant buttons: 👍 (Yes) / 👎 (No).
    * **G7:** Tap the *incorrect word* in the sentence to fix it.

#### Level 4: The Logic Master (Analogies)
* **Task:** `A : B :: C : ?`
* **UI:** 2x2 Grid Layout.
* **Visual:**
    * [ Ear ] -> [ Audio ]
    * [ Eye ] -> [ ? ]
* **Interaction:** Drag the correct word from the bottom tray into the empty box.

#### Level 5: The Author (Synthesis/Creative)
* **Task:** Write an original sentence.
* **UI:** Chat Interface.
* **Stage:** Prompt: "Write a sentence using *INSPECT*."
* **Dock:** Text Field + "Check" Button.
* **Feedback State:**
    * *Loading:* "AI is reading..." (3s delay).
    * *Result:* "Great job! +50 XP" (Success) OR "Try again: Ensure you use the word as a Verb" (Retry).

---

### 5. Feedback & Transition Design

#### 5.1 Immediate Feedback (Post-Answer)
* **Correct:**
    * **Sound:** Pleasant "Ding."
    * **Visual:** Screen flashes soft green. Next question slides in from right.
* **Incorrect:**
    * **Sound:** Soft "Thud."
    * **Visual:** Screen shakes slightly.
    * **Remediation:** The *Definition Card* slides up from the bottom. "Oops! *Spectator* means someone who WATCHES. Try again."
    * **Interaction:** User must tap "Got it" to proceed.

#### 5.2 The "Level Up" Moment
* **Trigger:** Phase 4 logic detects Level Jump (e.g., L1 -> L2).
* **Animation:**
    * Confetti bursts from the Progress Bar.
    * **Overlay Modal:** "Level Up! You are now a Builder."
    * **Icon:** The Root Icon transforms (Seed cracks open -> Sprout).

---

### 6. Accessibility & Localization Requirements
* **Text-to-Speech (TTS):** Every Root/Word card must have a "Speaker" icon.
    * *Requirement:* Use native OS TTS (Android/iOS) to save bandwidth.
* **Color Blindness:** Never rely on Green/Red alone.
    * *Solution:* Use Icons (Checkmark / X) alongside colors.
* **Font Size:**
    * **G3:** Min 24sp (Dyslexia-friendly font option recommended).
    * **G7:** Min 16sp (Standard Sans Serif).

===================================================================================================

# Product Requirement Document: Phase 4
## Module: Dynamic Question Generation Engine (The "Brain")

### 1. Executive Summary
**Objective:** To algorithmically generate a unique, personalized quiz session every time the user taps "Play," balancing spaced repetition (Review) with new skill acquisition (Growth).
**Technical Constraint:** Must run 100% client-side using cached data from Phase 2 (User Snapshot + Curriculum Pack).
**Latency Goal:** Quiz generation time < 200ms.

---

### 2. The "Session Builder" Algorithm
*Triggered when the user taps "Start Quiz."*

#### 2.1 Inputs
The engine reads two local states:
1.  **User Snapshot:** `active_queue` (Current Roots), `mastered_roots`, `word_mastery` (SRS Scores).
2.  **Curriculum Pack:** The Static Question Bank.
3.  **Session Config:** `total_questions` (Default: 20), `review_ratio` (Default: 0.5).

#### 2.2 The "Bucket Allocation" Logic
The engine divides the 20 slots into two strictly defined buckets:

**Bucket A: The "Iron" Slot (Maintenance) - 50% (10 Qs)**
* **Source:** `mastered_roots` (Level 5 Completed).
* **Filter:** ONLY Difficulty Level 3, 4, or 5.
* **Priority Sort:**
    1.  **Weakest Words:** Words with `strength < 3` (SRS logic).
    2.  **Oldest Mastered:** Roots not seen in > 14 days.
    3.  **Random Challenge:** If all strong, pick a random Level 4 (Analogy).

**Bucket B: The "Growth" Slot (Progression) - 50% (10 Qs)**
* **Source:** `active_queue` (Roots currently in L1–L4).
* **Filter:**
    * 70% at `current_level` (Reinforcement).
    * 30% at `current_level + 1` (The "Stretch" Goal).
* **Priority Sort:**
    1.  **New Words:** Words with `strength == 0`.
    2.  **Recent Errors:** Words marked "Incorrect" in the last session.

#### 2.3 The "No-Repeat" Rule
* **Constraint:** The same word cannot appear twice in a 20-question session unless it is a "Retry" (see 3.2).
* **Logic:** If `active_queue` is small (only 1 root), the engine *must* pull from `mastered_roots` to fill the gap, even if it violates the 50/50 ratio.

---

### 3. In-Session Logic (The "Director")
*Controls the flow while the user is playing.*

#### 3.1 Auto-Progression (The "Level Up" Trigger)
* **State Tracking:** The engine maintains a temporary counter: `consecutive_correct_per_root`.
* **The Rule:** If `consecutive_correct_per_root >= 3`:
    * **Action:** The engine looks ahead in the queue.
    * **Hot Swap:** It finds the next question for that Root and *upgrades* it to the next Difficulty Level.
    * **UX:** Displays a "Level Up!" toast notification.

#### 3.2 The "Retry Queue" (Immediate Remediation)
* **Trigger:** User answers Question #5 incorrectly.
* **Action:**
    1.  Show "Correction Card" immediately.
    2.  Clone Question #5.
    3.  Insert the clone at position #15 (Spaced by 10 slots).
    4.  *Note:* This extends the session length from 20 to 21.

---

### 4. Edge Case Handling

#### 4.1 "New User" State (Empty Mastered List)
* **Scenario:** User just joined. `mastered_roots` is empty.
* **Fallback:** `review_ratio` becomes 0.0.
* **Allocation:** 100% of questions come from `active_queue`.
* **Flow:** The system rapidly cycles L1 (Recognition) -> L2 (Recall) for the first 3 roots.

#### 4.2 "Empty Queue" State (All Mastered)
* **Scenario:** User mastered all 20 roots in the pack.
* **Action:**
    1.  **Frontend:** Show "Pack Complete!" Celebration.
    2.  **Logic:** Force "Mastery Mode" (100% Hard Questions).
    3.  **Upsell:** Prompt user to download/unlock "Pack 2".

#### 4.3 "Data Mismatch" (Missing Questions)
* **Scenario:** User is Level 4, but the Pack only has questions up to Level 3 for a specific word.
* **Fallback:** Downgrade to Level 3. Never show an empty screen or error.

---

### 5. AI Integration Points (Gemini API)
*Only used for Level 5 (The Author) to keep costs low.*

#### 5.1 The "Lazy Evaluator"
* **Trigger:** Question Type = `open_response`.
* **Timing:** The API call is made *after* the user hits "Submit."
* **Latency Mask:** While waiting for Gemini (1-2s), show a generic "Analyzing..." animation.
* **Fallback:** If API fails/times out (>5s), accept the answer as "Pending Review" and mark it correct for the sake of the session flow.

---

### 6. Output (The Session Object)
*What the Engine passes to the UI Render Layer.*

```json
{
  "session_id": "temp_sess_123",
  "config": { "allow_retry": true },
  "queue": [
    {
      "q_index": 1,
      "source": "bucket_a", // Mastered
      "root_id": "root_spect",
      "level": 4,
      "type": "analogy_drag",
      "data": { ... } // Question Content
    },
    {
      "q_index": 2,
      "source": "bucket_b", // Growth
      "root_id": "root_dict",
      "level": 1,
      "type": "mcq_image",
      "data": { ... }
    }
    // ... 18 more items
  ]
}
```

=====================================================================================================

# Product Requirement Document: Phase 5
## Module: Assessment, Analytics & Write Optimization

### 1. Executive Summary
**Objective:** To capture high-fidelity performance data for every student session to drive the "Mastery Algorithm," while staying within Firestore's free/low-cost tier limits.
**Key Strategy:** "Session Batching." We do not write to the database after every question. We store results locally in Redux/State and perform a **single write** at the end of the 20-question session.
**Data Granularity:** We track performance at the Root, Word, and Skill (Level) tier.

---

### 2. Firestore Write Strategy: "The Quarterly Bucket"
Instead of creating 1 document per session (which creates millions of documents), we append sessions to a single "Bucket Document" that spans 3 months.

* **Collection Path:** `users/{user_id}/activity_logs`
* **Document ID:** `log_{YYYY}_Q{1-4}` (e.g., `log_2026_Q1`)
* **Write Operation:** `arrayUnion` (Appends data to an array without overwriting the doc).

#### 2.1 The Schema (The "Bucket")
```json
{
  "doc_type": "quarterly_log",
  "period": "2026_Q1",
  "student_id": "user_123",
  "created_at": 1765432100,
  
  // The Array that grows (Max 1MB limit ≈ 2,000 sessions)
  "session_history": [
    {
      "sess_id": "uuid_v4_string",
      "ts_start": 1765432100,
      "ts_end": 1765432500, // 400 seconds duration
      "roots_practiced": ["root_spect", "root_dict"],
      "final_score": 18, // out of 20
      "xp_earned": 150,
      
      // Compressed Question Data (Minified keys to save space)
      "q_data": [
        // "r"=root, "l"=level, "w"=word, "c"=correct(1/0), "t"=time(ms)
        { "r": "spect", "l": 2, "w": "inspect", "c": 1, "t": 3200 },
        { "r": "dict", "l": 3, "w": "verdict", "c": 0, "t": 5100 }
      ]
    }
  ]
}
```
3. Metric Calculation Logic (The Dashboard Feeder)
Since logs are historical, we need to update the "Live Stats" (User Profile) at the exact same moment we write the log. This is a Batch Write (Atomic Operation).

3.1 The "Update Payload"
When a session ends, the app calculates these deltas locally and sends them to Firestore:

Word Strength (SRS):

If Correct: Increment strength (+1).

If Incorrect: Reset strength to 0 or 1.

Calculation: Update next_review_date.

Root Mastery:

Logic: Calculate accuracy_last_10_attempts for the Root.

Trigger: If > 80% AND Level < 5 -> Increment current_level.

Global Stats:

Increment total_questions_answered.

Add session_duration to total_time_spent.

3.2 The Batch Write Code (Conceptual)
JavaScript

const batch = firestore.batch();

// 1. Append Log (History)
const logRef = db.doc(`users/${uid}/activity_logs/log_2026_Q1`);
batch.update(logRef, {
  session_history: firebase.firestore.FieldValue.arrayUnion(newSessionData)
});

// 2. Update Profile (Live State)
const profileRef = db.doc(`users/${uid}/stats/mastery_snapshot`);
batch.update(profileRef, {
  "root_progress.root_spect.accuracy": 85,
  "root_progress.root_spect.current_level": 3,
  "word_mastery.inspect.strength": 4,
  "word_mastery.inspect.next_review": "2026-02-12"
});

// Commit both as one operation
await batch.commit();
4. Edge Case: "Offline Mode"
Since students (especially G3 on tablets) may lose internet access:

Detection: App detects "No Connection."

Storage: Session data is saved to AsyncStorage (Local Device Storage) as a "Pending Log."

Queue: The app allows the student to play multiple sessions offline.

Sync: When connection is restored -> App reads AsyncStorage -> Batches all pending logs -> Performs one massive arrayUnion to Firestore.

5. Analytics Dashboard Requirements (The "Teacher View")
While the student sees trees, the Admin/Parent needs hard numbers. This view reads the activity_logs.

5.1 Metrics to Derive
Time on Task: Sum of ts_end - ts_start.

Trouble Spots: Identify Words where c (correct) is consistently 0.

Root Velocity: How many days did it take to go from Level 1 to Level 5?

Calculation: Timestamp(Level 5) - Timestamp(First Interaction).

5.2 Data Retention Policy
Active Logs: Current Quarter (Q1) is kept in "Hot Storage" (Firestore).

Archived Logs: Old Quarters (Q4 2025) are kept in Firestore, but can be moved to "Cold Storage" (BigQuery or Storage Bucket) if the user hits 10MB of data (unlikely for years).

6. Success Criteria for Phase 5
Write Efficiency: Average user generates < 4 writes per day (assuming 2 sessions + profile sync).

Data Safety: No session data is lost if the app crashes mid-quiz (Local State persistence).

Accuracy: The "Mastery Snapshot" perfectly reflects the aggregate of the "Activity Logs."

===============================================================================================================

# Product Requirement Document: Phase 6
## Module: Student Dashboards & History Views

### 1. Executive Summary
**Objective:** To provide students with two distinct views of their learning:
1.  **The "Garden" (Macro View):** A gamified snapshot of current mastery (Where am I?).
2.  **The "Journal" (Micro View):** A detailed history of past sessions (What did I do?).
**Key Challenge:** Rendering historical data efficiently without downloading the entire database history.

---

### 2. View 1: "My Garden" Dashboard (The Home Screen)
*This view is powered exclusively by the `mastery_snapshot` document (Fast Read).*

#### 2.1 The "Forest" Grid (Main Layout)
* **Visual:** A scrollable grid of icons representing every Root the student has encountered.
* **Sorting Logic:**
    1.  **Active Roots** (Top priority).
    2.  **New/Unlocked Roots**.
    3.  **Mastered Roots** (Golden trees at the bottom).
    4.  **Locked Roots** (Grayed out).

#### 2.2 The "Tree" Component (Card States)

Each card must convey three data points instantly:
1.  **Growth Stage:**
    * *Seed:* 0% Progress.
    * *Sprout:* Level 1-2.
    * *Sapling:* Level 3-4.
    * *Oak:* Level 5 (Mastered).
2.  **Health (SRS Status):**
    * *Vibrant Color:* Reviewed recently.
    * *Wilting/Pale:* Needs review (Logic: `last_played > 7 days`).
3.  **The "Water" Button:** A quick-action button on "Wilting" trees to start a 5-question review session immediately.

#### 2.3 Aggregate Metrics (The HUD)
Displayed at the top of the screen:
* **"Words Discovered":** Count of keys in `word_mastery` map.
* **"Mastery Count":** Count of Roots where `current_level == 5`.
* **"Streak Fire":** Visual representation of consecutive days played.

---

### 3. View 2: Practice History (The Journal)
*This view queries the `activity_logs` collection. It uses Pagination to save bandwidth.*

#### 3.1 The Infinite List
* **Access:** Accessed via a "History" tab or "Journal" icon.
* **Data Source:** `users/{uid}/activity_logs` (Query ordered by `created_at` desc).
* **Pagination:** Load 5 logs (Quarters) initially? No, load the *current* Quarter log document and parse the `sessions` array.
    * *UX:* Show the last 20 sessions. Load more only if requested.

#### 3.2 Session Card (Summary Item)
Each item in the list shows:
* **Date/Time:** "Today, 10:30 AM" or "Feb 5".
* **Focus:** Icons of the Roots practiced (e.g., [SPECT] [DICT]).
* **Score:** Large percentage (e.g., "85%").
* **Visual Indicator:**
    * *Green Border:* Perfect score.
    * *Yellow Border:* Good practice.
    * *Red Dot:* Struggles detected.

---

### 4. View 3: Detailed Session Review (The Drill-Down)
*Triggered when a student taps a Session Card in the History list.*

#### 4.1 The "Game Tape" Analysis
Allows the student to review their mistakes without penalty.

* **Header:** "Session Analysis - 4m 20s Duration".
* **The List:** A vertical list of all 20 questions asked.

#### 4.2 Question Detail Row
* **State A (Correct):**
    * Compact row.
    * Text: "Q4: **Predict** (Fill-in) - ✅".
* **State B (Incorrect):**
    * Expanded row (Highlighted Red).
    * **Question:** "The judge read the ___."
    * **Your Answer:** "Spectator" (Strikethrough).
    * **Correct Answer:** "Verdict".
    * **Time Taken:** "12s" (Shows hesitation).
    * **Action:** "Flag" button to bookmark this word for later.

---

### 5. Technical Implementation (State Management)

#### 5.1 Redux/Context Store Structure
We need to separate "Live Data" from "Archive Data" to keep the app fast.

```javascript
store = {
  // 1. Live (Loaded on Launch)
  userProfile: {
    streak: 5,
    roots: { ... } // The Snapshot
  },

  // 2. Archive (Loaded On-Demand)
  sessionHistory: {
    isLoaded: false,
    currentQuarterLog: null, // content of log_2026_Q1
    parsedSessions: [] // Array of past sessions
  },

  // 3. UI State
  viewMode: 'GARDEN' // or 'HISTORY'
}
5.2 Offline Sync Indicator
Since Phase 5 allows offline play, the Dashboard needs a status indicator:

Status: "Cloud Checkmark" (Synced).

Status: "Orange Cloud" (Pending Sync).

Logic: If AsyncStorage has items in pending_logs queue, show Orange Cloud.

Action: Tapping it forces a Sync retry.

6. Success Metrics for Phase 6
Retention: Students check the "Garden" view voluntarily to see their trees grow.

Self-Correction: Students tap into "History" to review incorrect answers (tracked via analytics event history_item_clicked).

Performance: The History list renders instantly (< 100ms) by parsing the local cached Log document instead of fetching new data.


=============================================================================================================
---

# Product Requirement Document: Phase 7
## Module: Admin Portal & Content Management System (CMS)

### 1. Executive Summary
**Objective:** Build a secure web-based portal for Admins/Educators to create "Curriculum Packs" without touching the raw database.
**Core Function:** A "Form-to-JSON" generator that enforces the pedagogical structure (5 Levels per Root) and prevents data integrity errors (duplicates, missing fields).
**Access:** Web Browser (Desktop).

---

### 2. The Dashboard (CMS Home)
* **View:** List of all published and draft Packs.
* **Columns:** `Pack ID`, `Title`, `Grade Level`, `Status` (Draft/Published), `Version`, `Last Edited`.
* **Action:** "Create New Pack" button.

---

### 3. The "Pack Editor" Interface
*A multi-step wizard to build a pack.*

#### Step 1: Pack Metadata
* **Fields:**
    * **Title:** e.g., "Grade 7 - Logic & Rhetoric".
    * **Description:** "Focus on debating and essay writing terms."
    * **Grade Target:** Dropdown (Grade 3 / Grade 7).
    * **Icon:** Upload Pack Cover Image.

#### Step 2: The Root Builder (The Core Work)
* **UI:** Left Sidebar lists Roots added (e.g., Spect, Dict). Right Panel is the Editor.
* **Root Fields:**
    * **Root Name:** "SPECT".
    * **Meaning:** "To Look".
    * **Icon:** Select from Asset Library.

#### Step 3: The Word Manager
* **Action:** "Add Word".
* **Fields:**
    * **Word:** "Retrospect".
    * **Definition:** "A review of past events."
    * **Part of Speech:** Noun.
    * **Audio:** Upload MP3 (or auto-generate via TTS API).

#### Step 4: Level Question Generator (The Validator)
*This is the most critical part. The CMS must ensure every root has questions for all 5 levels.*



* **Tab Interface:** Level 1 | Level 2 | Level 3 | Level 4 | Level 5
* **Level 1 (Detective):**
    * *Input:* Select Target Word ("Spectator").
    * *Input:* Upload Image / Write Context Sentence.
    * *Input:* Add 3 Distractors (Wrong answers).
* **Level 2 (Builder):**
    * *Input:* Sentence with blank: "The ___ cheered."
    * *Input:* Root Hint: "SPECT".
* **Validation Rule:** The "Publish" button is **Disabled** until *every* Root has at least:
    * 2 Questions for Level 1.
    * 2 Questions for Level 2.
    * 1 Question for Level 3, 4, 5.

---

### 4. Integrity Checks & Safety
* **Duplicate Detection:** If Admin adds "Inspect" to *Pack B*, but it already exists in *Pack A*, show a warning: *"Collision Detected: 'Inspect' is already in Pack A. Are you sure?"*
* **Broken Links:** Verify that all referenced Audio/Image URLs function.
* **Grade Logic:** If Grade = 3, warn if definitions exceed a certain reading level (Lexile check - optional).

---

### 5. Preview Mode (The "Student View")
Before publishing, the Admin needs to see what the student sees.

* **Simulator:** A togglable view "Mobile (G7)" vs "Tablet (G3)".
* **Action:** Renders the JSON in the actual React Component used in the app.
* **Benefit:** Catches UI overflow issues (e.g., a definition that is too long for the card).

---

### 6. Publishing Workflow
1.  **Save Draft:** Saves to a `drafts` collection in Firestore.
2.  **Publish:**
    * Triggers Cloud Function.
    * Validates JSON Schema.
    * Moves data to `curriculum_packs` collection.
    * Updates `version` number (e.g., 1.0 -> 1.1).
3.  **Client Notification:** The App (Phase 2) sees the new version on startup and downloads the update.

---

### 7. Success Metrics for Phase 7
1.  **Speed:** An Admin can create a full Root Module (Root + 5 Words + 15 Questions) in < 10 minutes.
2.  **Accuracy:** 0% rate of "Crash on Load" due to malformed JSON in the app.
3.  **Usability:** A non-technical teacher can use the portal without understanding JSON or Firestore.


============================================================================================================

# Product Requirement Document: Phase 8
## Module: Root Discovery Library & AI Assessment (Gemini)

### 1. Executive Summary
**Objective:** To provide a searchable "Encyclopedia of Roots" for self-directed learning and to implement AI-powered grading for open-ended creative writing tasks (Level 5).
**Key Technologies:**
* **Search:** Client-side Fuse.js (Fuzzy search) on cached Curriculum Packs.
* **AI:** Google Gemini Flash (Low latency/cost) for text evaluation.
* **Audio:** Native OS Text-to-Speech (TTS).

---

### 2. Feature: The Root Library (Discovery Mode)
*A searchable reference guide where students can explore connections without the pressure of a quiz.*

#### 2.1 UI Structure
* **Entry Point:** "Library" Tab in the bottom navigation.
* **Search Bar:** "Search for a root (e.g., Spect) or word (e.g., Inspector)..."
* **Filter Chips:** [Show All] [My Mastered] [Locked] [Grade 7 Only].

#### 2.2 The "Family Tree" Visualization
When a user selects a Root, display a node-link diagram.



* **Central Node:** The Root (e.g., *STRUCT*).
* **Branches:** Derived words (e.g., *Construct*, *Structure*, *Instruct*).
* **Interaction:**
    * Tapping a Word Node opens a "Definition Card" overlay.
    * **"Audio" Button:** Triggers native TTS to pronounce the word.
    * **"Practice" Button:** Immediately launches a generated quiz focused *only* on this Root.

#### 2.3 Integration with Curriculum Packs
* **Data Source:** The Library view aggregates data from *all* downloaded `curriculum_packs`.
* **Optimization:** It creates a local search index on app launch so searching is instant (0 network calls).

---

### 3. Feature: AI Grading (Gemini Integration)
*Strictly scoped to Level 5 ("The Author") to manage costs and complexity.*

#### 3.1 Use Case: Creative Sentence Generation
* **The Task:** "Write a sentence using the word **Benevolent** that demonstrates you understand its meaning."
* **The Problem:** Regex cannot grade this. A simple "contains keyword" check is insufficient (e.g., "I am benevolent" is grammatically correct but semantically weak).
* **The Solution:** Generative AI evaluation.

#### 3.2 The Gemini Prompt Strategy
We send a structured prompt to the API.

* **Input Payload:**
    ```json
    {
      "root": "Bene (Good)",
      "target_word": "Benevolent",
      "student_input": "The benevolent king gave food to the poor.",
      "grade_level": 7
    }
    ```

* **System Prompt:**
    > "You are a vocabulary teacher. Evaluate the student's sentence.
    > 1. Is the target word used correctly? (Boolean)
    > 2. Does the context prove understanding? (Score 1-5). 'I am benevolent' is a 1. 'The benevolent king gave food' is a 5.
    > 3. Provide short feedback.
    > Output JSON only."

* **Expected AI Response:**
    ```json
    {
      "is_correct": true,
      "quality_score": 5,
      "feedback": "Excellent! 'Gave food' perfectly matches the meaning of benevolent."
    }
    ```

#### 3.3 UX: Latency Management
* **State 1 (Submit):** User hits "Check."
* **State 2 (Thinking):** Show animation: "Reading your sentence..." (Skeleton loader).
    * *Timeout Safety:* If API takes > 5 seconds, auto-accept the answer with generic feedback: "Good effort! We've recorded your answer." (Fail Open).
* **State 3 (Result):** Display the AI's specific feedback text in a bubble.

#### 3.4 Cost Control Guardrails
* **Caching:** If the student types the exact same sentence again (e.g., copied from a friend), return the cached result.
* **Rate Limiting:** Max 10 AI requests per user/day. After that, switch Level 5 questions to "Multiple Choice Logic" variants (Level 4 style).

---

### 4. Feature: Audio & Pronunciation
*Ensuring accessibility for Grade 3 readers.*

#### 4.1 Native TTS Implementation
* **Why Native?** Pre-recorded MP3s for 10,000 words bloat the app size. Cloud TTS costs money. Android/iOS TTS is free and offline.
* **Implementation:** Use `react-native-tts` (or web equivalent).
* **Configuration:**
    * **Rate:** 0.8x (Slightly slower for educational clarity).
    * **Pitch:** 1.0 (Neutral).

#### 4.2 "Tap to Hear" UX
* **Location:** Every "Word Card" in the Library and every "Question Header" in the Quiz.
* **Icon:** Speaker symbol.
* **Action:** Highlights the text being spoken (Karaoke style) if possible, otherwise just plays audio.

---

### 5. Success Metrics for Phase 8
1.  **AI Accuracy:** Student rating of AI feedback (Thumbs up/down). Target > 90% positive.
2.  **Latency:** AI response time average < 3 seconds.
3.  **Discovery Engagement:** % of users who visit the Library tab outside of a quiz session (Target > 20%).

---

### 6. Final Architecture Review (End-to-End)
* **Database:** Firestore (Optimized Packs).
* **Logic:** Client-side "Session Brain."
* **CMS:** Custom Admin Portal.
* **AI:** Gemini Flash (Serverless Function).
* **Storage:** Local Async Storage (Offline First).

**This concludes the technical requirements for the Root Mastery Application.**