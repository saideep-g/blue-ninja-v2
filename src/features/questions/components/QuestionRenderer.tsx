import React, { useMemo } from 'react';
import { registry } from '../registry';
import { useInteractionLogger } from '../hooks/useInteractionLogger';
import { PlatinumAnalytics } from '../domain';

interface Props {
    question: any; // Raw question data from DB
    onComplete?: (result: {
        isCorrect: boolean;
        analytics: PlatinumAnalytics;
        rawResult: any;
    }) => void;
    readOnly?: boolean;
    isPreview?: boolean;

    // Context for analytics (User ID, Session ID, etc.)
    context?: {
        userId: string;
        sessionId: string;
        atomHistory?: any[];
    };
}

/**
 * The "Brain" of the assessment interface.
 * Dynamically loads the correct question version and handles the entire lifecycle
 * of interaction logging and analytics computation.
 */
export const QuestionRenderer: React.FC<Props> = ({
    question,
    onComplete,
    readOnly,
    isPreview = false,
    context
}) => {
    const { logs, logInteraction } = useInteractionLogger();

    // 0. LOG VIEW EVENT
    React.useEffect(() => {
        logInteraction('view', { timestamp: Date.now() });
    }, [logInteraction]);

    // 1. RESOLVE MANIFEST
    const manifest = useMemo(() => {
        // Normalize Type
        let typeId = 'multiple-choice'; // Default
        if (question.meta?.type) typeId = question.meta.type;
        else if (question.template) typeId = question.template.toLowerCase().replace('_', '-');
        else if (question.type) typeId = question.type.toLowerCase().replace('_', '-');

        // Create registry key friendly ID (e.g., MULTIPLE_CHOICE -> multiple-choice)
        if (typeId === 'multiple-choice' || typeId === 'multiple-select') {
            // Map common variations
            typeId = 'multiple-choice';
        }

        // Resolve Version
        const version = question.meta?.version;

        return registry.get(typeId, version);
    }, [question]);

    // 2. SAFE FALLBACK
    if (!manifest) {
        return (
            <div className="p-6 border-2 border-red-200 rounded-xl bg-red-50 text-red-700">
                <h3 className="font-bold mb-2">Error: Unknown Question Type</h3>
                <p className="text-sm">
                    System could not find a renderer for type: <strong>{question.template || question.type || 'Unknown'}</strong>
                </p>
                <pre className="mt-4 text-xs bg-white p-2 rounded border border-red-100 overflow-auto">
                    {JSON.stringify(question, null, 2)}
                </pre>
            </div>
        );
    }

    // 3. HANDLE COMPLETION
    const handleComplete = (result: any) => {
        // Skip analytics if in preview mode
        if (isPreview) {
            console.log('QLMS: Preview Mode - Skipping interaction logs and analytics');
            if (onComplete) {
                onComplete({
                    isCorrect: !!result.isCorrect,
                    rawResult: result,
                    analytics: {} as any
                });
            }
            return;
        }

        logInteraction('submit', result);

        // Compute Platinum Analytics
        // We defer this slightly to ensure the submit log is included
        setTimeout(() => {
            try {
                const analytics = manifest.analytics.computeMetrics(
                    question,
                    [...logs, { type: 'submit', payload: result, timestamp: Date.now() }],
                    context || { userId: 'anon', sessionId: 'dev-session' }
                );

                if (onComplete) {
                    onComplete({
                        isCorrect: analytics.isCorrect,
                        analytics,
                        rawResult: result
                    });
                }
            } catch (err) {
                console.error('QLMS: Analytics Computation Failed', err);
                // Fallback: Return basic result even if analytics fail
                if (onComplete) {
                    onComplete({
                        isCorrect: !!result.isCorrect,
                        rawResult: result,
                        analytics: {} as any // Dangerous but keeps app alive
                    });
                }
            }
        }, 0);
    };

    // 4. RENDER
    const Component = manifest.component;

    return (
        <div className="qlms-renderer-host" data-type={manifest.id} data-version={manifest.version}>
            <Component
                data={question}
                readOnly={readOnly}
                isPreview={isPreview}
                onInteract={(log) => !isPreview && logInteraction(log.type, log.payload)}
                onComplete={handleComplete}
            />
        </div>
    );
};
