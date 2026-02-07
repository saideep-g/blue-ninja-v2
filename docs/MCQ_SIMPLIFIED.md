# Study Era — `MCQ_SIMPLIFIED` Requirements (Detailed, Based on Blue Ninja v2)

**Scope:** This section documents how **Study Era** loads, renders, validates, and logs **MCQ_SIMPLIFIED** questions today, and the requirements to reproduce/enhance this behavior in another app.

**Primary code paths (v2):**
- Session bootstrap + question loading: `src/services/eraSessionService.ts`
- Quiz container (timer + router): `src/components/student/dashboard/era/EraQuizView.tsx`
- Session orchestration + logging: `src/components/student/dashboard/StudyEraDashboard.tsx`
- Template selection (question-type router): `src/components/templates/TemplateRouter.tsx`
- MCQ UI: `src/components/templates/McqEraTemplate.tsx`
- Numeric UI (sibling type): `src/components/templates/NumericAutoTemplate.tsx`
- Local buffering + auto-sync to Firestore: `src/context/NinjaContext.tsx`
- Practice history (monthly logs UI): `src/components/student/dashboard/logs/MonthlyLogsView.tsx`
- Admin bundle assignment: `src/components/admin/AdminBundleManager.tsx`

---

## 1) What “Study Era” is (from a flow standpoint)

Study Era is a *daily subject session* that:
1) Creates or resumes a **daily** local session per subject, per user.
2) Loads questions from Firestore (prefer bundles, fallback to `questions` collection).
3) Renders each question through a **Template Router** that picks UI based on question type.
4) Captures per-question telemetry (answer + time).
5) Buffers logs locally and auto-syncs them to Firestore in batches (every 5 questions), with a final sync on exit/finish.
6) Provides a monthly “Practice History” view sourced from Firestore monthly buckets.

---

## 2) How questions are loaded

### 2.1 Session lifecycle (daily cache)
**Session key (localStorage):**
- `era_session_v1_{userId}_{subjectId}_{YYYY-MM-DD}`

**Session versioning:**
- `SESSION_VERSION = 4` (used to invalidate old cache when schema/visual logic changes)

**Resume rules:**
- If local cache exists for *today* and `version` matches and it has real questions (not `mock_fail_1`), resume it.
- Otherwise, invalidate and fetch fresh questions.

### 2.2 Firestore fetch strategy (priority order)
**Strategy A (preferred):**
- Collection: `question_bundles`
- Filter: `where('subject','==',subject) AND where('grade','==',7)`
- Limit: `1`
- For that bundle ID, load question data from:
  - `question_bundle_data/{bundleId}` → field `questions`

**Strategy B (fallback):**
- Collection: `questions`
- Filter: `where('subject','==',subject)`
- Limit: `10`

**Final fallback (hard fail-safe):**
- A single `MCQ_SIMPLIFIED` “No questions found…” placeholder item (`id = mock_fail_1`)

### 2.3 Normalization/mapping into runtime `Question`
When bundle data is used, questions are transformed into a runtime-friendly structure. For MCQ vs Numeric, v2 uses a “detect and map” approach:

#### MCQ mapping (bundle question → runtime Question)
**Input (typical bundle question shape for MCQ):**
```json
{
  "id": "Q123",
  "question": "What is 7×8?",
  "options": ["54", "56", "64", "58"],
  "answer": "56",
  "instruction": "Choose the best answer",
  "explanation": "7×8 = 56",
  "visualType": "svg|image|null",
  "visualData": "<svg>...</svg>",
  "imageUrl": "https://...",
  "...": "..."
}
```

**Runtime output (minimum required):**
- `type = "MCQ_SIMPLIFIED"`
- `content.prompt.text = question`
- `content.instruction = instruction || "Select the best answer"`
- `interaction.config.options = [{id, text, isCorrect}]`
- `correctOptionId` computed *after shuffling*
- `answerKey.correctOptionId = correctOptionId`
- `subject = subjectId`
- `explanation` passed through

**Option shuffling rule:**
- Options are shuffled unless “special” options are present:
  - Regex includes: `both ... and`, `all of the`, `none of the`, `a and b`, `neither`, etc.
  - If special options exist, they are pushed to the end (to avoid breaking composite options).

