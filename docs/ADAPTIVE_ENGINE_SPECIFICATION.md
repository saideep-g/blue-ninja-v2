# Master Specification: Adaptive Pool Engine & Mastery System

## 1. Executive Summary
The **Adaptive Pool Engine** is a unified learning system designed to manage subjects with AI-generated question banks (Science, Social Studies, English Grammar, and Math) stored in Firestore as question bundles. It replaces random question selection with an intelligent router that balances novelty (Discovery) with reinforcement (Proficiency).

### 1.1 The Engine Router
The system uses a `tracking_granularity` flag to determine how progress is tracked and displayed:
*   **ATOM_LEVEL (Individual Concepts):** Used for **Math**. Requires granular tracking of specific skills (e.g., "Adding Fractions"). Progress is visualized as a "Concept Map."
*   **CHAPTER_LEVEL (Thematic Units):** Used for **Science, Social, and English**. Tracks broader mastery of a unit (e.g., "Force & Motion"). Progress is visualized as a "Table of Contents."

---

## 2. Technical Architecture & Data Model

### 2.1 Curriculum Definitions (`curriculum`)
Defines the mapping of a subject's content.

**Chapter ID Conventions:**
Format: `{subject_code}{chapter_number_NN}`
*   Math: `math01`
*   Science: `sci01`
*   English: `eng01`
*   GK: `gk01`
*   Social (Sections): `soc_geo01`, `soc_his01`, `soc_civ01`

```json
{
  "subject": "science",
  "grade": 7,
  "engine_type": "ADAPTIVE_POOL",
  "tracking_granularity": "CHAPTER_LEVEL",
  "chapters": [
    {
      "chapter_id": "sci01",
      "title": "Force and Motion",
      "total_questions_active": 45,
      "difficulty_distribution": { "easy": 15, "medium": 20, "hard": 10 },
      "atoms": [
        { "atom_id": "sci01_atom01", "title": "Friction Types" },
        { "atom_id": "sci01_atom02", "title": "Gravity" }
      ]
    }
  ]
}
```

### 2.2 Question Metadata
Every question in the pool must contain the following attributes:
*   **Type:** `MCQ_SIMPLIFIED` (Default), `NUMERIC_AUTO`, `SHORT_ANSWER`, `TAP_TO_FILL`.
*   **Difficulty:** 
    *   `easy` (1): Foundational.
    *   `medium` (2): Core Standard.
    *   `hard` (3): Challenge.
    *   `expert` (4): **Hidden Tier.** Excluded from standard sessions. Reserved for "Olympiad" or "Boss Battle" modes.
*   **Bloom Level:** Remember, Understand, Apply, Analyze, Evaluate, Create (Required for `SHORT_ANSWER`).
*   **Tags:** `chapter_id`, `atom_id` (Crucial for Math), and `misconception_tag` (Optional).

### 2.3 Student Adaptive Profile (`student_adaptive_profile`)
```json
{
  "student_id": "st_01",
  "subject": "science",
  "grade": 7,
  "stats": {
    "sci01": {
      "status": "IN_PROGRESS", // NOT_STARTED, IN_PROGRESS, MASTERED
      "coverage_percent": 35,
      "proficiency_score": 82,
      "last_played": "ISO_TIMESTAMP",
      "weak_areas_detected": ["short_answer_logic"]
    }
  }
}
```

---

## 3. The Mastery Algorithm (The "Two-Bar" Metric)
To avoid penalizing students when new content is added to the pool, mastery is split into two components:

### 3.1 Proficiency Score (Quality: 0–100%)
Represents how well the student knows the material they have actually attempted.
*   **Logic:** Weighted Moving Average.
*   **Weights:**
    *   **Recency:** Last attempt (1.0), Previous (0.8), Older (0.5).
    *   **Difficulty:** Easy (1x), Medium (1.5x), Hard (2x).
    *   **Type:** MCQ (1x), Numeric/Short Answer (1.2x).

