import React, { useState, useMemo, useEffect } from 'react';
import { MCQBranchingDataV1, Stage, StageAction } from './schema';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';
// import { LatexRenderer } from '../../../../../components/shared/LatexRenderer'; // Assuming this exists or we use simple text

interface Props {
    data: MCQBranchingDataV1;
    onInteract?: (log: any) => void;
    onComplete?: (result: any) => void;
    readOnly?: boolean;
}

/**
 * The Finite State Machine (FSM) Engine for Branching Questions.
 */
export const MCQBranchingComponent: React.FC<Props> = ({ data, onInteract, onComplete, readOnly }) => {
    const [currentStageId, setCurrentStageId] = useState(data.flow.entry_stage_id);
    const [history, setHistory] = useState<string[]>([]);

    // Lookup map for fast stage access
    const stageMap = useMemo(() => {
        return new Map(data.stages.map(s => [s.stage_id, s]));
    }, [data.stages]);

    const currentStage = stageMap.get(currentStageId);

    // Transition Handler
    const handleTransition = (action: StageAction, resultContext: any) => {
        if (onInteract) {
            onInteract({ type: 'transition', from: currentStageId, action, ...resultContext });
        }

        if (action.type === 'exit') {
            if (onComplete) {
                onComplete({
                    isCorrect: action.outcome === 'pass',
                    path: [...history, currentStageId],
                    finalStage: currentStageId
                });
            }
            return;
        }

        if (action.type === 'loop') {
            // Resetting state for current stage involves potentially clearing the 'key' of the sub-component
            // For now, we mainly log it. The Sub-component handles its own reset if specific prop changes.
            return;
        }

        if ((action.type === 'goto_stage' || action.type === 'branch') && action.target) {
            setHistory(prev => [...prev, currentStageId]);
            setCurrentStageId(action.target);
        }
    };

    if (!currentStage) {
        return <div className="p-4 text-red-500">Error: Stage {currentStageId} not found.</div>;
    }

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* Progress / History Bar */}
            <div className="flex gap-2 mb-6 text-sm text-gray-400 overflow-hidden">
                {history.map((hid, idx) => (
                    <span key={idx} className="flex items-center">
                        {hid} <ArrowRight className="w-3 h-3 mx-1" />
                    </span>
                ))}
                <span className="font-bold text-blue-600">{currentStageId}</span>
            </div>

            <AnimatePresence mode='wait'>
                <motion.div
                    key={currentStageId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                >
                    <StageRenderer
                        stage={currentStage}
                        onTransition={handleTransition}
                        onInteract={onInteract}
                        readOnly={readOnly}
                    />
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

// --- SUB-COMPONENT: Single Stage Renderer ---

const StageRenderer: React.FC<{
    stage: Stage;
    onTransition: (action: StageAction, ctx: any) => void;
    onInteract?: (log: any) => void;
    readOnly?: boolean;
}> = ({ stage, onTransition, onInteract, readOnly }) => {
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);

    const handleSelect = (optId: string) => {
        if (submitted || readOnly) return;
        setSelectedOptionId(optId);
        if (onInteract) onInteract({ type: 'select_option', stage: stage.stage_id, optionId: optId });
    };

    const handleSubmit = () => {
        if (!selectedOptionId || submitted) return;

        const option = stage.interaction.config.options.find(o => o.id === selectedOptionId);
        if (!option) return;

        setSubmitted(true);
        setFeedback(option.feedback || null);

        if (onInteract) onInteract({ type: 'submit_stage', stage: stage.stage_id, optionId: selectedOptionId, isCorrect: option.is_correct });
    };

    const handleNext = () => {
        const option = stage.interaction.config.options.find(o => o.id === selectedOptionId);
        if (!option) return;

        // Default to exiting as 'pass' if no next action defined and we are just testing
        // But schema implies 'next' should be there for branching.
        const nextAction: StageAction = option.next || { type: 'exit', outcome: option.is_correct ? 'pass' : 'fail' };

        if (nextAction.type === 'loop') {
            // Soft reset
            setSubmitted(false);
            setSelectedOptionId(null);
            setFeedback(null);
        }

        onTransition(nextAction, { optionId: selectedOptionId });
    };

    return (
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
            {/* Header / Intent Badge */}
            {stage.intent && (
                <div className="mb-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-gray-100 text-gray-500">
                    {stage.intent.replace('_', ' ')}
                </div>
            )}

            {/* Prompt */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{stage.prompt.text}</h2>
            {stage.prompt.latex && <div className="text-xl text-gray-700 font-serif mb-4 bg-gray-50 p-2 rounded">{stage.prompt.latex}</div>}

            {stage.instruction && (
                <p className="text-gray-500 italic mb-8 border-l-4 border-blue-200 pl-3">
                    {stage.instruction}
                </p>
            )}

            {/* Options */}
            <div className="space-y-3 mb-8">
                {stage.interaction.config.options.map(opt => {
                    const isSelected = selectedOptionId === opt.id;
                    const style = isSelected
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50';

                    return (
                        <button
                            key={opt.id}
                            onClick={() => handleSelect(opt.id)}
                            disabled={submitted}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${style} ${submitted ? 'opacity-60 grayscale' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                    {opt.id}
                                </div>
                                <div>
                                    <div className="font-medium text-lg">{opt.text}</div>
                                    {opt.latex && <div className="text-sm text-gray-600 font-serif mt-1">{opt.latex}</div>}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Feedback & Actions */}
            <div className="flex flex-col gap-4">
                <AnimatePresence>
                    {submitted && feedback && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="bg-indigo-50 border-l-4 border-indigo-400 p-4 rounded-r-lg"
                        >
                            <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> Feedback
                            </h4>
                            <p className="text-indigo-800">{feedback}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {!submitted ? (
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedOptionId}
                        className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                        Confirm Answer
                    </button>
                ) : (
                    <button
                        onClick={handleNext}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center justify-center gap-2 animate-pulse"
                    >
                        Continued <ArrowRight className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};
