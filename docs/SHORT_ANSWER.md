# Business Requirement Document: AI-Powered Short Answer Evaluation

## 1. Project Overview
The objective is to enhance the existing quiz application by introducing a **Short Answer** question type. Unlike Multiple Choice Questions (MCQs), these questions require a natural language response which is evaluated by the **Gemini 1.5 Flash API**. The system will provide granular feedback based on a defined rubric, award partial points, and log all interactions for both pedagogical review and administrative monitoring.

---

## 2. Technical Architecture
The integration follows a secure, serverless pattern to protect API keys and ensure consistent evaluation logic.

* **Frontend:** React (Vite) with Tailwind CSS for a responsive, accessible UI (Dark Mode supported).
* **Backend:** Firebase Cloud Functions (Node.js) to handle Gemini API orchestration.
* **AI Engine:** Gemini 2.5 Flash (configured for JSON mode).
* **Database:** Firestore for question storage and optimized monthly session logging.
* **Security:** Firebase App Check to prevent unauthorized API consumption.

The system is designed to be "Fail-Safe." If the AI cannot provide a grade, the UI transitions to a manual mode.

* **API Failure/Timeout:** Log `isSuccess: false`, store the `errorMessage`, and trigger the **Self-Evaluation UI**.
* **Parsing Error:** If the AI response isn't valid JSON, log `isValid: false`, record the `parsingError`, and trigger the **Self-Evaluation UI**.

---

## 3. Data Schema Specifications

### 3.1 Question Definition (Input)
Questions are stored as JSON objects. This format allows the AI to understand the "Ideal" answer and the specific points it must look for.

```json
{
  "metadata": {
    "grade": "7",
    "subject": "Social",
    "template_id": "SHORT_ANSWER",
    "created_at": "2026-02-02"
  },
  "questions": [
    {
      "id": "soc_g13_sa_001",
      "question": "Describe how the climate of the Sahara Desert influences the lifestyle of the people living there.",
      "model_answer": "People wear heavy robes to protect against dust and heat, lead nomadic lives to find water, and settle near oases for agriculture.",
      "evaluation_criteria": [
        "Mention of clothing (protective/heavy robes)",
        "Mention of nomadic lifestyle or migration for water",
        "Mention of oases or settlement patterns"
      ],
      "max_points": 3,
      "explanation": "The extreme heat and scarcity of water force inhabitants to adapt through specific clothing and migratory patterns."
    }
  ]
}
```

### 3.2 Student Session Logs (Optimized Storage - Monthly)
To optimize Firestore performance (reducing document reads/writes), logs are grouped by month.
**Path:** `students/{studentId}/session_logs/{YYYY-MM}`

Each document contains an `entries` array where each element includes:
* **Context:** `questionId`, `questionText`, `subject`, `correctAnswer` (model_answer from the question),`questionType` ("SHORT_ANSWER"), `explanation` (explanation from the question)
* **Input:** `studentAnswer`, `timeSpent` (seconds), `timestamp`.
* **Result:** `aiFeedback` (Full JSON), `score`, `isCorrect` (True if $Score = MaxPoints$).
* **Status:** `isSuccess` (Boolean).
* **Self Evaluated:** `isSelfEvaluated` (Boolean).


### 3.3 Admin Monitoring Log (Global)

A collection for performance and cost tracking which is optimized for firestore reads grouped by quarter:
**Path:** `admin/system/ai_monitoring/{YYYY-QUARTER}` (e.g., `2026-JAN-MAR`)

Each document contains an `entries` array where each element includes:
`date`, `studentId`, `studentName`, `questionId`, `questionText`, `subject`, `questionType`, `inputText`, `outputText` (Full response with metadata), `responseTime` (E2E Latency), `inputTokensCount`, `outputTokensCount`, `thoughtsTokenCount`, `isSuccess`, `isValid`, `errorMessage`.

---

## 4. Backend Logic: `evaluateShortAnswer`
The Firebase Cloud Function acts as the bridge between the student and the AI.