### 3.2 Coverage Score (Quantity: 0–100%)
`Coverage = (Unique Questions Attempted) / (Total Active Questions in Pool)`

### 3.3 True Mastery Index
`True Mastery = Proficiency × Coverage`.
*   *Behavior:* If an admin adds 40 new questions, Proficiency remains stable (no confidence drop), but Coverage and True Mastery drop to indicate new material is available.

---

## 4. Adaptive Selection & Session Logic
A standard session consists of **20–30 questions**, derived from the student profile settings.

### 4.1 State-Based Selection (The Progression Ladder)
| State | Condition | Focus | Question Mix (Total 20–30) |
| :--- | :--- | :--- | :--- |
| **Discovery** | Coverage < 30% | Novelty & Baseline | 20% Correct Review, 80% New (Easy/Med) |
| **Practice** | Coverage 30–80% & Prof. < 70% | Remediation | 30% Incorrect History, 50% New (Med), 20% Correct Review |
| **Challenge** | Proficiency > 80% | Deep Mastery | 50% Hard (New), 30% Med (New), 20% Short Answer/Complex |
| **Maintenance** | Coverage > 95% & Prof. > 90% | Retention | Spaced Repetition items from across the Syllabus |

### 4.2 Grading, Bloom Levels & Cost Controls
To manage LLM costs and ensure fair grading:

1.  **Local Validation (Cost Saving):**
    *   Before triggering the LLM, the client app must check: `IF length(student_answer) < 5 chars THEN Reject locally` with "Please explain more".
2.  **Partial Proficiency (Scoring):**
    *   Short Answer grading returns a score of 1–5 stars.
    *   **Mapping:** 1=0%, 2=25%, 3=50%, 4=75%, 5=100% weighted success in the algorithm.
    *   *Example:* A "3/5" grade counts as a 50% success, preserving the nuance that the student partially knows the concept.

---

## 5. Admin Content Operations (The "Batch" Workflow)

### 5.1 Gap Analysis Heatmap
* **Visual:** Matrix view (Rows: Chapters, Columns: Difficulty).
* **Logic:** Red (<5 Qs), Yellow (5–10 Qs), Green (>10 Qs).
* **Interaction:** Clicking a cell (e.g., "Math - Algebra - Hard") pre-fills the **Prompt Builder**.

### 5.2 The Prompt Builder Engine (Batching Strategy)
To ensure high-quality output from LLMs, the system **never** requests more than 20 questions in a single API call.

**The "100-Question" Workflow:**
If an Admin requests 100 questions for a Chapter:
1.  **Segmentation:** The system internally divides this into **5 Batches of 20**.
2.  **Prompt Staging:** The UI generates 5 distinct prompt strings (or chains the API calls).
    * *Batch 1 Focus:* "Generate 20 questions focusing on core concepts..."
    * *Batch 2 Focus:* "Generate 20 questions focusing on edge cases..."
3.  **Execution:** The Admin copies/runs these sequentially to avoid context window degradation.

**The Prompt Template Structure:**
> "Act as a Grade {grade} {subject} teacher.
> **Task:** Generate a batch of **20 {difficulty} questions** for the chapter '{chapter_name}'.
> **Template Type:** {template_id}
>
> **Strict constraints:**
> 1.  **No Duplicates:** Ensure questions are unique from each other.
> 2.  **Format:** You MUST output a JSON array matching the schema below exactly.
> 3.  **Content:** {specific_content_instructions}
>
> **Target JSON Schema:**
> {insert_specific_json_schema_from_section_6}
> "

### 5.3 Bulk Upload & Validation Gatekeeper
The Bulk Upload tool is the final line of defense before questions enter the DB.
* **Duplicate Check:** Hashes `question_text` + `options` to prevent re-uploading existing questions.
* **Schema Validator:** Parses the uploaded JSON against the strict definitions in Section 6.
    * *Failure:* If a `TAP_TO_FILL` question misses the `blanks` array, the upload is rejected with a specific line number error.
    * *Logic Check:* For `MCQ`, ensures `answer` string exists exactly within the `options` array.

