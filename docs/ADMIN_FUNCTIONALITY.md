# PRD: Admin Control Center (Master Requirements)

## 1. Executive Summary
The Admin Domain (referred to as the **Ninja Council**) is the command center for content creators and parents. Its primary goal is to manage the three learning engines, track operational costs (AI tokens), and ensure data integrity across the curriculum for Grades 3–10.

---

## 2. Content Management: The "Creator Studio"
**Route:** `/admin/question-bundles`

The Creator Studio is the primary interface for bulk data entry and quality control.

### 2.1 Question Bundles & Uploads
*   **Logical Partitioning:** Questions are uploaded in "Bundles" (JSON files) categorized by Grade and Subject.
*   **Composite Validation:** The studio must validate every question in a bundle against its `template_id` schema (MCQ, Short Answer, Tap-to-Fill, Numeric Auto).
*   **Validation Rules:**
    *   **Duplicate Detection:** Client-side hashing of `question_text` + `options` to prevent re-uploading existing content.
    *   **Option Integrity:** For MCQ, the system must verify the `answer` string matches one of the `options` exactly.
    *   **Feedback Loops:** Ensure `TAP_TO_FILL` blanks have correct matching IDs in the `sentence_template`.
*   **Creator Workflow:** Admins can preview questions in a "Dry Run" mode before committing to the Firestore `question_pool`.

---

## 3. Curriculum & Integrity Management
**Route:** `/admin/curriculum` (Ref: [ADAPTIVE_ENGINE_SPECIFICATION.md](ADAPTIVE_ENGINE_SPECIFICATION.md#9-admin-curriculum--integrity-management))

### 3.1 Skeleton vs. Body
*   **Curriculum (Skeleton):** Defines the chapters, atoms, prerequisites, and ordering.
*   **Questions (Body):** Linked to the skeleton via `chapter_id`.

### 3.2 The Validation Gatekeeper
*   **Immutable ID Protection:** The system **blocks** the deletion of any chapter or atom that has active questions linked to it.
*   **Migration Requirement:** Admins must use the "Bulk Metadata Editor" to move questions to a new ID before the old ID can be retired.
*   **Version Control:** Explicit confirmation required when overwriting an existing curriculum version (e.g., `2026-v1` to `2026-v2`).

---

## 4. AI Operations & Monitoring
**Route:** `/admin/ai-monitoring` (Ref: [SHORT_ANSWER.md](SHORT_ANSWER.md))

### 4.1 Cost & Latency Dashboard
*   **Quarterly Bucketing:** Usage logs are stored at `admin/system/ai_monitoring/{YYYY-QUARTER}`.
*   **Token Visibility:** Detailed tracking of Input, Output, and "Thought" (Reasoning) tokens to monitor Gemini 2.x costs.
*   **Latency Analysis:** 
    *   **Gemini Latency:** Model processing time.
    *   **Overall Latency:** Total end-to-end time experienced by students.

### 4.2 Prompt Builder Engine (Batching Workflow)
**Route:** `/admin/prompt-builder`
*   **High-Quality Batching:** To prevent LLM "drift" or quality degradation, the tool automatically segments large requests into **Batches of 20** questions.
*   **Prompt Staging:** Generates unique system prompts for each batch (e.g., "Batch 1: Focus on core theory", "Batch 2: Focus on scenario-based application").
*   **Schema Enforcement:** Every prompt includes the strict JSON schema required for the target `template_id`.

---

## 5. Analytics & Gap Analysis
**Route:** `/admin/curriculum-gap-analysis`

### 5.1 Mastery Heatmap & Recommendations
*   **Gap Detection:** A visual matrix (Rows: Chapters, Cols: Difficulty Levels).
*   **Color Scale:** Red (<5 Qs), Yellow (5–10 Qs), Green (>10 Qs).
*   **Logic-Based Recommendations:**
    *   *Scenario A:* If Chapter 1 has 20 Easy but 0 Hard questions → **Action:** "Generate 20 Hard Questions."
    *   *Scenario B:* If Chapter 2 has 0 questions → **Action:** "Generate Balanced Batch (7 Easy, 8 Med, 5 Hard)."

---

## 6. User & Student Management
**Route:** `/admin/users` (Ref: [USER_MANAGEMENT.md](USER_MANAGEMENT.md))

### 6.1 Profile Administration
*   **Role Escalation:** Promotion/Demotion of users between `STUDENT` and `ADMIN`.
*   **Progress Overrides:** Ability to manually adjust a student's "Proficiency Score" or "Coverage" if they are mistakenly placed in the wrong adaptive state (Discovery/Practice/Challenge).

### 6.2 Practice Log Explorer
*   **Audit Trail:** Downloadable raw student logs filtered by Subject, Chapter, or Date.
*   **Subject Filtering:** Identify "Struggle Clusters" where multiple students are failing the same `chapter_id`.

---

## 7. Database Utilities (The "Fix-It" Toolset)
**Route:** `/admin/database-utilities`

### 7.1 Bulk Metadata Editor
*   **Metadata Refactoring:** Move groups of questions between chapters by updating their `chapter_id` in bulk.
*   **Orphan Cleanup:** Utility to find and delete questions whose `chapter_id` no longer exists in the current curriculum.
*   **Calibration:** Massupdate difficulty levels (e.g., re-categorizing all "Too Hard" questions into the "Expert" tier to hide them from the standard adaptive rotation).
