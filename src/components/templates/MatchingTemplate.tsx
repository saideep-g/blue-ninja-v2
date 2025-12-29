import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Check, X, Link as LinkIcon, RefreshCw, ArrowRight } from 'lucide-react';

interface MatchingTemplateProps {
    question: any;
    onAnswer: (result: any) => void;
    isSubmitting?: boolean;
    readOnly?: boolean;
}

interface MatchItem {
    id: string;
    content: string | React.ReactNode;
    type: 'text' | 'image' | 'latex';
    latex?: string;
    originalIndex?: number; // Used to verifying matching
}

interface Connection {
    leftId: string;
    rightId: string;
    status: 'correct' | 'incorrect' | 'pending';
}

export const MatchingTemplate: React.FC<MatchingTemplateProps> = ({
    question,
    onAnswer,
    isSubmitting = false,
    readOnly = false
}) => {
    const [leftItems, setLeftItems] = useState<MatchItem[]>([]);
    const [rightItems, setRightItems] = useState<MatchItem[]>([]);

    const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [isComplete, setIsComplete] = useState(false);

    const [containerHeight, setContainerHeight] = useState(600);
    const containerRef = useRef<HTMLDivElement>(null);

    // -- Initialization --
    useEffect(() => {
        if (!question) return;

        // Normalizing Data: Support 'pairs' array or 'left/right' arrays
        // Defaulting to a robust "Pairs" structure if available, or splitting logic
        let lItems: MatchItem[] = [];
        let rItems: MatchItem[] = [];

        const rawParis = question.content?.pairs || question.pairs || [];

        if (rawParis.length > 0) {
            // Structure: [{ left: "...", right: "..." }, ...]
            lItems = rawParis.map((p: any, idx: number) => ({
                id: `left-${idx}`,
                content: p.left,
                type: 'text', // Simple detection could go here (contains $ -> latex)
                originalIndex: idx
            }));

            rItems = rawParis.map((p: any, idx: number) => ({
                id: `right-${idx}`,
                content: p.right,
                type: 'text',
                originalIndex: idx
            }));
        }
        // Handle V3 explicit lists if configured that way
        else if (question.content?.left_items && question.content?.right_items) {
            // ... existing logic would go here
        }

        // Shuffle Right Items
        // Fisher-Yates shuffle
        const shuffledRight = [...rItems];
        for (let i = shuffledRight.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledRight[i], shuffledRight[j]] = [shuffledRight[j], shuffledRight[i]];
        }

        setLeftItems(lItems);
        setRightItems(shuffledRight);
        setConnections([]);
        setIsComplete(false);

    }, [question]);

    // -- Interaction Handlers --

    const handleLeftClick = (id: string) => {
        if (readOnly || isComplete) return;
        // If already matched, ignore
        if (connections.some(c => c.leftId === id)) return;

        setSelectedLeft(id === selectedLeft ? null : id);
    };

    const handleRightClick = (rightId: string) => {
        if (readOnly || isComplete) return;
        if (!selectedLeft) return; // Must select left first (or we could allow right-first, but left-first is simpler teaching)

        // If right already matched, ignore
        if (connections.some(c => c.rightId === rightId)) return;

        // Attempt Match
        const leftItem = leftItems.find(i => i.id === selectedLeft);
        const rightItem = rightItems.find(i => i.id === rightId);

        if (leftItem && rightItem) {
            const isCorrect = leftItem.originalIndex === rightItem.originalIndex;

            const newConnection: Connection = {
                leftId: selectedLeft,
                rightId: rightId,
                status: isCorrect ? 'correct' : 'incorrect'
            };

            const newConnections = [...connections, newConnection];
            setConnections(newConnections);
            setSelectedLeft(null);

            // Auto-Check logic:
            // If wrong, remove after delay? Or keep red?
            // Blue Ninja philosophy: "Short feedback loops". 
            // We'll keep it red for a moment then clear it so they can retry.
            if (!isCorrect) {
                setTimeout(() => {
                    setConnections(prev => prev.filter(c => c.leftId !== newConnection.leftId));
                }, 1000);
            } else {
                // Check Completion
                const correctCount = newConnections.filter(c => c.status === 'correct').length;
                if (correctCount === leftItems.length) {
                    setIsComplete(true);
                    onAnswer({
                        isCorrect: true,
                        matches: newConnections,
                        // Telemetry
                        metrics: {
                            attempts: newConnections.length // rough proxy
                        }
                    });
                }
            }
        }
    };

    // Helper to get connection status for a specific item
    const getItemStatus = (id: string, side: 'left' | 'right') => {
        const conn = connections.find(c => side === 'left' ? c.leftId === id : c.rightId === id);
        if (conn) return conn.status;
        if (side === 'left' && selectedLeft === id) return 'selected';
        return 'default';
    };

    return (
        <div className="w-full max-w-5xl mx-auto p-4 md:p-8" ref={containerRef}>
            {/* Title / Prompt */}
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-6 text-center">
                {question.content?.prompt?.text || question.prompt || "Match the pairs"}
            </h2>

            <div className="flex flex-row justify-between relative gap-8 md:gap-16">

                {/* Left Column */}
                <div className="flex-1 space-y-4 md:space-y-6">
                    {leftItems.map(item => {
                        const status = getItemStatus(item.id, 'left');
                        return (
                            <div
                                key={item.id}
                                onClick={() => handleLeftClick(item.id)}
                                className={`
                            relative min-h-[80px] md:min-h-[100px] p-4 md:p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex items-center justify-center text-center shadow-sm select-none
                            ${status === 'default' ? 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md' : ''}
                            ${status === 'selected' ? 'bg-blue-50 border-blue-500 shadow-blue-200 shadow-lg scale-105 z-10' : ''}
                            ${status === 'correct' ? 'bg-emerald-50 border-emerald-500 opacity-80' : ''}
                            ${status === 'incorrect' ? 'bg-red-50 border-red-500 animate-shake' : ''}
                        `}
                            >
                                {/* Connection Dot (Right side of left card) */}
                                <div className={`absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center z-20 bg-white
                             ${status === 'selected' ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300'}
                             ${status === 'correct' ? 'border-emerald-500 bg-emerald-500 text-white' : ''}
                        `}>
                                    {status === 'correct' && <Check size={14} strokeWidth={4} />}
                                    {status === 'selected' && <ArrowRight size={14} strokeWidth={3} />}
                                </div>

                                <span className="text-lg md:text-xl font-medium text-slate-700 pointer-events-none">
                                    {item.content}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* SVG Connector Layer (Optional V2, for now we rely on the Dots aligning visually in the center gap) */}
                {/* A simple central line dashed could be cute */}
                <div className="w-0 border-l-2 border-dashed border-slate-200 hidden md:block opacity-50 absolute left-1/2 top-0 bottom-0 -translate-x-1/2 -z-10"></div>


                {/* Right Column */}
                <div className="flex-1 space-y-4 md:space-y-6">
                    {rightItems.map(item => {
                        const status = getItemStatus(item.id, 'right');
                        const isMatchable = selectedLeft !== null && !connections.some(c => c.rightId === item.id);

                        return (
                            <div
                                key={item.id}
                                onClick={() => handleRightClick(item.id)}
                                className={`
                            relative min-h-[80px] md:min-h-[100px] p-4 md:p-6 rounded-xl border-2 transition-all duration-200 flex items-center justify-center text-center shadow-sm select-none
                            ${status === 'default' ? 'bg-white border-slate-200' : ''}
                            ${isMatchable && status === 'default' ? 'cursor-pointer hover:border-blue-400 hover:bg-blue-50 hover:scale-[1.02]' : ''}
                            ${status === 'correct' ? 'bg-emerald-50 border-emerald-500 opacity-80' : ''}
                            ${status === 'incorrect' ? 'bg-red-50 border-red-500 animate-shake' : ''}
                        `}
                            >
                                {/* Connection Dot (Left side of right card) */}
                                <div className={`absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center z-20 bg-white
                             ${isMatchable ? 'border-blue-300' : 'border-slate-300'}
                             ${status === 'correct' ? 'border-emerald-500 bg-emerald-500 text-white' : ''}
                        `}>
                                    {status === 'correct' && <Check size={14} strokeWidth={4} />}
                                </div>

                                <span className="text-lg md:text-xl font-medium text-slate-700 pointer-events-none">
                                    {item.content}
                                </span>
                            </div>
                        );
                    })}
                </div>

            </div>

            {/* Footer / Status */}
            <div className="mt-8 text-center">
                {isComplete ? (
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-100 text-emerald-700 rounded-full font-bold animate-bounce">
                        <Check size={20} /> All Matched! Well done!
                    </div>
                ) : (
                    <p className="text-slate-400 text-sm">Tap a left item, then tap its match.</p>
                )}
            </div>
        </div>
    );
};
