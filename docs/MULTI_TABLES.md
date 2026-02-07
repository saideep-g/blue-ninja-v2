# Blue Ninja v2 — Multiplication Tables (Requirements for Next Version)

**Source reviewed:** `saideep-g/blue-ninja-v2` (feature entry at `/tables/*`, code under `src/features/multiplication-tables/`).

This document describes:
1) **Current behavior** (what the repo does today), and  
2) **Forward requirements** (what we want the next version to do), especially around **robust tracking, curriculum control, and progressive difficulty**.

---

## 1. Goals and non-goals

### Goals
- Build fast, accurate multiplication fact recall with a game-like loop.
- Adapt to the learner (practice what’s weak, review what’s mastered).
- Provide parents/teachers clear, actionable analytics.
- Make the system measurable so we can iterate: logs, metrics, cohorts, and A/B-friendly configuration.

### Non-goals (for this feature)
- Full algebra / long multiplication teaching.
- Explanation-heavy tutoring (why the product is what it is). This feature is “practice + fluency”.
- Free-form word problems (unless explicitly added as a later mode).

---

## 2. Current implementation (as of blue-ninja-v2)

### 2.1 Navigation and pages
Routes are mounted at `/tables/*` and include:
- `/tables/` → **Mastery Path Dashboard** (`TablesMasteryDashboard`)
- `/tables/practice` → **Practice Session** (`PracticeSession`)
- `/tables/summary` → **Session Summary** (`SessionSummary`)
- `/tables/parent` → **Parent Dashboard** (`ParentDashboard`)

### 2.2 Modes (current)
The code infers “advanced” based on class/grade:
- **Basic**: grade < 7  
- **Advanced**: grade ≥ 7 (note: some service logic treats ≥ 6 as advanced for ledger updates)

Current behavioral differences:
- **Session length**: basic 20 questions, advanced 25.
- **Visible tables**:
  - Basic: 2..12
  - Advanced: 2..9 and 11..20 (table 10 is skipped in the dashboards)
- **Multiplier filtering**:
  - Basic: multipliers 1..10 (engine-level)
  - Advanced: multipliers exclude 1 and 10 (engine-level)

### 2.3 Question types (current)
Two question types are supported:
- **DIRECT**: `t × m = ?`
- **MISSING_MULTIPLIER**: `t × ? = product`

“MISSING_MULTIPLIER” is introduced with ~20% probability **only** if that exact fact has a streak ≥ 5 (see Fact Streaks below).

### 2.4 “Ghost mode” (current)
Ghost mode is implemented as a “beat your previous speed” mechanic:
- Each question carries a `personalBest` derived from `tableStats[table].avgTime` (table-level moving average), defaulting to 5 seconds if missing.
- A “ghost bar” animates for `personalBest` duration; if the learner answers before the bar completes, they “beat the ghost” and see ghost feedback text.

**Important:** Current ghost timing is **per table**, not per fact (`2×7`), and is based on a moving average, not a true best.

### 2.5 Feedback & motivation messages (current)
There are message pools by mode:
- Basic: “Awesome!”, “Great Job!”, etc.
- Advanced: “Slay.”, “Crisp.”, etc.
Ghost-specific messages exist for both.

Incorrect feedback:
- Shows the correct result (overlay “Result: <correctAnswer>”).
- Current pause after incorrect is ~2.5 seconds (not 3).

Correct feedback:
- Short overlay (~1.0s basic, ~0.6s advanced).
- Plays a “correct” sound.
- Session completion plays a completion sound.

### 2.6 Tracking and storage (current)
- Configuration + ledger are stored on `students/{studentId}.tables_config`.
- Audit logs are stored under `students/{studentId}/table_practice_logs/{bucketId}` (bucketed arrays).
- For each answer we log:
  - table, multiplier, type, isCorrect, timeTaken, timestamp, isValidForSpeed

Ledger updates on every log:
- **TableStats** (per table): status, accuracy (weighted moving), avgTime (moving avg), totalAttempts
- **FactStreaks** (per fact, key `t×m`): streak increments when correct under 3s; resets on wrong/slow.

### 2.7 When a table is “mastered” (current)
A table becomes **MASTERED** if either:
- **Standard mastery:** accuracy ≥ 90%, avgTime < 4s, and totalAttempts > 20  
- **Advanced fast-track:** advanced learner, accuracy == 100%, avgTime < 2.5s, and totalAttempts ≥ 10

