# Functional Specification Document (FSD): Tap-to-Fill Cloze (Hybrid Mode)

**Version:** 1.0
**Feature:**  Tap-to-Fill - New Question Type
**Target Platform:** Tablet & Mobile (Touch-first)
**Core Philosophy:** "Draft first, Grade later."

---

## 1. Overview
This feature allows students to complete sentences containing multiple blanks. It uses a **Hybrid Interaction Model** where students can "draft" answers, auto-advance through blanks, and review/swap their choices before committing to a final submission.

**Key Objective:** Encourage context-based learning by allowing self-correction before grading.

---

## 2. User Interface (UI) Requirements

### A. The Sentence Container
* **Typography:** Large, highly legible font suitable for students.
* **Blank Visual States:**
    1.  **Active (Empty):** Focused state with a pulsing border or highlighted background. Indicates "Waiting for input."
    2.  **Inactive (Empty):** Dimmed underscore or subtle box.
    3.  **Draft (Filled):** Text appears in **Blue** (or primary brand color). This indicates a temporary, unvalidated state.
    4.  **Validated (Post-Submit):**
        * **Correct:** Turns **Green**.
        * **Incorrect:** Turns **Red**.

### B. The Dynamic Option Tray (Bottom Sheet)
* **Context-Sensitive:** The tray displays *only* the options relevant to the currently valid blank.
* **Transitions:** Smooth horizontal slide or fade animation when the active blank changes (e.g., switching from Blank 1 options to Blank 2 options).
* **Layout:** Horizontal scroll or flex-wrapped chips with large touch targets.

### C. The Action Area (Submit)
* **"Check Answer" Button:**
    * **State - Disabled:** Greyed out/unclickable while any blank remains empty.
    * **State - Active:** Bright/Clickable once all blanks are filled.
    * **Position:** Floating bottom-right (mobile) or fixed below the sentence container (tablet/desktop).

---

## 3. Functional Logic & Interaction Flow

### Phase 1: The Drafting Loop (Blue State)
1.  **Initialization:**
    * The app loads the question.
    * **Blank 1** is automatically focused (pulsing).
    * **Tray** displays options specifically for Blank 1.
2.  **Selection:**
    * User taps an option (e.g., "Stingy").
    * **Visual:** The option text fills Blank 1. The color is **Blue** (Draft).
3.  **Auto-Advance:**
    * Immediately upon selection, the focus logic switches to **Blank 2**.
    * **Tray Animation:** Blank 1 options slide out; Blank 2 options slide in.
    * *Note:* If the user fills the final blank, the tray may remain open or close, and the "Check Answer" button becomes enabled.

### Phase 2: The Review Loop (Self-Correction)
1.  **Context Check:**
    * The user reads the full sentence and realizes a chosen word doesn't fit the context.
2.  **Edit Action:**
    * User taps an already filled blank (e.g., Blank 1).
    * **Focus:** Blank 1 becomes active again.
    * **Tray:** The tray slides back to display Blank 1's options.
3.  **Swap Logic:**
    * User selects a different option (e.g., "Frugal").
    * **Visual:** The previous word ("Stingy") is instantly replaced by "Frugal". The text remains **Blue**.

### Phase 3: The Commitment (Submission)
1.  **Trigger:** User taps the "Check Answer" button.
2.  **Validation:** The system compares draft values against the correct answers.
3.  **Feedback Visuals:**
    * **Success:** Correct words turn **Green**. Play success sound.
    * **Error:** Incorrect words turn **Red**. Play error sound.
4.  **Nuance Feedback:**
    * If an answer is incorrect, a specific "Why?" toast or tooltip appears near the error.
    * *Example:* "'Cheap' implies low quality, but the sentence implies admiration."

---

## 4. Technical Architecture

### Data Structure (TypeScript Interface)
To support context-specific trays, the data structure must map specific options to specific blanks.

```typescript
interface ClozeQuestion {
  id: string;
  questionType: 'tap-to-fill';
  
  // The sentence is split into segments to allow blanks to be inserted between them.
  // Example: ["Some call him ", ", but I admire him for being ", "."]
  segments: string[]; 
  
  // Configuration for each blank in the sentence
  blanks: {
    id: string;
    positionIndex: number; // Insert after segment[0]
    correctAnswer: string; // e.g., "Stingy"
    
    // The specific pool of options for THIS blank
    options: string[]; // ["Stingy", "Generous", "Rich"]
    
    // Optional: Specific feedback for wrong answers
    feedback?: { 
      [wrongOption: string]: string // "Rich doesn't fit the context..."
    };
  }[];
}
```

### State Management Requirements
* `activeBlankIndex`: `number` - Tracks which blank is currently focused/driving the tray.
* `userAnswers`: `Record<string, string>` - Stores the draft answers (Key: Blank ID, Value: Selected Option).
* `submissionStatus`: `'idle' | 'submitted'` - Controls the read-only state and validation coloring.

---