### 4.1 Execution Flow
1.  **Validation:** Verify the user is authenticated and the request is signed by Firebase App Check.
2.  **Prompt Engineering:**
    * **System Prompt:** Set the persona as a "Precise Educational Grading Engine."
    * **Constraint:** Force JSON output with a strict schema (Score, Results, Feedback, Summary).
    * **Context:** Pass the `question`, `student_answer`, and `evaluation_criteria`.
3.  **Model Settings:**
    * **Model ID:** `gemini-2.5-flash`
    * **Temperature:** `0.3` (for natural but consistent tone).
    * **Response MIME:** `application/json`.
4.  **Logging & Deduplication:**
    *   **Deduplication:** The client service implements a request lock to prevent simultaneous duplicate calls for the same question/answer.
    *   **Logging:**
        *   **Success & Failure:** Logged exclusively on the client-side to capture true End-to-End (E2E) latency and network performance.
        *   **Server-Side:** Logging is completely disabled in the Cloud Function to prevent duplicates and ensure latency accuracy.

**AI Failure (Fallback):** * System displays a friendly message: *"We couldn't reach the AI grader right now. Please compare your answer with the model answer below."*
    * Display `model_answer` and `evaluation_criteria`.
    * **Self-Evaluation Input:** A numeric input field for the student to enter their marks along with an instruction to enter the marks based on the evaluation criteria.
    * If the student enters the full `max_points`, mark the entry as `isCorrect: true`; and update the same value as `score`
    * Mark the entry as `isSelfEvaluated: true`

---

## 5. UI/UX Requirements

### 5.0 Targeted Device Environments
*   **Student Experience:** All student-facing UIs (Question Page, Practice History, Feedback Detail) must be strictly optimized for **10-inch tablets**. This includes large touch targets (min 44x44px), readable font sizes (min 16px), and layout adjustments to ensure virtual keyboards do not overlap with the AI feedback or "Next" buttons.
*   **Admin Experience:** All admin-facing UIs (Monitoring Dashboard, Cost Tracking) are targeted for **15-inch laptops**. Priority should be given to information density, wide-format data tables, and multi-column filtering layouts.

### 5.1 Student Experience (Question Page)
*   **Input Interface:** 
    *   Use a responsive, auto-expanding `textarea` with a minimum height for accessibility.
    *   **Live Counter:** Display a character/word count in a subtle label at the bottom edge.
    *   **Voice Input (STT):** Implement a **Mic Button** using the Web Speech API. 
        *   **Action:** Clicking the mic toggles listening mode.
        *   **Feedback:** The mic icon should pulse (CSS animation) when active.
        *   **Behavior:** Appends recognized text to the current textarea value (do not overwrite) with appropriate spacing.
*   **Pre-submission Validation:** 
    *   **Minimum Length:** If the input length is < 5 characters, block the submission.
    *   **User Feedback:** Show a non-interruptive **Toast Notification** (e.g., "Your answer is too short. Please provide more detail.") that disappears after 3 seconds. 
    *   Ensure the Cloud Function is **not** called until validation passes to preserve tokens.
*   **State Management (Submission):** 
    *   Immediately disable the textarea and the "Submit" button to prevent duplicate requests.
    *   Display a centered **Loading Indicator** (e.g., spinning `RefreshCw` icon) with the text "Gemini is evaluating your response...".
*   **AI Feedback Section (Post-Evaluation):**
    *   **Rubric Checklist:** Transform the AI's JSON `checks` into a visual list. Use a Green Check (`CheckCircle`) for `true` matches and a Gray Ring (`Circle`) for `false`.
    *   **Detailed Feedback:** Display the AI's specific comments below each rubric item in a smaller, readable font.
    *   **Score Summary:** Show the final score prominently (e.g., "Score: 2/3") using a colored badge or progress bar.
    *   **Model Solution Reveal:** Reveal the "Model Answer" and "Teacher's Explanation" block below the feedback to allow students to compare their responses with the ground truth.