---

## 6. Question Templates & Data Schemas
The AI must generate questions adhering strictly to these formats.

### 6.1 Template: `NUMERIC_AUTO` (Math/Science)
Used for calculation-heavy questions.
* **Constraint:** `explanation` must be step-by-step with `\n` line breaks.
* **Visuals:** AI should set `visualData: null` unless specifically trained to generate SVGs.
* **Math Formatting:** Use LaTeX (e.g., `$x^2$`) for mathematical symbols.

```json
{
  "id": "generated_uuid",
  "chapter_id": "math11",
  "template_id": "NUMERIC_AUTO",
  "visualType": null, 
  "question": "A wire in the shape of a rectangle (length 20cm, breadth 8cm) is cut and completely rebent to form a square. Calculate the difference in area.",
  "answer": "36",
  "difficulty": "hard",
  "explanation": "1. Perimeter of rectangle = $2(20 + 8) = 56$ cm. \n2. Side of square = $56 / 4 = 14$ cm. \n3. Area of rectangle = $20 \\times 8 = 160$ cm². \n4. Area of square = $14 \\times 14 = 196$ cm². \n5. Difference = $196 - 160 = 36$ cm².",
  "misconception_tag": "area_perimeter_confusion",
  "bloom_level": "analyze"
}
```

### 6.2 Template: `TAP_TO_FILL` (English/Grammar)
Used for sentence completion and vocabulary.
* **Constraint:** The `blanks` array must contain objects with unique IDs matching the `{{id}}` placeholders in `sentence_template`.
* **Constraint:** Each blank must offer at least 2 incorrect options (distractors) with specific feedback.

```json
{
  "id": "generated_uuid",
  "chapter_id": "eng03",
  "template_id": "TAP_TO_FILL",
  "difficulty": "medium",
  "tags": ["vocabulary", "adjectives"],
  "sentence_template": "Some people insult him by calling him {{1}}, but I admire him for being {{2}}.",
  "blanks": [
    {
      "id": 1,
      "hint": "Negative word",
      "correct_value": "Stingy",
      "options": [
        { "value": "Stingy", "feedback": "Correct! 'Stingy' is an insult." },
        { "value": "Frugal", "feedback": "Incorrect. 'Frugal' is positive." },
        { "value": "Poor", "feedback": "Incorrect. Context implies choice." }
      ]
    },
    {
      "id": 2,
      "hint": "Positive word",
      "correct_value": "Frugal",
      "options": [
        { "value": "Frugal", "feedback": "Correct! 'Frugal' implies wise saving." },
        { "value": "Cheap", "feedback": "Incorrect. 'Cheap' is negative." },
        { "value": "Generous", "feedback": "Incorrect. He refuses to spend." }
      ]
    }
  ],
  "summary_note": "Remember: 'Stingy' is negative, 'Frugal' is positive."
}
```

### 6.3 Template: `SHORT_ANSWER` (Subjective)
Used for deep understanding and creative application.
* **Constraint:** `evaluation_criteria` is an array of strings used by the Grading LLM to check the student's answer.
* **Constraint:** `max_points` must equal the length of `evaluation_criteria`.

```json
{
  "id": "generated_uuid",
  "chapter_id": "sci10",
  "template_id": "SHORT_ANSWER",
  "question": "Suggest two specific ways to increase the strength of an electromagnet.",
  "model_answer": "Increase the number of coils and increase the current.",
  "evaluation_criteria": [
    "Suggestion 1: Increase number of turns/coils",
    "Suggestion 2: Increase current/voltage"
  ],
  "max_points": 2,
  "difficulty": "hard",
  "bloom_level": "create",
  "min_words": 10
}
```

