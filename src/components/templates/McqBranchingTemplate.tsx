import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, XCircle, ArrowRight, RotateCcw } from 'lucide-react'; // Example icons
import { McqBranchingQuestion, BranchStage, BranchOption } from '../../types/questions';
import { useNinja } from '../../context/NinjaContext'; // Assuming context is needed for audio/etc, or removed if not.

interface McqBranchingTemplateProps {
    question: McqBranchingQuestion;
    onAnswer: (result: { isCorrect: boolean; score: number; feedback?: string }) => void;
    isSubmitting: boolean;
    readOnly: boolean;
}

export const McqBranchingTemplate: React.FC<McqBranchingTemplateProps> = ({
    question,
    onAnswer,
    isSubmitting,
    readOnly
}) => {
    // 1. Initialize State
    const entryStageId = question.flow.entry_stage_id;
    const [currentStageId, setCurrentStageId] = useState(entryStageId);
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [isComplete, setIsComplete] = useState(false);

    // Trace history for debugging or advanced feedback
    const [history, setHistory] = useState<string[]>([entryStageId]);

    // Find current stage data
    const currentStage = question.stages.find(s => s.stage_id === currentStageId);

    if (!currentStage) {
        return <div className="text-red-500">Error: Stage {currentStageId} not found.</div>;
    }

    // handlers
    const handleOptionSelect = (option: BranchOption) => {
        if (isSubmitting || readOnly || isComplete) return;

        setSelectedOptionId(option.id);

        // Immediate Local Feedback (if branching allows)
        if (option.feedback) {
            setFeedback(option.feedback);
        } else {
            setFeedback(null);
        }

        // Process Next Action immediately or via a "Continue" button? 
        // For standard MCQ flow, usually immediate or confirm. 
        // Let's go with immediate processing for branching navigation, 
        // usually with a small delay or manual "Next" if feedback exists.

        // NOTE: If this is the final "exit" node, we might want to wait. 
        // But for branching (diagnosis), usually the path matters.
    };

    const handleContinue = () => {
        if (!selectedOptionId || !currentStage) return;

        const option = currentStage.interaction.config.options.find(o => o.id === selectedOptionId);
        if (!option) return;

        const action = option.next;

        if (action.type === 'exit') {
            setIsComplete(true);
            const isSuccess = action.outcome === 'pass';
            onAnswer({
                isCorrect: isSuccess,
                score: isSuccess ? 1 : 0, // Simplified score
                feedback: option.feedback
            });
        } else if (action.type === 'branch') {
            if (action.target) {
                setCurrentStageId(action.target);
                setSelectedOptionId(null);
                setFeedback(null);
                setHistory(prev => [...prev, action.target]);
            }
        } else if (action.type === 'return_to_entry') {
            setCurrentStageId(entryStageId);
            setSelectedOptionId(null);
            setFeedback(null);
            setHistory(prev => [...prev, entryStageId]);
        } else if (action.type === 'loop') {
            // Reload current (maybe shuffle?)
            setSelectedOptionId(null);
            setFeedback(null);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto p-4 md:p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
            {/* STAGE DEBUGGER (Optional, remove in production) */}
            {/* <div className="text-xs text-slate-400 mb-2 font-mono">Stage: {currentStageId} | Intent: {currentStage.intent}</div> */}

            {/* PROMPT */}
            <div className="mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 leading-relaxed">
                    {currentStage.prompt.text}
                </h2>
                {currentStage.prompt.media_ref && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                        {/* Placeholder for Media */}
                        [Media: {currentStage.prompt.media_ref}]
                    </div>
                )}
            </div>

            {/* STIMULUS (If Any) */}
            {currentStage.stimulus && currentStage.stimulus.type !== 'none' && (
                <div className="mb-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                    {/* Render based on type */}
                    {currentStage.stimulus.type === 'table' && <div>[Table Content]</div>}
                    {currentStage.stimulus.type === 'image' && <div>[Image Content]</div>}
                    {currentStage.stimulus.type === 'steps' && <div>[Steps Content]</div>}
                </div>
            )}

            {/* INSTRUCTION */}
            {currentStage.instruction && (
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                    {currentStage.instruction}
                </p>
            )}

            {/* INTERACTION (OPTIONS) */}
            <div className="space-y-3">
                {currentStage.interaction.config.options.map((option) => {
                    const isSelected = selectedOptionId === option.id;
                    return (
                        <button
                            key={option.id}
                            onClick={() => handleOptionSelect(option)}
                            disabled={isComplete}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 relative group
                                ${isSelected
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                                    : 'border-slate-100 hover:border-blue-200 bg-white hover:bg-slate-50 text-slate-700'
                                }
                            `}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors shrink-0
                                    ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-200'}
                                `}>
                                    {option.id}
                                </div>
                                <div className="text-lg font-medium pt-0.5">
                                    {option.text || option.latex || "Option"}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* FEEDBACK & NAVIGATION AREA */}
            <AnimatePresence>
                {selectedOptionId && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-6 border-t border-slate-100 pt-6"
                    >
                        {/* Optional Feedback Display */}
                        {feedback && (
                            <div className="mb-4 p-4 bg-indigo-50 text-indigo-800 rounded-xl text-sm font-medium flex gap-3">
                                <AlertCircle className="shrink-0 w-5 h-5" />
                                <div>{feedback}</div>
                            </div>
                        )}

                        <button
                            onClick={handleContinue}
                            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                        >
                            {isComplete ? 'Complete' : 'Continue'} <ArrowRight className="w-5 h-5" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
