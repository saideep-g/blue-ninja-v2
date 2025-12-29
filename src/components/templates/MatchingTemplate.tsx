import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { Check, Sparkles, GripVertical } from 'lucide-react';

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
    // --- State ---
    const [leftItems, setLeftItems] = useState<MatchItem[]>([]);
    const [rightItems, setRightItems] = useState<MatchItem[]>([]);

    const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [isComplete, setIsComplete] = useState(false);
    const [mistakes, setMistakes] = useState(0);

    // Layout Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const leftRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const rightRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // SVG Lines
    const [lines, setLines] = useState<{ id: string, d: string, color: string }[]>([]);

    // --- 1. Data Parsing ---
    useEffect(() => {
        if (!question) return;

        let lItems: MatchItem[] = [];
        let rItems: MatchItem[] = [];

        // ROBUST CONFIG LOOKUP
        const interaction = question.content?.interaction || question.interaction || {};
        const config = interaction.config || {};

        // Debugging Metadata (Visible in UI for troubleshooting)
        const debugData = {
            hasContent: !!question.content,
            hasInteraction: !!interaction,
            keys: Object.keys(config)
        };
        console.log('[MatchingTemplate] Init', question, config);

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
        setConnections([]);
        setMistakes(0);
        setIsComplete(false);
    }, [question.id, question.item_id]);

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

                    // METRIC: Submit results with recovery stats
                    onAnswer({
                        isCorrect: true,
                        matches: nextConns,
                        attempts: mistakes + 1,        // Total logical attempts
                        mistakes: mistakes,            // Explicit error count
                        isRecovered: mistakes > 0      // "Recovered" if they failed at least once
                    });
                }
            }
        }
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
        <div className="w-full max-w-5xl mx-auto p-6 md:p-12">
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

            {isComplete && (
                <div className="mt-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="inline-flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-full shadow-2xl hover:scale-105 transition-transform cursor-default">
                        <Sparkles className="text-yellow-400 w-6 h-6 animate-pulse" />
                        <span className="font-bold text-lg tracking-wide">All Pairs Matched!</span>
                    </div>
                </div>
            )}
        </div>
    );
};