### 6.4 Template: `MCQ_SIMPLIFIED` (Standard)
* **Constraint:** Must provide exactly 4 options.
* **Constraint:** `answer` must be an exact string match to one of the `options`.

```json
{
  "id": "generated_uuid",
  "chapter_id": "sci10",
  "template_id": "MCQ_SIMPLIFIED",
  "question": "In a standard symbolic representation of an electric cell, what does the longer, thinner line represent?",
  "options": [
    "The positive terminal",
    "The negative terminal",
    "The internal resistor",
    "The insulating layer"
  ],
  "answer": "The positive terminal",
  "difficulty": "medium",
  "explanation": "The long line is positive, the short thick line is negative.",
  "bloom_level": "remember"
}
```

---

## 7. Implementation Roadmap

### Phase 1: Core Infrastructure & Routing
**Goal:** Establish the data foundation and traffic control.
* **Database Setup:**
    * Initialize `curriculum` collection with `tracking_granularity` flags.
    * Initialize `question_pool` collection with composite indexes (`subject` + `chapter_id` + `difficulty`).
* **Engine Router Logic:**
    * Implement `SubjectRouter.tsx`:
        * *IF* `tracking_granularity == ATOM_LEVEL` → Route to **Concept Map Engine** (Math).
        * *IF* `tracking_granularity == CHAPTER_LEVEL` → Route to **Table of Contents Engine** (Science/English).
* **Schema Validation:**
    * Deploy Firestore Security Rules to validate question uploads against the JSON schemas defined in Section 6.

### Phase 2: The Selection Intelligence (Backend/Logic)
**Goal:** Build the brain that picks the "Perfect 20" questions.
* **Metric Calculation:** Implement the `calculateMastery(history)` function to derive "Proficiency" (Quality) and "Coverage" (Quantity) scores.
* **Selection Algorithm:** Implement `getQuestionsForSession()`:
    * **State Detection:** Logic to classify user as *Discovery, Practice, or Challenge*.
    * **Soft-Balancing:** Ensure the returned batch of 20 questions contains unique `sub_topic` tags (for Chapters) or `atom_id` tags (for Math) to prevent repetition.
    * **Cost Guard:** Hard-limit `SHORT_ANSWER` questions to max 2 per session.

### Phase 3: Offline-First Architecture (Client Service)
**Goal:** Zero-latency experience and bandwidth optimization.
* **Local Caching (Dexie.js):**
    * On Grade Load: Download the entire `question_bundle` for the subject into IndexedDB.
    * All session queries run against local IndexedDB (Speed < 50ms).
* **Sync Strategy (Write-Behind):**
    * **Immediate:** Session results write to local `student_adaptive_profile`.
    * **Background:** A "Sync Worker" uploads the delta to Firestore every 5 minutes or on session completion.
    * **Conflict Resolution:** "Server Wins" policy for mastery scores; "Append Only" for question history.

## 8. Phase 4: Student UI Experience (Detailed Specification)

### 8.1 Overview
The Student UI uses a **"Syllabus Tree"** metaphor. This unifies the navigation for both Math (Atom-Level) and Science (Chapter-Level) into a consistent, collapsible hierarchy. This allows students to drill down from broad Chapters to specific Atoms, viewing "Two-Bar" metrics at every level.

### 8.2 Navigation View: The Syllabus Tree
This is applicable only to the subjects which are setup to use ADAPTIVE ENGINE and not the subjects like Multiplication Tables or Vocabulary which have their own and separate structure and UI related to them would be documented separately.
**Visual Component:** `<SyllabusTree />`
**Data Source:** `subject.chapters` (and nested `atoms` for Math).
**Layout:** Vertical Accordion List.

