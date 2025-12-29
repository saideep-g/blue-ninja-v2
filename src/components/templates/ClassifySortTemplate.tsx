import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Shield, Sparkles } from 'lucide-react';
import { Question } from '../../types';

interface ClassifySortTemplateProps {
    question: Question;
    onAnswer: (result: any) => void;
    isSubmitting: boolean;
    readOnly?: boolean;
}

interface Item {
    id: string;
    content: string;
    bucketId: string; // The correct bucket
    currentBucketId?: string; // Where it is currently placed
}

interface Bucket {
    id: string;
    label: string;
    color?: string;
    icon?: string;
}

const COLORS = [
    { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', drop: 'bg-indigo-100' },
    { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', drop: 'bg-emerald-100' },
    { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', drop: 'bg-amber-100' },
    { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800', drop: 'bg-rose-100' },
];

export function ClassifySortTemplate({ question, onAnswer, isSubmitting, readOnly }: ClassifySortTemplateProps) {
    const [items, setItems] = useState<Item[]>([]);
    const [buckets, setBuckets] = useState<Bucket[]>([]);
    const [isComplete, setIsComplete] = useState(false);
    const [mistakes, setMistakes] = useState(0);
    const [showVictory, setShowVictory] = useState(false);

    // Initial Data Load
    useEffect(() => {
        // defined inside effect to avoid dependency warnings if we used a ref
        console.log('[ClassifySort] Full Question JSON:', JSON.stringify(question, null, 2));

        const config = (question.content?.interaction?.config || (question as any).interaction?.config || {});

        // Parse Buckets (Support 'bins' alias)
        const rawBuckets = config.buckets || config.bins || [];
        const parsedBuckets = rawBuckets.map((b: any, idx: number) => ({
            id: b.id,
            label: b.label || b.text || b.name,
            color: b.color,
            ...COLORS[idx % COLORS.length] // Assign theme
        }));

        // Parse Items (Support 'cards' alias)
        // Ideally items interact with buckets via ID.
        const rawItems = config.items || config.cards || [];
        console.log('[ClassifySort] Raw Items:', rawItems);

        // Parse Answer Key (Decoupled Logic)
        const rawAnswerKey = question.answerKey || (question.content as any)?.answer_key || (question as any).answer_key || {};
        console.log('[ClassifySort] Raw Answer Key:', rawAnswerKey);

        let answerMap: Record<string, string> = {};

        // Case 3: card_to_bin map (Found in user data)
        if (rawAnswerKey.card_to_bin) {
            console.log('[ClassifySort] Found card_to_bin map');
            Object.assign(answerMap, rawAnswerKey.card_to_bin);
        }
        // Case 1: Array of {item_id, bin_id}
        else if (rawAnswerKey.matches && Array.isArray(rawAnswerKey.matches)) {
            // ... (existing code)
            rawAnswerKey.matches.forEach((m: any) => {
                const iId = m.item_id || m.itemId || m.card_id;
                const bId = m.bin_id || m.binId || m.bucket_id;
                if (iId) answerMap[iId] = bId;
            });
        }
        // Case 2: Group Map { "BucketID": ["Item1", "Item2"] } (Inverted)
        else if (typeof rawAnswerKey === 'object') {
            Object.entries(rawAnswerKey).forEach(([k, v]) => {
                // If the value is an array, it's likely [ItemIDs] assigned to Bucket K
                if (Array.isArray(v)) {
                    v.forEach((itemId: any) => {
                        if (typeof itemId === 'string') answerMap[itemId] = k;
                    });
                }
                // If value is string, assume simple Map { "ItemID": "BucketID" }
                else if (typeof v === 'string') {
                    answerMap[k] = v;
                }
            });
        }

        const parsedItems = rawItems.map((i: any) => {
            // Priority: Item Property > Answer Key Map
            const correctBucketId = i.bucket_id || i.bucketId || i.binId || i.bin_id || i.correct_bin || i.target_id || answerMap[i.id];

            return {
                id: i.id,
                content: typeof i.content === 'object' ? i.content.text : (i.text || i.content),
                bucketId: correctBucketId
            };
        });

        // Shuffle Items
        const shuffled = [...parsedItems].sort(() => Math.random() - 0.5);

        setBuckets(parsedBuckets);
        setItems(shuffled);
        setMistakes(0);
        setIsComplete(false);
    }, [question.id]);

    // Handle Drag End
    const handleDragEnd = (event: any, info: any, item: Item) => {
        if (isComplete || readOnly) return;

        // Hide the dragged element momentarily so we can see what's underneath
        const draggedElement = event.target as HTMLElement;
        draggedElement.style.visibility = 'hidden'; // Hide to peak below

        const dropPoint = {
            x: event.clientX || info.point.x,
            y: event.clientY || info.point.y
        };

        const droppedElement = document.elementFromPoint(dropPoint.x, dropPoint.y);
        draggedElement.style.visibility = 'visible'; // Restore immediately

        const bucketEl = droppedElement?.closest('[data-bucket-id]');

        if (bucketEl) {
            const targetBucketId = bucketEl.getAttribute('data-bucket-id');
            if (targetBucketId) {
                attemptDrop(item, targetBucketId);
                return;
            }
        }

        // If we didn't hit a bucket, the visual snap-back via 'layoutId' or state re-render will handle it.
        // Framer motion 'dragSnapToOrigin' handles the physical return.
    };

    const attemptDrop = (item: Item, bucketId: string) => {
        // Normalize IDs for comparison (handle numbers vs strings)
        const itemIdStr = String(item.bucketId).trim();
        const targetIdStr = String(bucketId).trim();

        console.log(`[Drop] Item: "${item.content}" Expects: "${itemIdStr}" DroppedOn: "${targetIdStr}" Match? ${itemIdStr === targetIdStr}`);

        // Validation Logic
        if (itemIdStr === targetIdStr) {
            // Correct!
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, currentBucketId: bucketId } : i));
        } else {
            // Incorrect
            setMistakes(prev => prev + 1);
        }
    };

    // Completion Check
    useEffect(() => {
        const remaining = items.filter(i => !i.currentBucketId);
        if (items.length > 0 && remaining.length === 0 && !isComplete) {
            setIsComplete(true);
            setShowVictory(true); // Trigger Victory State FIRST
        }
    }, [items, isComplete]);

    // Handle Transition after Victory
    useEffect(() => {
        if (showVictory) {
            const timer = setTimeout(() => {
                onAnswer({
                    isCorrect: true,
                    mistakes,
                    isRecovered: mistakes > 0,
                    attempts: items.length + mistakes
                });
            }, 2000); // 2 Second Delay for "Victory Lap"
            return () => clearTimeout(timer);
        }
    }, [showVictory, mistakes, items.length, onAnswer]);

    // Derived Lists
    const unsortedItems = items.filter(i => !i.currentBucketId);

    return (
        <div className="w-full max-w-4xl mx-auto p-4 md:p-8 flex flex-col min-h-[500px]">

            {/* INSTRUCTIONS */}
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-800">
                    {typeof ((question as any).prompt) === 'object'
                        ? (question as any).prompt.text
                        : (question.content?.prompt?.text || (question as any).prompt || 'Sort the items')}
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                    Drag each item into the correct category below.
                </p>
            </div>

            {/* ERROR FEEDBACK */}
            <AnimatePresence>
                {mistakes > 0 && !isComplete && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mx-auto mb-4 px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-bold flex items-center gap-2"
                    >
                        <X size={14} /> {mistakes} incorrect placement{mistakes > 1 ? 's' : ''}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* UNSORTED PILE */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-[150px] mb-8 relative z-50">
                <AnimatePresence mode='popLayout'>
                    {!showVictory && unsortedItems.map(item => (
                        <motion.div
                            key={item.id}
                            layoutId={item.id}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            drag // Enable Free Drag
                            dragSnapToOrigin={true} // Snap back if not dropped successfully
                            dragElastic={0.1} // Slight elasticity feels nice
                            dragMomentum={false} // usage for 'drop' interactions often feels better without momentum
                            onDragEnd={(e, info) => handleDragEnd(e, info, item)}
                            whileHover={{ scale: 1.05, cursor: 'grab' }}
                            whileDrag={{ scale: 1.1, cursor: 'grabbing', zIndex: 100 }}
                            className="bg-white px-6 py-4 rounded-xl shadow-md border-2 border-slate-200 font-bold text-lg text-slate-700 m-2 select-none touch-none"
                        >
                            {item.content}
                        </motion.div>
                    ))}
                    {unsortedItems.length === 0 && !showVictory && !isComplete && (
                        <div className="text-slate-300 font-bold italic">All items placed!</div>
                    )}
                </AnimatePresence>

                {/* VICTORY OVERLAY */}
                <AnimatePresence>
                    {showVictory && (
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center z-50 pointer-events-none"
                        >
                            <div className="bg-emerald-500 text-white px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-2 transform">
                                <motion.div
                                    animate={{ rotate: 360, scale: [1, 1.4, 1] }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <Sparkles size={48} className="text-yellow-300" />
                                </motion.div>
                                <span className="font-black text-3xl tracking-tight">Excellent!</span>
                                <span className="text-emerald-100 font-medium">Sorting Complete</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* BUCKETS ROW */}
            <div className="grid grid-cols-2 gap-4 md:gap-8 mt-auto">
                {buckets.map((bucket, idx) => {
                    // Filter items in this bucket for visual confirmation
                    const bucketItems = items.filter(i => i.currentBucketId === bucket.id);

                    return (
                        <div
                            key={bucket.id}
                            data-bucket-id={bucket.id}
                            className={`
                                relative p-4 md:p-6 rounded-2xl border-2 transition-colors min-h-[200px] flex flex-col
                                ${COLORS[idx % COLORS.length].bg}
                                ${COLORS[idx % COLORS.length].border}
                            `}
                        >
                            {/* Bucket Label */}
                            <div className="text-center mb-4">
                                <h3 className={`font-black uppercase tracking-wider text-sm md:text-base ${COLORS[idx % COLORS.length].text}`}>
                                    {bucket.label}
                                </h3>
                            </div>

                            {/* Drop Zone Visual */}
                            <div className={`
                                flex-1 rounded-xl border-2 border-dashed border-white/50 bg-white/20 
                                flex flex-col items-center justify-start p-2 gap-2 overflow-hidden
                            `}>
                                <AnimatePresence>
                                    {bucketItems.map(item => (
                                        <motion.div
                                            key={item.id}
                                            layoutId={item.id} // Retain layout ID for smooth transition from top
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-white px-3 py-2 rounded-lg shadow-sm w-full text-center text-sm font-bold text-slate-700 flex items-center justify-between group"
                                        >
                                            <span>{item.content}</span>
                                            <Check size={14} className="text-green-500" />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                {bucketItems.length === 0 && (
                                    <div className="mt-8 text-slate-400/50">Drop here</div>
                                )}
                            </div>

                        </div>
                    );
                })}
            </div>
        </div>
    );
}