#### Numeric mapping (bundle question → runtime Question)
Bundle question is treated as numeric if:
- `sq.type` in `NUMERIC_AUTO|NUMERIC_INPUT`, OR
- `options` missing/empty AND (`answer` or `correct_answer` exists)

**Runtime output (minimum required):**
- `type = "NUMERIC_AUTO"`
- `content.prompt.text = question`
- `answerKey.value = answer|correct_answer`
- `answerKey.tolerance = tolerance || 0.01`
- Visual fields pass through (`visualType`, `visualData`, `imageUrl`)
- `interaction.config.placeholder = "Enter answer..."`
- `interaction.config.unit = unit` (optional)

---

## 3) How a question is rendered (parent renderer + type router)

### 3.1 Parent quiz frame
`EraQuizView` is the quiz “shell”:
- Top bar includes:
  - Exit (X) button
  - Timer pill (seconds -> `m:ss`)
  - Progress pill: `Q{index+1}/{total}`
- A simple timer increments every second while tab is focused (pauses on window blur).

`EraQuizView` renders exactly one child:
- `<TemplateRouter question={questions[currentQuestionIndex]} ... />`

### 3.2 Type-based template selection (`TemplateRouter`)
The router determines `templateId` via this priority:
1) `question.type`
2) `question.templateId`
3) `question.template_id`
4) `question.template`
5) If none: infer:
   - If it has an answer but no options → `NUMERIC_AUTO`
   - Else → `MCQ_SIMPLIFIED`

**Registry:**
- `MCQ_SIMPLIFIED` → `McqEraTemplate`
- `NUMERIC_AUTO` / `NUMERIC_INPUT` → `NumericAutoTemplate`

**Requirement (for future versions):**
- Keep this “single router” pattern so the app can support multiple question types cleanly.
- Ensure **server/DB question “type”** is the primary switch, with inference only as a fallback.

---

## 4) MCQ_SIMPLIFIED UI and interaction requirements

### 4.1 UI layout (current behavior)
In `McqEraTemplate`:
- Question card:
  - Prompt rendered with KaTeX/InlineMath support (`$...$` and `$$...$$`), plus `**bold**` highlighting.
  - Optional visual block:
    - SVG: injected via `dangerouslySetInnerHTML`
    - Image: `img` tag for `imageUrl`
  - Optional instruction line (uppercase, subtle)
  - “Flag issue” button (opens report modal)

- Options list:
  - A/B/C/D/E label chips
  - Click selects an option (logs “first thought” once)
  - After submit:
    - Correct option becomes green, wrong selected becomes red/strikethrough, others dim.

- Action:
  - Before submit: “Final Answer”
  - After submit: explanation card (if explanation exists), plus “Next Era” button

### 4.2 “How the answer is validated”
- Correct answer index is computed by checking (in order):
  1) V3 stage-based structure: `stages[0].answer_key.correct_option_id`
  2) Legacy `correctOptionId`
  3) `answerKey.correctOptionIndex`
  4) `correct_answer` string match
  5) `options[].isCorrect === true`
- Student selection is correct if `selectedIndex === correctIndex`.

### 4.3 Submission + feedback behavior
On Submit:
- Plays a short “correct” or “wrong” oscillator sound.
- Sets feedback text:
  - Correct: random praise (`getRandomPraise()`)
  - Incorrect: `"Not quite the vibe... check the fix!"`
- Sends `resultData` upstream:
  - `onAnswer(resultData, false)` immediately (log-only; do NOT advance)
- Auto-advance:
  - If correct and `autoAdvance` setting is not false:
    - after 2 seconds → `onAnswer(resultData, true)` (advance)
- Manual continue:
  - “Next Era” calls `onAnswer(resultData, true)` to advance

**Requirement:**
- Preserve the “log now, advance later” split. It prevents missed logs when users exit quickly.

### 4.4 Explanation behavior
- Explanation is shown after submit if `question.explanation` exists.
- For MCQ types it uses a “Reasoning” block (not step-splitting).
- For non-MCQ it can render step-by-step (handled inside templates).

### 4.5 Flagging issues
Flag modal supports three reasons:
- “Question is confusing”
- “Answer seems wrong”
- “Typo or Glitch”

**Firestore write:**
- Collection: `question_reports`
- Fields: `questionId`, `questionText`, `reason`, `reportedAt`, `userAction`