#### A. Level 1: The Chapter Row (Parent)
* **Visual Elements:**
    * **Expand/Collapse Toggle:** Chevron icon (v / >).
    * **Title:** Chapter Name (e.g., "Fractions").
    * **The Dashboard (Right Side):**
        * **Proficiency:** Percentage text + Color-coded Badge (Red/Yellow/Green).
        * **Coverage:** Horizontal Progress Bar (Length = % seen).
        * **Status Indicator:**
            * 🔒 **Locked:** Grayed out (Prerequisite Chapter incomplete).
            * ▶️ **Active:** Bright/Normal.
            * 🏆 **Mastered:** Gold Border/Glow.
* **Interaction (Ad-Hoc Practice):**
    * **Primary Tap:** Expands the row to show Atoms.
    * **"Play" Button:** A dedicated button on the row: `Practice`.
        * *Logic:* Generates a mixed session using questions from *all* unlocked Atoms within this Chapter.

#### B. Level 2: The Atom Row (Child)
* **Visibility:** Only visible when Chapter is expanded.
* **Indentation:** Visually indented to show hierarchy.
* **Visual Elements:**
    * **Title:** Atom Name (e.g., "Adding Unlike Denominators").
    * **Metrics:** Mini-version of the Chapter metrics (Proficiency % & Coverage %).
    * **State Icons:**
        * ⚪ **Locked:** Padlock icon (If previous Atom < 80% Proficiency).
        * 🔵 **Ready:** Empty Circle (Not started).
        * 🟡 **In Progress:** Half-filled Circle.
        * ✅ **Mastered:** Green Checkmark (Proficiency > 85%).
* **Interaction (Ad-Hoc Practice):**
    * **"Play" Button:** A dedicated button next to the Atom: `Practice`.
        * *Logic:* Generates a focused session using questions *only* from this specific `atom_id`.

---

### 8.3 Session Components (In-Game UI)
There should be an option to select multiple chapters and play at the subject level.

When a student clicks on a Practice button of a subject or chapter or atom, the existing question rendering component is used to render the session and filtered questions and topics available should be related to the chapter(s) or atom selected/clicked. 
---

### 8.4 Technical Requirements (Front-End)

* **State Management:**
    * The Tree must persist "Expanded/Collapsed" states in local component state (or Redux) so it doesn't collapse when returning from a session.
* **Performance:**
    * The list must use **Virtualization** (e.g., `react-window`) if a Subject has > 50 Atoms, to ensure smooth scrolling on mobile devices.
* **Libraries:**
    * **Math Rendering:** `react-katex`.
    * **Animations:** `Framer Motion` (for Shield fill and Accordion expansion).
    * **Icons:** `Lucide React` or `FontAwesome`.

### Phase 5: Admin & Content Operations
**Goal:** The tools to feed the engine.
* **Gap Analysis Dashboard:**
    * Build the Heatmap Component (Rows: Chapters, Cols: Difficulty).
    * *Logic:* Query Firestore metadata to count questions and color-code cells.
    * Ensure this is added to the Admin Sidebar and route is  `/admin/curriculum-gap-analysis`.
* **Prompt Builder Module:**
    * Implement the "Batch Generator" UI (loops of 20 questions).
    * Integrate the "Copy to Clipboard" workflow with the strict JSON schemas.
    * Ensure this is added to the Admin Sidebar and route is  `/admin/prompt-builder`.

* **Bulk Question Upload:** - This is already implemented in the admin panel.
    * The admin panel already implements client-side JSON parsing and validation before allowing the "Upload to DB" button to become active. And it is called as `Creator Studio` as part of the current implementation and added to the sidebar in the admin page at `/admin/question-bundles`.


## 9. Admin Curriculum & Integrity Management

### 9.1 Overview
Since the application supports multiple grades (3–10) and subjects, the Admin (Parent) needs a robust way to define the "Skeleton" of a subject (the Curriculum) separately from the "Body" (the Questions). This is managed via a JSON file upload to minimize manual entry errors.

### 9.2 The Curriculum JSON Schema
The Admin must upload a `.json` file that defines the structure. This file is the "source of truth" for navigation.