When the **current stage table** becomes MASTERED, campaign auto-advances:
- Basic max stage: 12
- Advanced max stage: 20
- Advanced has an initial “fair start” jump to stage 11 if they have no history.

### 2.8 Mix of practice vs review (current)
In a session:
- ~70% questions come from **current stage table**
- ~30% come from **previously mastered tables** (review)

Weighting increases probability for facts with streak=0 and past attempts (proxy for weak).

### 2.9 Known curriculum quirk vs requested behavior
Current engine sets multiplier upper bound as:

`limit = max(baseLimit, currentPathStage)`

This means:
- If the learner is on stage 13, review tables (like 5) can be asked up to multiplier 13 → **e.g., 5 × 13**, which you explicitly want to avoid.

---

## 3. Core functionality requirements (next version)

### 3.1 Practice loop
- A practice session is a sequence of questions generated from a learner-specific plan.
- Every question is answerable via:
  - On-screen numpad
  - Keyboard input (desktop)
- The system must:
  - Validate answer, log attempt, update mastery model
  - Provide immediate audio/visual feedback
  - Advance automatically

### 3.2 Session creation
A session must be created from:
- **Learner profile** (grade, curriculum scope)
- **Tables configuration** (selected tables, path stage, options)
- **Mastery model** (table-level + fact-level scheduling data)

Session parameters:
- `sessionLength` (default: 20 basic, 25 advanced; configurable)
- `reviewMix` (default: 70/30; configurable)
- `questionTypeMix` (DIRECT vs variants; configurable per mastery)

### 3.3 Question types (minimum set)
Keep:
- DIRECT: `t × m = ?`
- MISSING_MULTIPLIER: `t × ? = product` (unlocked by mastery)
- REVERSE_FACT: `product ÷ t = ?` (division-as-inverse; only when multiplication is mastered and stable for all the facts within a table.)

Add (future-ready, can be feature-flagged):
- **DIRECT_SPEED:** `t × m = ?` but presented as a speed round variant (same math, different pacing)
- **MISSING_MULTIPLIER_SPEED:** `t × ? = product` but presented as a speed round variant (same math, different pacing)
- **REVERSE_FACT_SPEED:** `product ÷ t = ?` but presented as a speed round variant (same math, different pacing). Introduced with ~10% probability when all the facts in the table is mastered and stable with a streak of 5.

### 3.4 Timer and pacing
- Each question has a timer (visual, optional numeric display).
- “Rapid mode” (time-bound session) must be supported:
  - e.g., 60 seconds, answer as many as possible
  - scoring: correct count, streak, average response time, best streak
  - incorrect handling still shows correction but should be tuned for speed (shorter penalty, configurable)

---

## 4. Messages, motivation, and “ghost mode”

### 4.1 Feedback messages
Requirements:
- Separate pools by:
  - Mode: basic vs advanced
  - Outcome: correct vs incorrect vs streak milestones
  - Special events: ghost defeated, new personal best, mastery unlocked, level up
- Messages must be:
  - Short (1–3 words) for rapid pace
  - Localizable (future-proof for translations)
  - Configurable per “tone pack” (e.g., playful, calm, sporty)

### 4.2 Motivation system
Add “motivation moments” (non-spammy):
- At streak 3, 5, 10
- After recovering from an error (first correct after wrong)
- After completing a table or a rapid mode run

### 4.3 Ghost mode (next version spec)
Ghost mode should be upgraded to be **fact-level**:
- Each fact `t×m` stores:
  - bestTimeMs (personal best)
  - lastN times (for stability)
- The ghost bar should represent **bestTimeMs** (or a “target time”) for that fact.
- “Ghost defeated” triggers if current time < bestTimeMs (and answer is correct).
- Ghost visuals should be optional (toggle for sensitive learners).

---

## 5. UI requirements (practice session)

### 5.1 Layout
- Mobile-first single-screen flow:
  - Top bar: back, progress (q i / n), streak, optional heatmap shortcut
  - Center: question card
  - Bottom: numpad + submit
- Accessibility:
  - Large tap targets
  - High contrast mode option
  - Screen-reader friendly (aria labels on buttons)
  - Haptics (optional)

### 5.2 Progress and feedback
- Correct answer:
  - Auto-progress with a satisfying sound
  - Optional small animation (sparkle/flash)