## 5. Edge Cases
* **Skipping Blanks:** If a user manually taps Blank 2 before filling Blank 1, the system must allow it and update the tray immediately.
* **Partial Submission:** If the user attempts to submit with an empty blank, the button should remain disabled (or shake to indicate incompleteness).
* **Long Words:** Ensure the blank container expands dynamically to fit long words without breaking the sentence layout on small screens.

Question format which should be considered by the UI in JSON format:

```json
{
    "metadata": {
        "grade": "7",
        "subject": "English",
        "template_id": "MCQ_SIMPLIFIED",
        "created_at": "2026-02-04",
        "total_questions": 40,
        "difficulty_distribution": {
            "medium": "10%",
            "hard": "90%"
        }
    },
    "questions":
[
  {
    "id": "eng_lvl3_045",
    "template_id": "TAP_TO_FILL",
    "chapter_id": "s10",
    "difficulty": "medium",
    "tags": ["vocabulary", "adjectives", "money"],
    
    "visualType": null,
    "visualData": null,
    "imageUrl": null,

    "sentence_template": "My uncle refuses to spend extra money. Some people insult him by calling him {{1}}, but I admire him for being {{2}}.",
    
    "blanks": [
      {
        "id": 1,
        "hint": "Negative word", 
        "correct_value": "Stingy",
        "options": [
          { 
            "value": "Stingy", 
            "feedback": "Correct! 'Stingy' is an insult, which fits the context." 
          },
          { 
            "value": "Frugal", 
            "feedback": "Incorrect. 'Frugal' is a compliment (smart saving). The sentence says people are 'insulting' him." 
          },
          { 
            "value": "Poor", 
            "feedback": "Incorrect. Being 'poor' is a circumstance, not a choice. He 'refuses' to spend." 
          }
        ]
      },
      {
        "id": 2,
        "hint": "Positive word",
        "correct_value": "Frugal",
        "options": [
          { 
            "value": "Frugal", 
            "feedback": "Correct! 'Frugal' implies wise money management, which fits 'admire'." 
          },
          { 
            "value": "Cheap", 
            "feedback": "Incorrect. You usually don't 'admire' someone for being cheap." 
          },
          { 
            "value": "Generous", 
            "feedback": "Incorrect. 'Generous' means giving money away, but the sentence says he 'refuses to spend'." 
          }
        ]
      }
    ],
    "summary_note": "Remember: 'Stingy' and 'Cheap' are negative. 'Frugal' and 'Thrifty' are positive."
  }
]
}
```

science subject example:


```json
{
    "metadata": {
        "grade": "7",
        "subject": "Science",
        "template_id": "MCQ_SIMPLIFIED",
        "created_at": "2026-02-04",
        "total_questions": 40,
        "difficulty_distribution": {
            "medium": "10%",
            "hard": "90%"
        }
    },
    "questions": [
  {
    "id": "sci_elec_012",
    "template_id": "TAP_TO_FILL",
    "chapter_id": "s10",
    "difficulty": "hard",
    "tags": ["science", "physics", "circuits"],

    "visualType": "svg",
    "visualData": "<svg width='100' height='60' viewBox='0 0 100 60' xmlns='http://www.w3.org/2000/svg'><line x1='10' y1='30' x2='40' y2='30' stroke='black' stroke-width='2'/><line x1='40' y1='10' x2='40' y2='50' stroke='black' stroke-width='2' /><rect x='50' y='20' width='6' height='20' fill='black' /><line x1='56' y1='30' x2='90' y2='30' stroke='black' stroke-width='2'/></svg>",
    "imageUrl": null,
    
    "sentence_template": "In the battery symbol above, the longer vertical line represents the {{1}} terminal, while the shorter, thicker block represents the {{2}} terminal.",
    
    "blanks": [
      {
        "id": 1,
        "hint": "Select Polarity",
        "correct_value": "Positive",
        "options": [
          { "value": "Positive", "feedback": "Correct. The long thin line is always positive (+)." },
          { "value": "Negative", "feedback": "Incorrect. The negative terminal is the short, thick line." },
          { "value": "Neutral", "feedback": "Incorrect. Batteries have positive and negative poles, not neutral." }
        ]
      },
      {
        "id": 2,
        "hint": "Select Polarity",
        "correct_value": "Negative",
        "options": [
          { "value": "Negative", "feedback": "Correct. Short and thick = Negative (-)." },
          { "value": "Positive", "feedback": "Incorrect. The positive terminal is the long, thin line." },
          { "value": "Ground", "feedback": "Incorrect. The Ground symbol is different." }
        ]
      }
    ]
  }
    ]
}
  ```

  if `template_id` is not provided at the quesiton level it should be taken based on the `template_id`` in the metadata. In otherwords, question level template_id superceeds the metadata template_id


  ### Practice Logs capture:
  -> the logs need to be captured differently for tap to fill questions as these dont have the corectAnswer field in the question JSON.
  -> similarly, there could be multiple blanks in each question and we need to track for each blank if the user got it right or not.