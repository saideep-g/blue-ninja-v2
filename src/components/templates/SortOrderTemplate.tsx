import React, { useState, useEffect } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { Check, X, Sparkles, GripVertical, ArrowRight } from 'lucide-react';

interface SortOrderTemplateProps {
    question: any;
    onAnswer: (result: any) => void;
    isSubmitting?: boolean;
    readOnly?: boolean;
}

interface Tile {
    id: string;
    text: string;
}

export const SortOrderTemplate: React.FC<SortOrderTemplateProps> = ({ question, onAnswer, isSubmitting, readOnly }) => {
    // extract config
    const config = question.content?.interaction?.config || question.interaction?.config || {};
    const rawTiles = (config.tiles || []).map((t: any) => ({
        id: t.id,
        text: t.text || t.content
    }));

    const [items, setItems] = useState<Tile[]>([]);
    const [isComplete, setIsComplete] = useState(false);
    const [showVictory, setShowVictory] = useState(false);
    const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');

    // Shuffle items on mount
    useEffect(() => {
        if (rawTiles.length > 0) {
            // Simple Fisher-Yates shuffle
            const shuffled = [...rawTiles];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            setItems(shuffled);
        }
    }, [question.id]); // re-shuffle on new question

    const handleSubmit = () => {
        if (isComplete) return;

        const correctOrder = question.answerKey?.correct_order || question.answer_key?.correct_order || [];

        // Check if order matches
        const currentOrderIds = items.map(i => i.id);

        // Compare arrays
        let isCorrect = true;
        if (currentOrderIds.length !== correctOrder.length) {
            isCorrect = false;
        } else {
            for (let i = 0; i < currentOrderIds.length; i++) {
                if (currentOrderIds[i] !== correctOrder[i]) {
                    isCorrect = false;
                    break;
                }
            }
        }

        if (isCorrect) {
            setFeedback('correct');
            setIsComplete(true);
            setShowVictory(true);
        } else {
            setFeedback('incorrect');
            setTimeout(() => setFeedback('idle'), 2000);
        }
    };

    // Global Victory Handler
    useEffect(() => {
        if (showVictory) {
            const timer = setTimeout(() => {
                onAnswer({
                    isCorrect: true,
                    orderedIds: items.map(i => i.id),
                    attempts: 1
                });
            }, 2000); // 2s celebration
            return () => clearTimeout(timer);
        }
    }, [showVictory, onAnswer, items]);

    return (
        <div className="w-full max-w-4xl mx-auto p-4 md:p-8 flex flex-col items-center">
            {/* PROMPT */}
            <div className="text-center mb-8 max-w-2xl">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                    {typeof ((question as any).prompt) === 'object'
                        ? (question as any).prompt.text
                        : (question.content?.prompt?.text || (question as any).prompt || 'Order the steps')}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
                    {question.instruction || "Drag the tiles into the correct order."}
                </p>
            </div>

            {/* SORTABLE LIST */}
            <div className="w-full max-w-xl mb-12 relative">
                <Reorder.Group
                    axis="y"
                    onReorder={readOnly || isComplete ? () => { } : setItems}
                    values={items}
                    className="flex flex-col gap-4"
                >
                    {items.map((item) => (
                        <Reorder.Item
                            key={item.id}
                            value={item}
                            dragListener={!readOnly && !isComplete}
                            className={`
                                relative p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 flex items-center gap-4 cursor-grab active:cursor-grabbing select-none
                                ${feedback === 'correct' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' :
                                    feedback === 'incorrect' ? 'border-red-200 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}
                            `}
                            whileDrag={{ scale: 1.05, boxShadow: "0px 10px 20px rgba(0,0,0,0.1)", zIndex: 10 }}
                        >
                            {/* Drag Handle */}
                            <div className="text-slate-400">
                                <GripVertical />
                            </div>

                            {/* Text */}
                            <span className="flex-1 font-medium text-slate-700 dark:text-slate-200 text-lg">
                                {item.text}
                            </span>
                        </Reorder.Item>
                    ))}
                </Reorder.Group>

                {/* Incorrect Shake Overlay (Optional visual cue) */}
                {feedback === 'incorrect' && (
                    <div className="absolute inset-0 border-4 border-red-400 rounded-xl pointer-events-none animate-pulse opacity-50" />
                )}
            </div>

            {/* ACTION BUTTON */}
            <div className="mt-4">
                {!isComplete && (
                    <button
                        onClick={handleSubmit}
                        className={`
                            px-8 py-3 rounded-full font-bold text-lg shadow-lg flex items-center gap-2 transition-all transform hover:-translate-y-1 active:scale-95
                            ${feedback === 'incorrect' ? 'bg-red-100 text-red-600' : 'bg-slate-900 text-white hover:bg-slate-800'}
                        `}
                    >
                        {feedback === 'incorrect' ? (
                            <>Try Again <X size={20} /></>
                        ) : (
                            <>Confirm Order <ArrowRight size={20} /></>
                        )}
                    </button>
                )}
            </div>

            {/* VICTORY OVERLAY */}
            <AnimatePresence>
                {showVictory && (
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center z-50 pointer-events-none bg-white/5"
                    >
                        <div className="bg-emerald-500 text-white px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-2 transform">
                            <motion.div
                                animate={{ rotate: 360, scale: [1, 1.4, 1] }}
                                transition={{ duration: 0.5 }}
                            >
                                <Sparkles size={48} className="text-yellow-300" />
                            </motion.div>
                            <span className="font-black text-3xl tracking-tight">Perfect Order!</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