*   **Progression Lock:** Explicitly disable automatic "Next" progression. The "Next Question" button must be manually clicked after the student has reviewed and confirmed the feedback.

### 5.2 Admin Monitoring Dashboard
A dedicated dashboard in tabular format accessible via the sidebar for monitoring system health and costs, optimized for a **15-inch laptop display** (high information density).

**Table View Columns:**
1.  **Date/Time:** Timestamp of the request.
2.  **Student Name:** Linked to their profile.
3.  **questionId:** The question id.
4.  **questionText:** The question text.
5.  **subject:** The subject.
6.  **Input Text:** The raw student answer.
7.  **Output Text:** The raw AI JSON response (including usage metadata).
8.  **Latency:** Dual metrics:
    *   **Overall:** End-to-End latency (Client reported).
    *   **Gemini:** Processing latency (Server reported via metadata).
9.  **Tokens:** `inputTokensCount`, `outputTokensCount`, and `thoughtsTokenCount`.
10. **Status:** `isSuccess` (Boolean).
11. **Error Message:** `errorMessage` (String).
12. **Valid JSON:** `isValid` (Boolean).

**Additional Monitoring Features:**
* **Filtering:** Filter by quarter, status, or search term.
* **Totals Row:** Summation of all tokens and an estimated cost in **USD ($)** and **INR (₹)** based on Gemini 2.5 Flash pricing ($0.30 input / $2.50 output per 1M tokens).
* **Quality Flagging:** A toggle to mark a response as "Incorrect Evaluation" for future prompt tuning.


### 5.3 Practice History (Student View)
The history dashboard displays cards for past attempts, **optimized for 10-inch tablets**. Logs related to **SHORT_ANSWER** questionType should be integrated along with other questions with below points:
* **Card Preview:** Shows `subject`, `questionText`, `studentAnswer`, and `correctAnswer` (mapped from `model_answer`).
* **Status Icon:** Displays 'CORRECT' (Green Check) or 'INCORRECT' (Red Cross) based on the `isCorrect` flag.
* **"View Detailed Feedback" Flow:**
    * Clicking a dedicated "View Feedback" button opens a standalone **Feedback Page** mirroring the immediate post-submission experience of a student.
    * **AI Evaluation Mode:** Displays the granular rubric checklist, AI comments for each criterion, the total calculated score, and the question explanation.
    * **Manual/Fallback Mode:** For entries where AI evaluation was skipped or failed (e.g., self-evaluated), the page displays the student's assigned score, the `model_answer`, and the `explanation` for manual review.
    * **Navigation:** Includes a prominent "Close" (X) button to return the user seamlessly to the Practice History list.

---

## 6. Security & Performance
* **Rate Limiting:** Implement per-user limits in the Cloud Function to prevent token drainage.
* **Cost Controls:** Set a maximum `maxOutputTokens` to prevent the AI from generating excessively long responses.
* **Synonym Handling:** The system instruction must explicitly direct the AI to accept semantically similar answers (e.g., "thick robes" vs "heavy robes") to remain fair.

---

## 7. Summary of Logging Logic

| Scenario | isSuccess | isValid | Action |
| :--- | :--- | :--- | :--- |
| **Healthy API** | Yes | Yes | Display AI Feedback Checklist |
| **Invalid JSON** | Yes | No | Log error for admin dashboard + Trigger Self-Evaluation |
| **Timeout/500** | No | N/A | Log error for admin dashboard + Trigger Self-Evaluation |


## 8. Development Checklist
* [ ] Implement **Temperature 0.0** in Firebase Function for consistency.
* [ ] Add `isSelfEvaluated` flag to schema to distinguish between AI and Student grades in `session_logs`.
* [ ] Build React "Feedback Page" that can dynamically switch between AI-Feedback mode and Model-Answer-Only mode.
* [ ] Ensure Firestore `arrayUnion` is used for monthly logs to maintain performance.
* [ ] **ID Stability**: Ensure the upload utility doesn't change criteria IDs if a question is edited to maintain historical log integrity.


