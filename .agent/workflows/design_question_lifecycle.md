# Question Lifecycle Management System (QLMS) Design

## 1. Core Philosophy
Instead of hardcoding question templates, we treat every Question Type as a "Plugin" with its own lifecycle. Evolution happens by creating a NEW version and migrating data.

## 2. The Question Manifest (`manifest.ts`)
Every question type/version will have a `manifest.ts`. This acts as the source of truth for the UI, the AI, and the Database.

**Directory Structure:**
```
src/
  features/
    questions/
      registry.ts           <-- The central lookup
      domain.ts             <-- Core Types (Manifest, Analytics)
      types/
        multiple-choice/
          v1/
            schema.ts       <-- Zod schema for V1 data
            Component.tsx   <-- React component for V1
            manifest.ts     <-- Config glue & Analytics Logic
```

## 3. Platinum Analytics Standard (Defined in `domain.ts`)
We have defined a rigorous analytics standard to capture student behavior beyond simple correctness.

**Key Metrics Captured:**
*   **Behavioral**: `speedRating` (Rushed vs Steady), `distractionScore` (Blur events), `focusConsistency`.
*   **Cognitive**: `cognitiveLoad` (Answer changing patterns), `confidenceGap`.
*   **Long-term**: `isRecovered` (Did they bounce back from previous failure?), `spaceRepetitionDue`.
*   **Actionable**: `suggestedIntervention` (Hint vs Scaffold vs Intervene).

## 4. Implementation Status
*   [x] **Phase 1: Structure**:
    *   `src/features/questions/registry.ts`: Singleton Registry created.
    *   `src/features/questions/domain.ts`: PlatinumAnalytics & Manifest interfaces defined.
    *   `src/features/questions/types/multiple-choice/v1`: First plugin implemented.
    *   `src/main.tsx`: Registry initialized at startup.
*   [x] **Phase 2: The Renderer**: 
    *   `src/features/questions/components/QuestionRenderer.tsx`: Smart component that dynamically loads plugins and computes analytics.
    *   `src/features/questions/hooks/useInteractionLogger.ts`: Captures raw user behavior (focus, blur, clicks) for the analytics engine.
*   [ ] **Phase 3: Migration V2**: Design a "V2" MCQ with a new feature.
*   [ ] **Phase 4: Admin Tool**: Build the UI to execute the transformation dry-run.

## 5. Next Steps
Move to Phase 3: Design V2 Schema or Integrate Renderer into Main App.