**Filename Convention:** `curriculum_{subject}_{grade}.json` (e.g., `curriculum_science_07.json`)

**Required JSON Structure:**
```json
{
  "meta": {
    "subjectId": "science", 
    "grade": 7,
    "version": "2026-v1", 
    "engineType": "ADAPTIVE_POOL", // or "ARITHMETIC_ENGINE"
    "trackingGranularity": "CHAPTER_LEVEL" // or "ATOM_LEVEL"
  },
  "chapters": [
    {
      "id": "sci07_ch01", // CRITICAL: This ID links to question banks.
      "title": "Force and Motion",
      "order": 1,
      "isLockedByDefault": false,
      "difficultyDistribution": { "easy": 15, "medium": 20, "hard": 10 },
      // Optional: Used only if trackingGranularity == ATOM_LEVEL
      "atoms": [
        { "id": "sci07_ch01_atom01", "title": "Friction Types", "order": 1 }
      ]
    },
    {
      "id": "sci07_ch02",
      "title": "Light and Shadows",
      "order": 2,
      "isLockedByDefault": true,
      "prerequisiteChapterId": "sci07_ch01"
    }
  ]
}
```

### 9.3 The Validation Gatekeeper (Logic)
Before saving the JSON to Firestore (`curriculum/{subject}_{grade}`), the system performs a "Dry Run" comparison against the existing database to prevent data corruption.

**Validation Rules:**

1.  **Syntax & Schema Check:**
    * Ensure file is valid JSON.
    * Ensure `meta.subjectId` matches the selected target in the dropdown.
    * **Constraint:** Duplicate Chapter IDs within the file are forbidden.

2.  **The "Immutable ID" Check (Critical Integrity):**
    * *Logic:* Fetch the *existing* curriculum document from Firestore.
    * *Comparison:* Compare the list of `chapter.id` in the DB vs. the Upload File.
    * **Scenario A (Safe Update):** Admin changes "Force & Motion" to "Newtonian Physics" (Title change).
        * *Result:* Allowed. Questions remain linked via ID `sci07_ch01`.
    * **Scenario B (Dangerous Deletion):** Admin removes `sci07_ch01` from the JSON.
        * *Result:* **BLOCKING ERROR.** "You are attempting to remove Chapter `sci07_ch01`, but there are questions linked to it. You must migrate these questions first."

3.  **Duplicate Curriculum Check:**
    * If a curriculum for `science_07` already exists, prompt for **Explicit Confirmation**: "Version 2026-v1 exists. Overwrite with 2026-v2? (This updates titles/ordering only)."

### 9.4 Question Refactoring Utility (The "Fix-It" Tool)
Since the Admin is a parent managing a small user base, they need a tool to fix mistakes (e.g., assigned a question to the wrong chapter) without writing scripts.

**Feature: The Bulk Metadata Editor**
* **Location:** Admin Panel > Database Utilities.
* **Use Case:** Moving questions from "Chapter 1" to "Chapter 2" because the curriculum structure changed.

**UI Workflow:**
1.  **Filter:** Admin selects a source criteria.
    * *Query:* `Subject: Science`, `Grade: 7`, `Chapter: sci07_ch01`.
    * *Result:* Displays list of 45 questions.
2.  **Select:** Admin checks "Select All" or picks specific questions.
3.  **Action:** "Move to Chapter..."
4.  **Target:** Selects `sci07_ch02` from a dropdown (populated by the loaded Curriculum).
5.  **Commit:** System performs a Batch Write:
    * Updates `chapter_id` on all selected questions.
    * Auto-updates `atom_id` to `null` (forcing re-tagging) if moving between Math chapters.

### 9.5 Implementation Notes
* **Firestore Structure:** Store the curriculum as a **Single Document** (`/curriculum/science_07`) to ensure fetching the syllabus costs only **1 Read**.
* **Safety:** The "Upload" button is disabled until the Validation Gatekeeper returns "Pass".
```