## 9. Admin Panel: Question Creation & Bundle Management

To support the `SHORT_ANSWER` type at scale, the Admin Panel's upload and creation flows must be enhanced with type-specific validation and dynamic UI components.

### 9.1 Support for New Question Types
*   **Dynamic Form Rendering**: The creator UI and upload validator must dynamically toggle between MCQ fields and Short Answer fields (`model_answer`, `evaluation_criteria`, `max_points`) based on the `template_id`.
*   **Bulk Upload Integration**: Extend existing JSON/CSV utilities to support AI-specific metadata for batch imports.

### 9.2 Type-Based Schema Validation
The validator enforces strict checks based on question type:
*   **SHORT_ANSWER Requirements**:
    *   `model_answer`: Required non-empty string.
    *   `evaluation_criteria`: Required array (1-5 distinct rubric points).
    *   `max_points`: Numerical range 1-5 (default 3).
*   **Cross-Type Consistency**: Automatically prune irrelevant fields (e.g., `options` for Short Answer) during upload to prevent stale data.

### 9.3 In-Bundle Preview & Interaction
Admins must be able to verify content within a bundle after upload:
*   **Integrated Preview**: Clicking a question opens a modal that renders using the actual `ShortAnswerTemplate` student view.
*   **Full Disclosure**: Display `question_text`, `model_answer`, and `explanation` clearly.
*   **Live Editing**: Allow inline edits for spelling or minor rubric adjustments with a "Save" action at the bottom.
*   **Keyboard Accessibility**:
    *   `Escape`: Immediately close modal.
    *   `Right Arrow`: Advance to the next question in the bundle.
    *   `Left Arrow`: Return to the previous question.
    *   `Ctrl+S`: Save changes (optional shortcut).
*   **Diff-View (Comparison Tool)**: In the preview, show the `model_answer` and the `student_test_answer` side-by-side. This makes it visually obvious why the AI might have met or missed a criterion.
*   **Criterion ID Visibility**: Ensure the `evaluation_criteria` strings are numbered (1, 2, 3...) in the UI, matching the IDs sent to Gemini. This makes the `{ "1": 1 }` result logic intuitive for the admin.

## 10. The "Dry Run" AI Validator

The Admin Panel includes a dedicated "Test with AI" flow to ensure rubric quality before student deployment.

*   **Prompt Testing**: Admins can submit sample "Good" and "Bad" answers directly within the preview modal.
*   **Rubric Verification**: Triggers a live call to the Gemini 3 Flash evaluation function to confirm the rubric correctly identifies passing/failing criteria.
*   **Context Injection / System Instruction Visibility**: In the preview modal, add a "View System Logic" toggle. This displays the full System Instruction being sent to Gemini, helping admins understand if a result was due to a vague rubric or specific AI "strictness" settings.
*   **Audit Trail:** All test attempts are logged to the `ai_monitoring` collection with the student name set to `Admin Preview` and `ADMIN_DRY_RUN` subject.
*   **State Management:** The "Dry Run" sidebar is disabled by default in Live Preview to reduce clutter, but can be toggled via the UI.

Pls ensure all the new features and paths related to them are correctly added to the admin sidebar so that it is accessible to the admin user.

========================================================================================================

# Functional Requirement Document: Interactive AI Feedback Reveal

## 1. Objective
To enhance student engagement during the 30–60 second AI processing window by replacing static loaders with a sequenced, interactive "Reveal" experience. This transforms wait time into a pedagogical moment where students see their work analyzed point-by-point.

---

## 2. Technical Architecture & State Flow
The UI will move through three distinct phases: **Submission**, **Processing (Simulation)**, and **The Big Reveal**.



