import React, { useState, useRef, useEffect } from 'react';
import { motion, useDragControls, AnimatePresence } from 'framer-motion';
import { Check, X, Sparkles, ArrowRight } from 'lucide-react';

interface NumberLineConfig {
    number_line: {
        min: number;
        max: number;
        tick?: number;
        snap?: number;
    };
    start_marker?: number;
}

interface NumberLineTemplateProps {
    question: any;
    onAnswer: (result: any) => void;
    readOnly?: boolean;
}

export const NumberLineTemplate: React.FC<NumberLineTemplateProps> = ({ question, onAnswer, readOnly }) => {
    const config = (question.content?.interaction?.config || question.interaction?.config || {}) as NumberLineConfig;
    const min = config.number_line?.min ?? 0;
    const max = config.number_line?.max ?? 10;
    const step = config.number_line?.tick ?? 1;
    const snap = config.number_line?.snap ?? 0.5;
    const initialValue = config.start_marker ?? (min + max) / 2;

    const [currentValue, setCurrentValue] = useState(initialValue);
    const [isDragging, setIsDragging] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [showVictory, setShowVictory] = useState(false);
    const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');

    const containerRef = useRef<HTMLDivElement>(null);
    const constraintsRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, left: 0 });

    // ANSWER KEY PARSING
    const correctValue = question.answerKey?.value ?? question.answer_key?.value;

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDimensions({ width: rect.width, left: rect.left });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // MATH HELPERS
    const valueToPercent = (val: number) => {
        const clamped = Math.max(min, Math.min(max, val));
        return ((clamped - min) / (max - min)) * 100;
    };

    const percentToValue = (pct: number) => {
        const val = min + (pct / 100) * (max - min);
        // Snap logic
        if (snap) {
            return Math.round(val / snap) * snap;
        }
        return val;
    };

    // --- POINTER EVENT HANDLERS (Digital Snapping) ---
    const calculateValueFromPointer = (e: React.PointerEvent | PointerEvent) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        // 1. Precise X relative to container
        const relativeX = e.clientX - rect.left;

        // 2. Strict Clamping (Fixes "Outside the line" issue)
        const percent = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));

        // 3. Convert to Value
        let val = min + (percent / 100) * (max - min);

        // 4. Strong Snap
        if (snap) {
            val = Math.round(val / snap) * snap;
        }

        // 5. Update State
        if (Math.abs(val - currentValue) > 0.001) {
            setCurrentValue(val);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (isDragging) {
            calculateValueFromPointer(e);
        }
    };

    const handleReset = () => {
        if (isComplete) return;
        setCurrentValue(initialValue);
        setFeedback('idle');
    };

    const handleSubmit = () => {
        if (isComplete) return;

        const tolerance = question.answerKey?.tolerance ?? 0.1; // Default tolerance
        const isCorrect = Math.abs(currentValue - correctValue) <= tolerance;

        if (isCorrect) {
            setFeedback('correct');
            setIsComplete(true);
            setShowVictory(true);
        } else {
            setFeedback('incorrect');
            // Shake effect or similar could be triggered here via state
            setTimeout(() => setFeedback('idle'), 2000);
        }
    };

    // Victory Timer
    useEffect(() => {
        if (showVictory) {
            const timer = setTimeout(() => {
                onAnswer({
                    isCorrect: true,
                    value: currentValue,
                    attempts: 1 // simplified for now
                });
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [showVictory, onAnswer, currentValue]);

    // Generate Ticks
    const displayTicks = [];
    // Ensure ticks land on nice numbers
    const tickInterval = step || 1;
    const safeInterval = (max - min) / tickInterval > 20 ? (max - min) / 10 : tickInterval;

    for (let i = min; i <= max + 0.0001; i += safeInterval) {
        // Fix float precision issues
        const val = Math.round(i * 100) / 100;
        displayTicks.push(val);
    }

    return (
        <div className="w-full max-w-4xl mx-auto p-4 md:p-8 flex flex-col items-center min-h-[400px]">
            {/* PROMPT */}
            <div className="text-center mb-16 max-w-2xl">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                    {typeof ((question as any).prompt) === 'object'
                        ? (question as any).prompt.text
                        : (question.content?.prompt?.text || (question as any).prompt || 'Place the value')}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
                    {question.instruction || "Drag the circle to the correct value."}
                </p>
            </div>

            {/* NUMBER LINE CONTAINER */}
            <div
                className="relative w-full h-56 flex items-center justify-center mb-4 select-none touch-none cursor-pointer"
                ref={containerRef}
                onPointerDown={(e) => {
                    if (isComplete || readOnly) return;
                    setIsDragging(true);
                    (e.target as HTMLElement).setPointerCapture(e.pointerId);
                    calculateValueFromPointer(e); // Snap immediately on press
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={(e) => {
                    setIsDragging(false);
                    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
                }}
                onPointerLeave={() => setIsDragging(false)}
            >
                {/* Hit Area Overlay (invisible, full size) */}
                <div className="absolute inset-x-[-24px] inset-y-0 z-0" />

                {/* Main Line */}
                <div className="absolute w-[calc(100%+24px)] h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full pointer-events-none" />

                {/* Arrow Heads */}
                <div className="absolute left-[-12px] h-0 w-0 border-y-[6px] border-y-transparent border-r-[12px] border-r-slate-300 dark:border-r-slate-600 top-1/2 -translate-y-1/2 pointer-events-none" />
                <div className="absolute right-[-12px] h-0 w-0 border-y-[6px] border-y-transparent border-l-[12px] border-l-slate-300 dark:border-l-slate-600 top-1/2 -translate-y-1/2 pointer-events-none" />

                {/* Ticks */}
                {displayTicks.map(val => (
                    <div
                        key={val}
                        className="absolute top-1/2 pointer-events-none"
                        style={{
                            left: `${valueToPercent(val)}%`
                        }}
                    >
                        {/* Major Tick Mark */}
                        <div
                            className="absolute w-1.5 h-6 bg-slate-400 dark:bg-slate-500 rounded-full"
                            style={{ transform: 'translate(-50%, -50%)' }}
                        />

                        {/* Label */}
                        <span
                            className="absolute top-14 text-xl font-bold text-slate-600 dark:text-slate-400 font-mono select-none whitespace-nowrap"
                            style={{ transform: 'translateX(-50%)' }}
                        >
                            {val}
                        </span>
                    </div>
                ))}

                {/* Draggable Thumb - Positioned strictly by React State */}
                <motion.div
                    animate={{
                        left: `${valueToPercent(currentValue)}%`,
                        scale: isDragging ? 1.2 : 1
                    }}
                    transition={{
                        // Use a very fast spring for "Jump" feel, but slight softening so it's not jarring
                        type: 'spring', stiffness: 500, damping: 28
                    }}
                    style={{
                        position: 'absolute',
                        top: '50%',
                        marginTop: '-1.5rem',
                        marginLeft: '-1.5rem',
                        pointerEvents: 'none' // Events handled by container
                    }}
                    className={`
                        w-12 h-12 rounded-full shadow-2xl flex items-center justify-center border-[4px] z-20 transition-colors
                        ${feedback === 'correct' ? 'bg-emerald-500 border-emerald-100' :
                            feedback === 'incorrect' ? 'bg-red-500 border-red-100' :
                                'bg-blue-600 border-blue-50'}
                    `}
                >
                    <div className="w-3 h-3 bg-white rounded-full" />

                    {/* Floating Value Label */}
                    <AnimatePresence>
                        {(isDragging || feedback !== 'idle') && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                animate={{ opacity: 1, y: -60, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.8 }}
                                className="absolute bg-slate-800 text-white text-lg font-bold px-3 py-1 rounded-lg mb-2 whitespace-nowrap shadow-lg select-none"
                                style={{ transform: 'translateX(-50%)', left: '50%' }}
                            >
                                {Number.isInteger(currentValue) ? currentValue : currentValue.toString()}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Result Marker */}
                {feedback === 'incorrect' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute top-1/2 w-6 h-6 bg-transparent rounded-full border-4 border-emerald-500 opacity-50 z-10 pointer-events-none"
                        style={{
                            left: `${valueToPercent(correctValue)}%`,
                            marginTop: '-0.75rem',
                            marginLeft: '-0.75rem'
                        }}
                    />
                )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="mt-4 flex gap-4">
                <button
                    onClick={handleReset}
                    className="px-6 py-3 rounded-full text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    disabled={isComplete}
                >
                    Reset
                </button>

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
                            <>Confirm <ArrowRight size={20} /></>
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
                            <span className="font-black text-3xl tracking-tight">Perfect!</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};
