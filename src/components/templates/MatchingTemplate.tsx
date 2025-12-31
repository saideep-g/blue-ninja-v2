import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { Check, Sparkles, ArrowRightCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useProfileStore } from '../../store/profile';
import { getRandomPraise } from '../../utils/feedbackUtils';

interface MatchingTemplateProps {
    question: any;
    onAnswer: (result: any) => void;
    readOnly?: boolean;
}

interface MatchItem {
    id: string;
    content: string | React.ReactNode;
    type: 'text' | 'image' | 'latex';
    originalIndex?: number;
}

const THEMES = [
    { name: 'Indigo', bg: 'bg-indigo-50', border: 'border-indigo-500', text: 'text-indigo-700', stroke: '#6366f1' },
    { name: 'Magenta', bg: 'bg-fuchsia-50', border: 'border-fuchsia-500', text: 'text-fuchsia-700', stroke: '#d946ef' },
    { name: 'Teal', bg: 'bg-teal-50', border: 'border-teal-500', text: 'text-teal-700', stroke: '#14b8a6' },
    { name: 'Amber', bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-700', stroke: '#f59e0b' },
    { name: 'Rose', bg: 'bg-rose-50', border: 'border-rose-500', text: 'text-rose-700', stroke: '#f43f5e' },
    { name: 'Sky', bg: 'bg-sky-50', border: 'border-sky-500', text: 'text-sky-700', stroke: '#0ea5e9' },
];

interface Connection {
    leftId: string;
    rightId: string;
    status: 'correct' | 'incorrect';
    themeIndex: number;
}

export const MatchingTemplate: React.FC<MatchingTemplateProps> = ({
    question,
    onAnswer,
    readOnly = false
}) => {
    const { autoAdvance } = useProfileStore();

    // --- State ---
    const [leftItems, setLeftItems] = useState<MatchItem[]>([]);
    const [rightItems, setRightItems] = useState<MatchItem[]>([]);

    const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [isComplete, setIsComplete] = useState(false);
    const [mistakes, setMistakes] = useState(0);

    // Feedback State
    const [feedback, setFeedback] = useState<{ isCorrect: boolean; feedback: string } | null>(null);
    const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Layout Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const leftRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const rightRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // SVG Lines
    const [lines, setLines] = useState<{ id: string, d: string, color: string }[]>([]);

    // --- 1. Data Parsing ---
    useEffect(() => {
        if (!question) return;

        // Reset State
        setFeedback(null);
        setIsAutoAdvancing(false);
        setIsComplete(false);
        setMistakes(0);
        setConnections([]);
        setLines([]);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        let lItems: MatchItem[] = [];
        let rItems: MatchItem[] = [];

        // ROBUST CONFIG LOOKUP
        const interaction = question.content?.interaction || question.interaction || {};
        const config = interaction.config || {};

        if (config.left && config.right) {
            lItems = config.left.map((item: any) => ({
                id: item.id, content: item.text, type: 'text', originalIndex: -1
            }));
            rItems = config.right.map((item: any) => ({
                id: item.id, content: item.text, type: 'text', originalIndex: -1
            }));
        } else {
            const rawPairs = config.pairs || question.content?.pairs || question.pairs || [];
            if (rawPairs.length > 0) {
                lItems = rawPairs.map((p: any, idx: number) => ({
                    id: `left-${idx}`, content: p.left, type: 'text', originalIndex: idx
                }));
                rItems = rawPairs.map((p: any, idx: number) => ({
                    id: `right-${idx}`, content: p.right, type: 'text', originalIndex: idx
                }));
            }
        }

        const shuffledRight = [...rItems];
        for (let i = shuffledRight.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledRight[i], shuffledRight[j]] = [shuffledRight[j], shuffledRight[i]];
        }

        setLeftItems(lItems);
        setRightItems(shuffledRight);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [question.id]);

    // --- 2. Line Calculation ---
    const updateLines = useCallback(() => {
        if (!containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();

        const newLines = connections.map(conn => {
            const leftEl = leftRefs.current[conn.leftId];
            const rightEl = rightRefs.current[conn.rightId];

            if (!leftEl || !rightEl) return null;

            const leftRect = leftEl.getBoundingClientRect();
            const rightRect = rightEl.getBoundingClientRect();

            const startX = (leftRect.right - containerRect.left);
            const startY = (leftRect.top + leftRect.height / 2) - containerRect.top;

            const endX = (rightRect.left - containerRect.left);
            const endY = (rightRect.top + rightRect.height / 2) - containerRect.top;

            // Updated Curve Logic: Standard S-Curve (Horizontal Bias)
            const distanceX = Math.abs(endX - startX);
            const controlDist = distanceX * 0.5;

            const cp1X = startX + controlDist;
            const cp1Y = startY;
            const cp2X = endX - controlDist;
            const cp2Y = endY;

            const d = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;

            return {
                id: `${conn.leftId}-${conn.rightId}`,
                d,
                color: THEMES[conn.themeIndex % THEMES.length].stroke
            };
        }).filter(Boolean) as any[];

        setLines(newLines);
    }, [connections, selectedLeft, leftItems, rightItems]);

    // Sync Loop
    useLayoutEffect(() => {
        updateLines();

        const handleResize = () => requestAnimationFrame(updateLines);
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleResize, true);

        const resizeObserver = new ResizeObserver(handleResize);
        if (containerRef.current) resizeObserver.observe(containerRef.current);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleResize, true);
            resizeObserver.disconnect();
        };
    }, [updateLines]);


    // --- 3. Handlers ---
    const handleItemClick = (side: 'left' | 'right', id: string) => {
        if (readOnly || isComplete) return;

        const existingInfo = connections.find(c => side === 'left' ? c.leftId === id : c.rightId === id);
        if (existingInfo) return;

        if (side === 'left') {
            setSelectedLeft(prev => prev === id ? null : id);
        }
        else {
            if (!selectedLeft) return;

            const leftId = selectedLeft;
            const rightId = id;

            const leftItem = leftItems.find(i => i.id === leftId);
            const rightItem = rightItems.find(i => i.id === rightId);

            if (!leftItem || !rightItem) return;

            // Validate matches
            let isCorrect = false;
            // Config-based validation priority
            if (question.answer_key?.pairs) {
                isCorrect = question.answer_key.pairs.some((p: any) => p.left_id === leftItem.id && p.right_id === rightItem.id);
            } else if (leftItem.originalIndex !== -1) {
                isCorrect = leftItem.originalIndex === rightItem.originalIndex;
            }

            const newConn: Connection = {
                leftId,
                rightId,
                status: isCorrect ? 'correct' : 'incorrect',
                themeIndex: connections.length
            };

            const nextConns = [...connections, newConn];
            setConnections(nextConns);
            setSelectedLeft(null);

            if (!isCorrect) {
                // METRIC: Incorrect attempt
                setMistakes(prev => prev + 1);

                setTimeout(() => {
                    setConnections(prev => prev.filter(c => c.leftId !== leftId));
                }, 1000);
            } else {
                const correctCount = nextConns.filter(c => c.status === 'correct').length;
                if (correctCount === leftItems.length) {
                    setIsComplete(true);

                    // Trigger "Gen Z" Feedback Flow
                    const praise = getRandomPraise();
                    setFeedback({ isCorrect: true, feedback: praise });

                    const resultData = {
                        isCorrect: true,
                        matches: nextConns,
                        attempts: mistakes + 1,
                        mistakes: mistakes,
                        isRecovered: mistakes > 0
                    };

                    if (autoAdvance !== false) {
                        setIsAutoAdvancing(true);
                        timeoutRef.current = setTimeout(() => {
                            onAnswer(resultData);
                        }, 2000);
                    } else {
                        // Just prepare data, wait for manual click
                    }
                }
            }
        }
    };

    // Manual Continue
    const handleContinue = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        const resultData = {
            isCorrect: true,
            matches: connections,
            attempts: mistakes + 1,
            mistakes: mistakes,
            isRecovered: mistakes > 0
        };
        onAnswer(resultData);
    };


    const getItemState = (side: 'left' | 'right', id: string) => {
        const conn = connections.find(c => side === 'left' ? c.leftId === id : c.rightId === id);
        if (conn) {
            return { mode: 'connected', status: conn.status, theme: THEMES[conn.themeIndex % THEMES.length] };
        }
        if (side === 'left' && selectedLeft === id) {
            return { mode: 'selected' };
        }
        return { mode: 'default' };
    };

    return (
        <div className="w-full max-w-5xl mx-auto p-6 md:p-12 pb-32">
            <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
                    {question.content?.prompt?.text || (typeof question.prompt === 'string' ? question.prompt : question.prompt?.text) || "Match the pairs"}
                </h2>
                <p className="text-slate-500 mt-2 font-medium">Select a term on the left, then connect it to the right.</p>
            </div>

            <div className="flex justify-between gap-16 md:gap-32 relative isolate min-h-[400px]" ref={containerRef}>
                {/* SVG Layer */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none -z-10 overflow-visible">
                    {lines.map(line => (
                        <path
                            key={line.id}
                            d={line.d}
                            fill="none"
                            stroke={line.color}
                            strokeWidth="4"
                            strokeLinecap="round"
                        />
                    ))}
                </svg>

                <div className="flex-1 flex flex-col justify-center space-y-6">
                    {leftItems.map(item => {
                        const { mode, status, theme } = getItemState('left', item.id);
                        return (
                            <div
                                key={item.id}
                                ref={el => { if (el) leftRefs.current[item.id] = el; }}
                                onClick={() => handleItemClick('left', item.id)}
                                className={`
                                    group relative p-5 bg-white rounded-xl border-2 shadow-sm cursor-pointer select-none transition-all duration-200
                                    flex items-center justify-center text-center
                                    ${mode === 'default' ? 'border-slate-200 hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5' : ''}
                                    ${mode === 'selected' ? 'border-blue-500 ring-4 ring-blue-100 shadow-xl z-20 scale-105' : ''}
                                    ${mode === 'connected' && status === 'correct' ? `${theme?.bg} ${theme?.border} ${theme?.text} shadow-none` : ''}
                                    ${mode === 'connected' && status === 'incorrect' ? 'bg-red-50 border-red-500 text-red-700 animate-shake' : ''}
                                `}
                            >
                                <span className="font-bold text-lg md:text-xl">{item.content}</span>
                                <div className={`
                                    absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center transition-colors
                                    ${mode === 'default' ? 'border-slate-300 group-hover:border-blue-400 text-slate-300' : ''}
                                    ${mode === 'selected' ? 'border-blue-500 bg-blue-500 text-white scale-110' : ''}
                                    ${mode === 'connected' ? `${theme?.border} bg-white` : ''}
                                `}>
                                    <div className={`w-2 h-2 rounded-full ${mode === 'connected' ? `bg-${theme?.stroke}` : 'bg-current'}`} style={{ backgroundColor: mode === 'connected' ? theme?.stroke : undefined }} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex-1 flex flex-col justify-center space-y-6">
                    {rightItems.map(item => {
                        const { mode, status, theme } = getItemState('right', item.id);
                        const isMatchable = selectedLeft !== null && mode === 'default';

                        return (
                            <div
                                key={item.id}
                                ref={el => { if (el) rightRefs.current[item.id] = el; }}
                                onClick={() => handleItemClick('right', item.id)}
                                className={`
                                    group relative p-5 bg-white rounded-xl border-2 shadow-sm cursor-pointer select-none transition-all duration-200
                                    flex items-center justify-center text-center
                                    ${mode === 'default' && isMatchable ? 'border-slate-200 hover:border-blue-400 hover:bg-blue-50' : ''}
                                    ${mode === 'default' && !isMatchable ? 'border-slate-200' : ''}
                                    ${mode === 'connected' && status === 'correct' ? `${theme?.bg} ${theme?.border} ${theme?.text}` : ''}
                                    ${mode === 'connected' && status === 'incorrect' ? 'bg-red-50 border-red-500 animate-shake' : ''}
                                `}
                            >
                                <div className={`
                                    absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center transition-colors
                                    ${mode === 'default' ? 'border-slate-300 group-hover:border-blue-400' : ''}
                                    ${mode === 'connected' ? `${theme?.border}` : ''}
                                `}>
                                    {mode === 'connected' && status === 'correct' ? (
                                        <Check size={14} className={theme?.text} strokeWidth={4} />
                                    ) : (
                                        <div className={`w-2 h-2 rounded-full ${mode === 'connected' ? '' : 'bg-slate-300'}`} style={{ backgroundColor: mode === 'connected' ? theme?.stroke : undefined }} />
                                    )}
                                </div>
                                <span className="font-bold text-lg md:text-xl">{item.content}</span>
                            </div>
                        );
                    })}
                </div>

            </div>

            {/* ========== FEEDBACK & NEXT SECTION ========== */}
            {feedback && (
                <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 animate-in slide-in-from-bottom-full duration-500">
                    <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">

                        <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-7 h-7 text-green-600" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-xl font-black text-slate-800 flex items-center gap-3">
                                    {feedback.feedback}
                                    {isAutoAdvancing && <Loader2 className="w-5 h-5 animate-spin text-slate-400" />}
                                </h4>
                                {isAutoAdvancing && <p className="text-sm text-slate-500 font-medium">Advancing in 2s...</p>}
                            </div>
                        </div>

                        {/* Progress Bar for Auto Advance */}
                        {isAutoAdvancing && (
                            <div className="absolute top-0 left-0 right-0 h-1 bg-green-100">
                                <div className="h-full bg-green-500 animate-[progress_2s_linear_forward]" style={{ width: '100%' }}></div>
                            </div>
                        )}

                        <button
                            onClick={handleContinue}
                            className="w-full md:w-auto px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-lg shadow-xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            Next Question <ArrowRightCircle size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