**Requirement:**
- Keep this “student reporting” pipeline; add severity, subject, and bundleId if available.

---

## 5) Numeric Auto sibling behavior (for completeness)

`NumericAutoTemplate` implements:
- Input allowing numbers, decimals, fractions (`a/b`), ratios (`a:b`), and negative values
- Correctness check:
  - numeric comparisons within tolerance
  - string compare for ratios/non-numeric values
- Feedback:
  - Correct: random praise
  - Wrong: `"✗ Check your calculation."` (or feedback map)
- Logging:
  - Immediately `onAnswer(resultData, false)`
  - Auto-advance on correct after 2 seconds (if enabled)
- Explanation appears when:
  - wrong submission OR preview mode

---

## 6) What happens when the student answers (system side)

### 6.1 The “two-call” pattern and why it matters
Both MCQ and Numeric templates call:
1) `onAnswer(result, false)` on submit (log-only)
2) `onAnswer(result, true)` on auto-advance or “Next” click (advance)

StudyEraDashboard’s `handleQuizAnswer`:
- Deduplicates logging using a per-session Set (`loggedQuestions`) keyed by questionId.
- Advances index only when `shouldAdvance === true`.
- Updates local session cache via `eraSessionService.updateProgress(...)`.
- On quiz completion:
  - clears the subject session cache (`eraSessionService.clearSession`)
  - triggers a final cloud sync (`syncToCloud(true)`)
  - shows celebration and then returns to dashboard

### 6.2 “Correct/Wrong” display and user control
- UI shows feedback instantly inside the template.
- Student can:
  - wait for auto-advance on correct (2s)
  - or click “Next Era”
- There is no “Explain/Understood” separate button today. It is effectively the “Next” button.

**Requirement (enhancement option):**
- Add a dedicated “Understood ✅” CTA for incorrect answers to encourage reading explanation.
- Support configurable behavior:
  - wrong answer: require “Understood” to proceed
  - correct answer: auto-advance after N seconds (configurable)

---

## 7) Logging, batching, offline resilience, and where data is stored

### 7.1 Local buffering + auto sync (every 5 questions)
`NinjaContext` maintains:
- `bufferRef.current.logs` in memory
- `localBuffer` mirrored in React state
- Persisted crash-resilience snapshot in localStorage:
  - key: `ninja_session_{uid}`
  - payload: `{ stats, buffer, role, lastUpdated }`

**Auto-sync rule:**
- When buffered logs reach `>= 5`, `syncToCloud()` triggers automatically.

### 7.2 Firestore write shape and path (practice logs)
Firestore path (per user):
- `students/{uid}/session_logs/{YYYY-MM}`

Document shape:
```json
{
  "entries": [ ...QuestionLog objects... ],
  "lastUpdated": "serverTimestamp()"
}
```

Writes are done via `arrayUnion(...logs)` into monthly documents.

### 7.3 What fields are captured in a `QuestionLog`
StudyEraDashboard calls `logQuestionResultLocal()` with:
- `questionId`
- `questionText` (from `question_text` or prompt text)
- `studentAnswer` (from template result payload)
- `correctAnswer` (best-effort extraction from question structure + result payload)
- `isCorrect`
- `timestamp` (Date)
- `subject` (normalized: english → vocabulary, else lowercase)
- `timeSpent` (seconds; from timer)
- `questionType` (derived from question’s `type/templateId/...` or inferred)

During cloud sync, logs are enriched with:
- `diagnosticTag` defaulting to `NONE` or `UNTAGGED`
- `isSuccess` = correct OR recovered
- `masteryDelta` if masteryBefore/After exist
- `timestamp` normalized for array storage

### 7.4 IndexedDB vs localStorage
In v2 Study Era:
- **localStorage is used** (not IndexedDB):
  - era session cache
  - crash-resilient log buffer + stats snapshot

**Requirement (future robustness):**
- If you need higher scale/offline robustness:
  - move log buffer to IndexedDB (append-only), and keep localStorage only for minimal pointers/flags.

---

## 8) Practice history UI (how logs are displayed)

MonthlyLogsView:
- Reads monthly log doc:
  - `students/{uid}/session_logs/{YYYY-MM}`