### 2.1 The Submission Phase
* **Input Conversion:** Upon clicking "Submit," the active `textarea` immediately transitions to a read-only "Your Answer" container to provide a visual anchor for comparison.
* **Skeleton Framework:** The "Detailed Evaluation" section renders the titles of the `evaluation_criteria` fetched from the local question JSON metadata.

---

## 3. Sequenced Animation Logic (The "Reveal")
Once the Cloud Function returns the Gemini JSON, the UI will not display it all at once. Instead, it will iterate through the results to simulate a "live" tutor grading.

### 3.1 Step-by-Step Execution
1.  **Rubric Item Focus:** The first rubric item shows a spinning loader for a set duration (e.g., 800ms to 1.5s).
2.  **Icon Transformation:** The spinner "pops" into a **Green Tick (✓)** if the criterion is met or a **Red Cross (✗)** if not.
3.  **Feedback Stream:** The specific `feedback` string for that criterion fades in or uses a "typewriter" effect below the title.
4.  **Score Increment:** If the point is awarded, the **Score Display** (e.g., 0/4) increments in real-time with a "counter-up" animation.
5.  **Sequential Delay:** The system waits 1 second before starting the animation for the next rubric point. If an evaluation criteria is incorrect or not met, the next criteria feedback shouldnt shown until the previous criteria feedback is revelealed + a 500ms delay after the previous criteria feedback is revealed.

### 3.2 Visual Component Mapping
| Element | Initial State (Wait) | Transition State (Reveal) | Final State |
| :--- | :--- | :--- | :--- |
| **Criterion Icon** | Pulse/Grey Circle | Spinning Loader | Green Check / Red X |
| **Criterion Feedback** | Hidden | Fade-In / Typewriter | Static Text |
| **Overall Score** | 0 / Max | Animated Counter (+1) | Final Calculated Score |
| **Tutor's Summary** | Hidden | Fade-In (After all points) | Full Summary Text |

---

## 4. Error & Fallback Experience
If the API takes too long or fails, the animation sequence must gracefully degrade.

* **Timeout (45s+):** If the request exceeds the threshold, stop the "Spinning" icons and display the **Self-Evaluation UI**.
* **Validation Failure:** If the AI returns invalid JSON, the `isValid` flag is set to `No`. The system should then display the `model_answer` and ask the student to provide their own score out of `max_points`.
* **Empty Answer:** If the student's answer is below a minimum word count, the UI should prevent submission to save API tokens.

---

## 5. UI Layout Structure
Following the reveal, the page should be organized as follows to maximize comparison:

1.  **Question Header:** (Current implementation).
2.  **Your Answer Box:** A clear box showing exactly what the student submitted.
3.  **Detailed Rubric Check:** The animated checklist section.
4.  **Tutor's Summary:** The concluding thought from the AI.
5.  **Model Answer & Teacher's Explanation:** Revealed only *after* the animation sequence finishes to encourage independent review.
6.  **Navigation:** "Next Challenge" button becomes active.

---

## 6. Implementation Checklist
* [ ] **Local State Logic:** Create an `activeStep` state to control which rubric index is currently animating.
* [ ] **CSS Animations:** Define the "Pop" effect for icons and "Typewriter" for feedback strings.
* [ ] **Score Integration:** Use a library like `react-countup` to handle the score incrementation.
* [ ] **Skip Function:** Provide a small "Skip Animation" link for students who want to see their results immediately.


Consider below when  sending to gemini for the short answer feedback 
## 4. AI Persona & Prompt Engineering

### 4.1 The "Supportive Peer" Tone
The AI must move away from clinical, third-person language (e.g., "The student did...").

* **Second-Person Perspective:** The AI must address the student directly as "**You**".
* **Encouraging Personas:** Use warm, peer-like language such as "Great start!" or "You nailed this part!" while remaining firm on scientific accuracy.
* **The Feedback "Sandwich":** 1. Acknowledge what the student got right.
    2. Identify the specific gap using the rubric.
    3. Provide a helpful hint for the missing logic.