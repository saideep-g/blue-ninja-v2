// @ts-nocheck
import React, { useRef, useEffect } from 'react';
import { TemplateRouter } from '../templates/TemplateRouter';
import { motion } from 'framer-motion';

/**
 * MissionCard (Unified Template Wrapper)
 * 
 * Delegates rendering to the TemplateRouter to support both V2 and V3 questions.
 * This replaces the legacy hardcoded rendering logic.
 */
function MissionCard({ question, onAnswer, onStartRecovery }) {
    const startTimeRef = useRef(Date.now());

    // Reset timer when question changes
    useEffect(() => {
        startTimeRef.current = Date.now();
    }, [question?.id || question?.item_id]);

    const handleTemplateSubmit = (result: any) => {
        const timeSpentMs = Date.now() - startTimeRef.current;
        const timeSpentSeconds = Math.round(timeSpentMs / 1000);

        // Normalize result from different templates
        // V2 usually returns: { isCorrect, selectedIndex, feedback }
        // V3 Adapter returns: { isCorrect, explanation, tier1Correct }
        const isCorrect = result.isCorrect === true;

        const choice = result.selectedIndex ?? result.choice ?? null;

        // For V3/TwoTier, recovery is internal (scaffolding).
        // We pass isRecovered=false to the parent as the "recovered" concept 
        // in useDiagnostic (velocity) might not map 1:1 to the new template's internal remediation.
        // If needed, we can expand result to include recovery status.

        onAnswer(
            isCorrect,
            choice,
            false, // isRecovered default
            null, // tag default
            timeSpentSeconds
        );
    };

    if (!question) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-6xl mx-auto p-4"
        >
            <TemplateRouter
                question={question}
                onSubmit={handleTemplateSubmit}
                isSubmitting={false}
            />
        </motion.div>
    );
}

export default MissionCard;
