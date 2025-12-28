# AI Reading Guide v3: How to Read the Curriculum + Question JSON (AI-Friendly)

This ecosystem is intentionally **layered**. Do not copy rules from one layer into another.  
**Question items contain only unique problem facts**, while **templates + curriculum + assessment** supply shared logic at runtime.

## Files and what each one does (read order)

### 1) Doc0 Manifest
**File:** `cbse7_manifest_v3.json`  
**Purpose:** Version lock + pointers to the correct v3 documents. Load this first.
- Look at `documents.core_curriculum`, `documents.template_library`, `documents.assessment_guide`.

### 2) Doc1 Core Curriculum
**File:** `cbse7_core_curriculum_v3.json`  
**Purpose:** The learning map (modules → atoms) and the universal misconception library.
Key sections:
- `modules[]` → each has `atoms[]` with:
  - outcomes grouped by **type**: `conceptual | procedural | logical | transfer`
  - `prerequisites[]`
  - `recommended_template_ids[]` (template IDs only)
  - `mastery_profile_id` (a pointer, not the rules themselves)
- `misconception_library{}` → stable misconception IDs + universal descriptions/hints/symptoms.
- `template_allowlist[]` → the canonical set of template IDs that curriculum may reference.
- `atom_index{}` → fast lookup by `atom_id` for dashboards and runtime engines.

### 3) Doc2 Template Library (UI + grading contract)
**File:** `template_library_v3.json`  
**Purpose:** Template behavior defaults + data contract + telemetry contract.
Key fields inside `templates[]`:
- `template_id` (must match the question item's `template_id`)
- `ui_defaults` (what the UI should do by default; do NOT repeat in every question)
- `grading_defaults` (default grading model; question may provide minimal overrides)
- `data_contract` (what `interaction.config` / `data` must contain)
- `telemetry_contract` (events to emit; do NOT tag telemetry manually in questions)

### 4) Doc3 Assessment + Engine Guide
**File:** `cbse7_assessment_guide_v3.json`  
**Purpose:** Mastery rules, sequencing rules, spaced review, analytics spec, and the validation pipeline.
Key sections:
- `mastery_profiles{}` (the “standard”: what mastery means, thresholds, attempts, required evidence)
- `sequencing_engine` and `spaced_review_scheduler`
- `analytics_spec` (events + derived metrics)
- `generation_prompts` (prompt recipes per atom)
- `json_schemas.question_item_base_schema` + `json_schemas.validation_pipeline_notes`

### 5) Question Schema (for authoring + validation)
**File:** `cbse7_question_schema_v3.json`  
**Purpose:** The base structure of question items and how multi-stage items branch.
This schema is validated in a **composable pipeline**:
1) Base item shape (Doc3)  
2) Template-specific payload rules (Doc2)  
3) Curriculum constraints (Doc1: allowed templates, prerequisite logic, misconception IDs)

---

## How the “Logic Bridge” works (critical for analytics)

When grading/analytics runs, the engine should:
1) Read `item.atom_id` in the question item.
2) Look up that atom in **Doc1** → get `mastery_profile_id`, prerequisites, and misconception library.
3) Use `mastery_profile_id` to pull mastery rules from **Doc3** (`mastery_profiles[...]`).
4) Use `item.template_id` to pull UI + grading defaults from **Doc2** (`templates[...]`).

This lets you change mastery rules centrally (Doc3) without editing every atom or question.

---

## Question item structure (v3) in plain language

A **single-stage** item (most templates) uses:
- `item_id`, `atom_id`, `template_id`, `difficulty`
- `prompt`, `instruction` (optional)
- `interaction.type` + `interaction.config`  ← template-specific
- `answer_key`                               ← template-specific
- `evidence[]` (what this question measures: conceptual/procedural/logical/transfer)
- optional `diagnostics.error_model[]` for open-response templates
- optional `transfer` mini-item

A **multi-stage** item (Two-Tier, Multi-Step, Branching) uses:
- the same top-level identity fields, but
- `stages[]` instead of a single `interaction/answer_key`
- each stage has its own `prompt`, `interaction`, `answer_key`, `evidence`
- `unlock_logic` controls when later stages appear (e.g., Tier 2 only after Tier 1 correct)

---

## Template-specific notes (what changes by template)

The **top-level envelope stays the same**.  
What changes is mainly `interaction.config`, `answer_key`, and where diagnostics live.

### A) Option-based templates (MCQ, Venn choice, etc.)
**Examples:** `MCQ_CONCEPT`, `MCQ_PROCEDURAL`, (Tier 1 of) `TWO_TIER`  
- Put choices in `interaction.config.options[]`.
- Put diagnostics **inline** inside each option (next to the distractor it explains).
- Do NOT use `diagnostics.error_model` for MCQ; the option diagnostics are the error model.

Where to learn the exact option shape:
- **Doc2 Template Library** → `templates[].data_contract` for that `template_id`

### B) Open-response numeric/expression templates
**Examples:** `NUMERIC_INPUT`, `EXPRESSION_INPUT`, `NUMBER_LINE_PLACE`  
- `interaction.config` defines the input mode (number, fraction, expression, drag marker).
- `answer_key` defines the target value/equivalence.
- Diagnostics should be in `diagnostics.error_model[]` (e.g., common wrong answers, range-based errors, regex patterns).

Where to define the misconception-to-recovery ladder:
- **Doc1** misconception IDs
- **Doc3** scaffolding strategy rules (engine chooses strategy based on misconception)

### C) Step-based / process templates
**Examples:** `BALANCE_OPS`, `WORKED_EXAMPLE_COMPLETE`, `ERROR_ANALYSIS`, `STEP_ORDER`  
- `interaction.config` describes the step structure (operations, blanks, student work lines, step tiles).
- `answer_key` includes required steps/blanks/corrections.
- You may include stage-level evidence (e.g., stage 1 = procedural, stage 2 = transfer).

### D) Sorting/Matching templates
**Examples:** `CLASSIFY_SORT`, `MATCHING`  
- `interaction.config` contains bins/pairs/items.
- `answer_key` contains the mapping.
- Partial credit is typically computed by the template grader (Doc2 grading defaults).

---

## What NOT to put in question items (avoid duplication)

Do NOT include:
- template UI defaults (scratchpad flags, per-template hint styles) → **Doc2 `ui_defaults`**
- template telemetry tags → **Doc2 `telemetry_contract` + derived runtime**
- mastery thresholds (attempt counts, accuracy requirements) → **Doc3 mastery_profiles**
- full misconception descriptions → **Doc1 misconception_library**

Put only:
- IDs (`atom_id`, `misconception_id` references)
- the unique prompt + numbers + diagram spec
- the unique correct answer / mapping for THIS problem

---

## Minimal “AI instruction” for generating a question item

1) Choose `atom_id` from **Doc1** and confirm prerequisites are met.
2) Pick an allowed `template_id` from that atom’s `recommended_template_ids`.
3) Read the template’s `data_contract` in **Doc2** and produce `interaction.config` accordingly.
4) Include `evidence[]` specifying what outcome type you are measuring.
5) For MCQ: add inline diagnostics per distractor (misconception_id references only).
6) For open-response: add `diagnostics.error_model[]` mapping likely wrong answers to misconception_id.
7) Do NOT add manual telemetry; analytics derives it from atom/template via Doc1/Doc2/Doc3.