- Sorts `entries` reverse chronological by timestamp
- Shows:
  - subject filter
  - per-month summary pivot (answered/correct/time/accuracy)
  - per-log row:
    - correctness icon
    - timestamp
    - subject
    - questionId
    - questionText (KaTeX rendering)
    - student answer + correct answer (if wrong)
    - optional explanation

**Requirement:**
- Preserve monthly bucketing, but consider:
  - server-side aggregation for quicker summaries
  - pagination if monthly `entries` becomes large

---

## 9) Admin: where questions live, and how to detect duplicates

### 9.1 Where the admin sees/controls content today
AdminBundleManager supports:
- Viewing students (`students` collection)
- Assigning bundles to students (`assignedBundles` field on student doc)
- Viewing bundles (`question_bundles` collection)

**Important:** There is currently **no dedicated “duplicate question” UI** for admins.

### 9.2 Requirement: add duplicate detection + visibility for admins
Add an Admin view (new feature) that scans:
- `question_bundle_data/{bundleId}.questions` (and optionally `questions` collection)

Duplicate detection should support:
1) **Exact ID duplicates** (same `id` reused)
2) **Exact prompt duplicates** (same normalized `question`)
3) **Near-duplicates** (fuzzy match: e.g., Levenshtein / trigram similarity)
4) **Option-set duplicates** (same options + same answer, prompt differs slightly)
5) **Answer conflicts** (same prompt/options but different answer)

Admin UI requirements:
- Filters: subject, grade, bundle, template type
- Grouped results:
  - “Duplicate groups” with list of question IDs + bundle references
- Actions:
  - export duplicates report as JSON/CSV
  - mark one canonical
  - bulk delete (or soft-delete flag)
  - bulk edit (open in editor)

Suggested storage for duplicate scan results:
- `admin_reports/duplicates_{YYYY-MM-DD}` with `entries` and metadata
- Or keep it client-side with downloadable report (like Bias Detector does)

---

## 10) Requirements to make MCQ_SIMPLIFIED more robust for future versions

### 10.1 Robust question schema (contract)
Define a “single source of truth” schema for question types.
For MCQ_SIMPLIFIED, require:
- `id` (string, unique)
- `type = "MCQ_SIMPLIFIED"`
- `content.prompt.text` (string)
- `interaction.config.options[]` with stable `id` and `text`
- `answerKey.correctOptionId` (string)
Optional but supported:
- `content.instruction`
- `explanation`
- `visualType`, `visualData`, `imageUrl`
- `feedbackMap` overrides

### 10.2 Validation on ingestion (admin upload)
When admins upload/import questions, validate:
- Options count >= 2
- Exactly 1 correct answer (or exactly 1 correctOptionId)
- No duplicate option texts
- No empty option text
- Prompt is non-empty and not an object
- Visual content safe size limits (SVG length, image URL)
- Explanation present when desired (policy-based)

### 10.3 Session metrics and assessment boundaries
Today, logs are written continuously and “session boundary” is implicit.
Requirement: introduce explicit session objects:
- `students/{uid}/era_sessions/{sessionId}`
  - subject, date, start/end timestamps, total questions, accuracy, avg time, etc.
Link question logs to sessionId for analysis.

### 10.4 Telemetry hooks (first thought, time to first action)
Both templates already emit `onInteract` hooks for:
- first option select (MCQ)
- first keypress (Numeric)

Requirement:
- Wire `onInteract` into a telemetry buffer and store:
  - timeToFirstAction
  - changedAnswer? (MCQ: changed selected option before submit)
  - hints viewed? (future)
  - explanation dwell time (time spent on feedback screen)

---

## 11) Quick “copy this behavior” checklist

To reproduce Study Era MCQ_SIMPLIFIED accurately in another app:
- Implement daily per-subject session caching (localStorage) with version invalidation.
- Fetch from `question_bundles` + `question_bundle_data` first; fallback to `questions`.
- Normalize into runtime question schema (MCQ vs Numeric) consistently.
- Render via a Template Router keyed on `type`.
- Use “log-now, advance-later” two-call pattern to prevent missed logs.
- Buffer logs locally and sync to Firestore every 5 questions, with a final sync on finish/exit.
- Store logs in monthly bucket docs under `students/{uid}/session_logs/{YYYY-MM}`.
- Provide a monthly practice history view.