- Incorrect answer:
  - **Pause for 3 seconds** (requirement)  
  - Display correct answer prominently
  - Play “incorrect” sound (distinct, not punitive)
  - After pause, auto-advance
- Back navigation:
  - Must confirm exit if session in progress (keep existing behavior)

---

## 6. Curriculum rules and exclusions

### 6.1 Table scope definition (critical)
We must define what counts as “the table” for `n`:

**Configurable scope options (per learner):**
- `n × 10`  (multipliers 1..10)
- `n × 12`  (multipliers 1..12)
- `n × 15`  (multipliers 1..15)
- `n × 20`  (multipliers 1..20)
- Custom set: `{2,3,4,5,6,7,8,9,10}` etc.

This scope must be stored in configuration and used by the question generator.

### 6.2 Exclusions for advanced learners
For “advanced mode” (or advanced configuration), exclude trivial patterns unless explicitly enabled:
- Exclude multiplier `1` (e.g., `? × 1`)
- Exclude multiplier `10` (e.g., `? × 10`)
- Optionally exclude table `10` entirely (consistent with current UI), or include it if curriculum requires.

These exclusions must be:
- Switchable per learner (some curricula require 10s fluency)
- Separate from the scope (scope says what’s allowed; exclusions remove items inside that)

### 6.3 “Max number must be the current table being practiced or the baseLimit (=10)”
Requirement:
- For any table `t`, **never** generate a question with multiplier > max (baseLimit, currentPathStage) **unless the learner’s curriculum explicitly allows it**.

Examples:
- Practicing 12-table: allow `5 × 12`, disallow `5 × 13`
- Practicing 7-table: allow `7 × 10` as a max as 10 is `baseLimit`, disallow `7 × 12` (unless configured)

