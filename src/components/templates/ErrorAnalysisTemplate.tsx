import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertTriangle, ArrowRight, Sparkles, Edit3 } from 'lucide-react';
import { evaluateMathResponse } from '../../utils/mathGrading';

interface ErrorAnalysisTemplateProps {
    question: any;
    onAnswer: (result: any) => void;
    isSubmitting?: boolean;
    readOnly?: boolean;
}

export const ErrorAnalysisTemplate: React.FC<ErrorAnalysisTemplateProps> = ({ question, onAnswer, isSubmitting, readOnly }) => {
    // 1. Extract Config
    const config = question.content?.interaction?.config || question.interaction?.config || {};
    const steps = config.student_steps || [];
    const inputMode = config.input_mode || 'text';

    // 2. Extract Answer Key
    // Note: handling potentially different field names from V3 schema
    const correctStepIndex = question.answerKey?.first_error_step ?? question.answer_key?.first_error_step ?? 0;
    const correctedSteps = question.answerKey?.corrected_steps ?? question.answer_key?.corrected_steps ?? [];

    // 3. State
    const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
    const [correctionInput, setCorrectionInput] = useState('');
    const [phase, setPhase] = useState<'identify' | 'correct' | 'complete'>('identify');
    const [feedback, setFeedback] = useState<'idle' | 'incorrect_step' | 'incorrect_fix'>('idle');
    const [showVictory, setShowVictory] = useState(false);

    const handleStepClick = (index: number) => {
        if (readOnly || phase !== 'identify') return;

        setSelectedStepIndex(index);

        // Immediate validation for step identification
        if (index === correctStepIndex) {
            setFeedback('idle');
            setPhase('correct');
        } else {
            setFeedback('incorrect_step');
            setTimeout(() => {
                setFeedback('idle');
                setSelectedStepIndex(null);
            }, 1500);
        }
    };

    const handleCorrectionSubmit = () => {
        if (phase !== 'correct') return;

        // 1. Get target correction
        const targetCorrection = correctedSteps[0] || "";

        // 2. Use Semantic Heuristic Validator
        const { isCorrect } = evaluateMathResponse(correctionInput, targetCorrection);

        if (isCorrect) {
            setPhase('complete');
            setShowVictory(true);
            setFeedback('idle');
        } else {
            setFeedback('incorrect_fix');
            setTimeout(() => setFeedback('idle'), 2500);
        }
    };

    // Victory Handler
    React.useEffect(() => {
        if (showVictory) {
            const timer = setTimeout(() => {
                onAnswer({
                    isCorrect: true,
                    selectedStep: selectedStepIndex,
                    correction: correctionInput,
                    attempts: 1
                });
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [showVictory]);

    return (
        <div className="w-full max-w-5xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[500px]">

            {/* LEFT COLUMN: THE "PAPER" (Student Work) */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-slate-100 dark:bg-slate-700" />

                <div className="mb-6">
                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full">
                        Original Work
                    </span>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-4 leading-relaxed">
                        {typeof ((question as any).prompt) === 'object'
                            ? (question as any).prompt.text
                            : (question.content?.prompt?.text || (question as any).prompt)}
                    </h3>
                </div>

                <div className="space-y-4">
                    {steps.map((step: string, index: number) => {
                        const isSelected = selectedStepIndex === index;
                        const isCorrectStep = index === correctStepIndex;
                        // Visual states
                        let stateClass = "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer";

                        if (phase !== 'identify' && isSelected && isCorrectStep) {
                            stateClass = "border-red-400 dark:border-red-800 bg-red-50 dark:bg-red-900/20 ring-2 ring-red-100 dark:ring-red-900/30"; // Identified Error
                        } else if (feedback === 'incorrect_step' && isSelected) {
                            stateClass = "border-slate-200 dark:border-slate-700 bg-slate-200 dark:bg-slate-700 opacity-50"; // Wrong guess
                        } else if (phase !== 'identify' && !isSelected) {
                            stateClass = "opacity-40 border-transparent bg-transparent pl-0"; // Dim others
                        }

                        return (
                            <motion.div
                                key={index}
                                onClick={() => handleStepClick(index)}
                                className={`p-4 rounded-xl border-2 transition-all relative ${stateClass}`}
                                whileHover={phase === 'identify' ? { scale: 1.02, x: 4 } : {}}
                                whileTap={phase === 'identify' ? { scale: 0.98 } : {}}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={`font-mono text-lg font-medium ${phase !== 'identify' && !isSelected ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                                        {step}
                                    </span>

                                    {/* Markers */}
                                    {phase !== 'identify' && isSelected && isCorrectStep && (
                                        <div className="flex items-center gap-2 text-red-500 dark:text-red-400 font-bold text-sm bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm">
                                            <AlertTriangle size={16} /> Error Found
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* RIGHT COLUMN: THE "CRITIQUE" (Interaction) */}
            <div className="flex flex-col justify-center">
                <AnimatePresence mode="wait">
                    {phase === 'identify' && (
                        <motion.div
                            key="identify"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-indigo-600 text-white p-8 rounded-[32px] shadow-xl shadow-indigo-200"
                        >
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                                <SearchIcon className="text-white" />
                            </div>
                            <h2 className="text-3xl font-black mb-4">Spot the Mistake!</h2>
                            <p className="text-indigo-100 text-lg leading-relaxed mb-8">
                                One of the steps on the left contains a mathematical or logical error.
                                <br /><br />
                                <strong className="text-white">Tap the incorrect step</strong> to proceed.
                            </p>

                            {feedback === 'incorrect_step' && (
                                <div className="bg-red-500/20 border border-red-500/30 p-4 rounded-xl flex items-center gap-3 animate-pulse">
                                    <X size={20} /> That step looks okay. Try another!
                                </div>
                            )}
                        </motion.div>
                    )}

                    {phase === 'correct' && (
                        <motion.div
                            key="correct"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-xl border-2 border-slate-100 dark:border-slate-700"
                        >
                            <div className="flex items-center gap-3 mb-6 text-emerald-600">
                                <Check size={32} strokeWidth={4} />
                                <h2 className="text-2xl font-black">Good Catch!</h2>
                            </div>

                            <p className="text-slate-500 font-medium mb-2">How should this step look?</p>
                            <div className="relative">
                                <input
                                    type="text"
                                    autoFocus
                                    className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-xl font-mono text-slate-800 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                    placeholder="Type correction..."
                                    value={correctionInput}
                                    onChange={e => setCorrectionInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCorrectionSubmit()}
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <Edit3 className="text-slate-400 dark:text-slate-500" />
                                </div>
                            </div>

                            <button
                                onClick={handleCorrectionSubmit}
                                disabled={correctionInput.trim().length === 0}
                                className="w-full mt-6 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-bold py-4 rounded-xl text-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                            >
                                Submit Fix
                            </button>

                            {feedback === 'incorrect_fix' && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-2 border border-red-100 dark:border-red-900/30"
                                >
                                    <X size={20} />
                                    <span className="font-bold text-sm">Not quite. Double check the math!</span>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {phase === 'complete' && (
                        <motion.div
                            key="complete"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-emerald-500 text-white p-10 rounded-[40px] shadow-2xl text-center"
                        >
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 0.8, ease: "backOut" }}
                                className="inline-flex p-4 bg-white/20 rounded-full mb-6"
                            >
                                <Sparkles size={40} className="text-yellow-300" />
                            </motion.div>
                            <h2 className="text-4xl font-black mb-2">Analysis Complete!</h2>
                            <p className="text-emerald-100 text-lg">You diagnosed and fixed the error.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

// Helper Icon
const SearchIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
);
