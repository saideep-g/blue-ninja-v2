# Question Lifecycle Management System (QLMS) Design

## 1. Core Philosophy
Instead of hardcoding question templates, we treat every Question Type as a "Plugin" with its own lifecycle. Each version of a question type is immutable once deployed. Evolution happens by creating a NEW version and migrating data.

## 2. KEY ARCHITECTURE
*   **The Registry** (`src/features/questions/registry.ts`): The heart of the system. Maps `id:version` to a Manifest.
*   **The Manifest** (`domain.ts`): Defines strict contracts (Zod Schema), Analytics Logic (Platinum Standard), and AI Context.
*   **The Renderer** (`QuestionRenderer.tsx`): A smart React component that acts as a "browser" for question plugins.
*   **The FSM Engine** (`mcq-branching`): A finite state machine implementation for multi-step adaptive questions.

## 3. IMPLEMENTED FEATURES
*   [x] **Phase 1: Structure**: Registry, Domain Types, V1 MCQ Plugin.
*   [x] **Phase 2: The Renderer**: `QuestionRenderer` + `useInteractionLogger` (Black box recording).
*   [x] **Phase 3: Branching**: `mcq-branching` plugin with conditional logic, loops, and remediation paths.
*   [x] **Phase 4: Admin Migration**: 
    *   `src/features/questions/admin/MigrationDashboard.tsx`: UI to scan and dry-run migrations.
    *   `transformers.ts`: Logic to auto-convert Legacy JSON -> Strict V1 Zod Schema.
    *   Route: `/admin/migration` is now live.

## 4. How to Add a New Question Type
1.  Create `src/features/questions/types/my-new-type/v1`.
2.  Define `schema.ts` (Zod).
3.  Build `Component.tsx` (React).
4.  Write `manifest.ts` (connects Schema + Component + Analytics).
5.  Register in `src/features/questions/index.ts`.

## 5. Deployment
The system is integrated into `main.tsx` (registry init) and `AdminRoutes.tsx` (migration dashboard).