Implementation rule (recommended default):
- `maxMultiplierForTable(t) = max (baseLimit = 10, currentPathStage)
- and then apply exclusions (remove 1, 10, etc.)

---

## 7. Basic vs advanced mode (behavior matrix)

| Dimension | Basic Mode (default) | Advanced Mode (default) |
|---|---|---|
| Visible tables | 2..12 | 2..9, 11..20 (10 optional) |
| Multipliers | 1..10 (or scope-based) | 2..9 + scope-based (exclude 1,10) |
| Session length | 20 | 25 |
| Feedback style | playful | crisp/minimal |
| Ghost mode | optional | on by default (configurable) |
| Variants | mostly DIRECT | unlock variants sooner |

**Note:** “mode” should be a config profile, not hard-coded grade logic.

---

## 8. Progressive difficulty elements

### 8.1 Current progressive element (keep)
- Unlock `t × ? = product` after the fact has a streak of correct-fast answers.

### 8.2 Add progressive ladder (next version)
Introduce a staged ladder per fact:

**Stage A: Direct facts**
- `t × m = ?`

**Stage B: Missing multiplier**
- `t × ? = product`  
Unlocked when fact is stable (see mastery below).
- e.g., `2 × ? = 8` introduced **after** `2 × 4` is mastered


Rule you requested:
- Do not introduce `2 × ? = 8` until `2 × 4` is mastered.

Implementation:
- Each fact has its own mastery state; variants are gated by that fact’s mastery state.

---

## 9. Practice mix: “practiced vs mastered” scheduling

### 9.1 Session composition (default)
- 70% “current focus” (campaign stage table + weak facts inside it)
- 30% “review” (mastered tables/facts spaced over time)

### 9.2 What counts as “weak”
Weakness signals (ranked):
1) Recent incorrect attempts (highest weight)
2) Low accuracy (fact-level)
3) Slow response times (fact-level)
4) Long time since last attempt (spaced review)

### 9.3 Review scheduling
Use a spaced repetition scheduler (see SM-2 below) to decide which mastered facts return for review.

---

## 10. Mastery definitions (table vs fact)

### 10.1 Fact mastery (new requirement)
A **fact** is mastered when it meets both:
- Accuracy ≥ X% over last N attempts (e.g., ≥ 90% over last 10)
- Speed ≤ targetMs (e.g., ≤ 3000ms median, not average)
- Stability: achieved on at least 2 separate days (prevents “one lucky streak”)

Store per fact:
- attempts, correct, rollingWindow stats
- bestTimeMs
- sm2: easinessFactor, intervalDays, repetitions, dueDate

### 10.2 Table mastery (derived)
A **table** is mastered when:
- ≥ P% of its facts are mastered (e.g., 80–90%), and
- table-level accuracy/speed is within target, and
- no “red” facts remain (facts with repeated failures)

This aligns with your desire to “track and improve” because it’s explainable:
- “Table 7 is mastered except 7×8 and 7×9, scheduled for review tomorrow.”

---

## 11. Robust tracking and improvement system

### 11.1 Data model upgrades
Keep the audit trail logs, but add structured mastery state:

**Per student**
- `tables_config` (curriculum + settings + feature flags)
- `tables_mastery`:
  - perTable summary
  - perFact mastery + SM-2 scheduling fields

**Per attempt log (append-only)**
- question:
  - table, multiplier, variantType
  - prompt format (direct/missing)
  - expectedAnswer
- response:
  - studentAnswer
  - isCorrect
  - timeTakenMs
  - inputMethod (numpad/keyboard)
  - device (optional)
- context:
  - sessionId
  - modeProfile
  - curriculumScopeId
  - appVersion

### 11.2 Rapid mode metrics
Track:
- correct/min
- error rate
- best streak
- time distribution (median, p90)
- fatigue marker (speed drop after mistakes)

### 11.3 Implement SM-2 at individual fact level
For each fact `t×m`:
- Use SM-2 scheduling with a grading function derived from:
  - correctness
  - timeTakenMs relative to target
  - number of hints (if any)
Example conversion:
- Correct and fast → grade 5
- Correct but slow → grade 3–4
- Incorrect → grade 0–2

Then:
- Update SM-2 parameters (EF, interval, repetitions)
- Set next due date
- Generator pulls “due” facts into review pool.

### 11.4 Curriculum and scope editing
We need a parent/teacher UI (or admin tool) to:
- Choose table range (2..12, 2..20, etc.)
- Choose per-table multiplier max (10/12/15/20)
- Choose exclusions (1s, 10s, table 10)
- Choose variant unlock policy
- Choose session defaults (length, mix)
- Save as a named “curriculum profile” (versioned)

### 11.5 Experimentation hooks
To improve the system over time:
- Version config schemas (`schemaVersion`)
- Log `appVersion` and `curriculumVersion`
- Make generator deterministic under a `seed` (for debugging + replay)

---

## 12. Sound and feedback requirements

### 12.1 Correct
- Play correct sound immediately
- Auto-advance quickly (configurable; default 0.6–1.0s)
- Optional “combo” sound on streak milestones

### 12.2 Incorrect
- Play incorrect sound immediately
- Show correct answer
- **Pause 3 seconds**
- Auto-advance

### 12.3 Completion
- Play completion sound
- Summary screen shows:
  - accuracy
  - avg time
  - streaks
  - “facts improved” (e.g., new PBs, newly mastered facts)

---

## 13. Acceptance criteria checklist (MVP for next version)

1) **No out-of-scope questions** (scope and exclusions enforced).  
2) **No multiplier > table** unless explicitly configured.  
3) **Fact-level tracking** exists (accuracy + timing + SM-2 fields).  
4) Ghost mode uses **fact-level PB** (or target time), not table average.  
5) Incorrect pause is **exactly 3 seconds** (configurable).  
6) Session generator respects the configured review mix and pulls due SM-2 facts.  
7) Parent dashboard can show:
   - table mastery (derived)
   - top weak facts
   - next due facts
   - progress over time

---

## 14. Open configuration defaults (recommended starting point)

- Basic default scope: `n × 10` for 2..12
- Advanced default scope: `n × 12` for 2..20 (exclude 1 and 10 multipliers; optionally skip table 10)
- Variant unlock:
  - MISSING_MULTIPLIER unlocked when fact mastery stable (≥ 5 fast correct + ≥ 2 days)
- Review mix:
  - 70/30, with 10–20% of review reserved for “due today” SM-2 facts

---

## Appendix A — File map (for developers)

Key files in the repo today:
- `src/features/multiplication-tables/pages/PracticeSession.tsx` (UI loop, feedback, ghost bar)
- `src/features/multiplication-tables/logic/inputEngine.ts` (question generation)
- `src/features/multiplication-tables/logic/ledgerUpdates.ts` (mastery + progression)
- `src/features/multiplication-tables/services/tablesFirestore.ts` (logging, config storage, stats readers)
- `src/features/multiplication-tables/pages/TablesMasteryDashboard.tsx` (mastery dashboard)
- `src/features/multiplication-tables/pages/ParentDashboard.tsx` (analytics + settings save)

