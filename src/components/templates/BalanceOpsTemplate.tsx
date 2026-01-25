import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, CheckCircle2, Lightbulb, Loader2, ArrowRightCircle } from 'lucide-react';
import { BalanceOpsQuestion } from '../../types/questions';
import { useProfileStore } from '../../store/profile';
import { getRandomPraise } from '../../utils/feedbackUtils';

/**
 * BalanceOps Interaction (CBSE Ch 4 Equations)
 * Adapted for Blue Ninja V2
 */

interface TemplateProps {
    question: BalanceOpsQuestion;
    onAnswer: (result: any) => void;
    isSubmitting: boolean;
    readOnly: boolean;
}

export const BalanceOpsTemplate: React.FC<TemplateProps> = ({ question, onAnswer, isSubmitting, readOnly }) => {
    const { autoAdvance } = useProfileStore();

    // Robust Config Extraction
    const rawConfig = question.interaction?.config ?? (question as any).content?.interaction?.config;
    const config = rawConfig;

    // State
    const [leftCoefficient, setLeftCoefficient] = useState(1);
    const [leftConstant, setLeftConstant] = useState(0);
    const [currentRight, setCurrentRight] = useState(0);
    const [variableName, setVariableName] = useState('x');
    const [dynamicOps, setDynamicOps] = useState<any[]>([]);

    const [history, setHistory] = useState<{ op_id: string; label: string }[]>([]);
    const [isolated, setIsolated] = useState(false);

    // Feedback & Transition State
    const [submitted, setSubmitted] = useState(false);
    const [feedback, setFeedback] = useState<{ isCorrect: boolean; feedback: string } | null>(null);
    const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Helper to round for display (strips small float errors)
    const formatNumber = (num: number) => {
        if (Math.abs(num) < 0.0001) return 0; // Clean absolute zero
        if (Math.abs(Math.round(num) - num) < 0.0001) return Math.round(num); // Clean integers
        return parseFloat(num.toFixed(2)); // Max 2 decimals for others
    };

    // Parsing Helper
    const parseLatexToState = (latex: string) => {
        try {
            const [leftStr, rightStr] = latex.split('=').map(s => s.trim());
            const rightVal = parseFloat(rightStr);
            let a = 1, b = 0, v = 'x';

            const matchVar = leftStr.match(/[a-z]/i);
            if (matchVar) v = matchVar[0];

            if (leftStr.includes('/')) {
                const parts = leftStr.split(/([+\-])/);
                const fracPart = parts[0].trim();
                if (fracPart.includes('/')) {
                    const denom = parseFloat(fracPart.split('/')[1]);
                    a = 1 / denom;
                }
                if (parts.length > 2) {
                    const sign = parts[1] === '-' ? -1 : 1;
                    const val = parseFloat(parts[2]);
                    b = sign * val;
                }
            } else if (leftStr.includes('(')) {
                const parts = leftStr.match(/(-?[\d\.]*)\s*\((.*)\)/);
                if (parts) {
                    const multiplier = parts[1] === '-' ? -1 : (parts[1] ? parseFloat(parts[1]) : 1);
                    const inside = parts[2];
                    const innerParts = inside.split(/([+\-])/);
                    let innerConst = 0;
                    if (innerParts.length > 2) {
                        const sign = innerParts[1] === '-' ? -1 : 1;
                        const val = parseFloat(innerParts[2]);
                        innerConst = sign * val;
                    }
                    a = multiplier;
                    b = multiplier * innerConst;
                }
            } else {
                const idx = leftStr.indexOf(v);
                if (idx !== -1) {
                    const coeffStr = leftStr.substring(0, idx).trim();
                    if (coeffStr === '' || coeffStr === '+') a = 1;
                    else if (coeffStr === '-') a = -1;
                    else a = parseFloat(coeffStr);

                    const remainder = leftStr.substring(idx + 1).trim();
                    if (remainder) {
                        const clean = remainder.replace(/\s/g, '');
                        b = parseFloat(clean);
                    }
                }
            }
            return { a, b, right: rightVal, v };
        } catch (e) {
            console.error("Parse error", e);
            return null;
        }
    };

    const generateOps = (a: number, b: number) => {
        const ops = [];
        if (Math.abs(b) > 0.0001) {
            const val = Math.abs(b);
            ops.push({ op_id: 'SUBTRACT', label: `Subtract ${val}`, value: val });
            ops.push({ op_id: 'ADD', label: `Add ${val}`, value: val });
        }
        if (Math.abs(a - 1) > 0.0001) {
            if (Math.abs(a) >= 1) {
                ops.push({ op_id: 'DIVIDE', label: `Divide by ${a}`, value: a });
                ops.push({ op_id: 'MULTIPLY', label: `Multiply by ${a}`, value: a });
            } else if (Math.abs(a) > 0.0001) {
                const inv = Math.round(1 / a);
                ops.push({ op_id: 'MULTIPLY', label: `Multiply by ${inv}`, value: inv });
                ops.push({ op_id: 'DIVIDE', label: `Divide by ${inv}`, value: inv });
            }
        }
        return ops.sort(() => Math.random() - 0.5);
    };

    // Init Effect
    useEffect(() => {
        if (!config) return;
        setHistory([]);
        setIsolated(false);
        setSubmitted(false);
        setFeedback(null);
        setIsAutoAdvancing(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        if (config.equation?.left) {
            setLeftCoefficient(config.equation.left.a ?? 1);
            setLeftConstant(config.equation.left.b ?? 0);
            setCurrentRight(config.equation.right?.value ?? 0);
            setVariableName(config.equation.left.variable ?? 'x');
            if (config.operations) setDynamicOps(config.operations);
        } else if (config.equation_latex) {
            const parsed = parseLatexToState(config.equation_latex);
            if (parsed) {
                setLeftCoefficient(parsed.a);
                setLeftConstant(parsed.b);
                setCurrentRight(parsed.right);
                setVariableName(parsed.v);
                setDynamicOps(generateOps(parsed.a, parsed.b));
            } else {
                setLeftCoefficient(1); setLeftConstant(0); setCurrentRight(0);
            }
        }

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [question.id]);

    // Apply Op Logic
    const applyOp = (op: any) => {
        if (isSubmitting || readOnly || isolated || submitted) return;

        const newHistory = [...history, op];
        setHistory(newHistory);

        let nextA = leftCoefficient;
        let nextB = leftConstant;
        let nextRight = currentRight;
        const val = op.value;

        if (op.op_id === 'SUBTRACT') {
            nextB -= val;
            nextRight -= val;
        } else if (op.op_id === 'ADD') {
            nextB += val;
            nextRight += val;
        } else if (op.op_id === 'DIVIDE') {
            nextA /= val;
            nextB /= val;
            nextRight /= val;
        } else if (op.op_id === 'MULTIPLY') {
            nextA *= val;
            nextB *= val;
            nextRight *= val;
        }

        setLeftCoefficient(nextA);
        setLeftConstant(nextB);
        setCurrentRight(nextRight);

        // Check if isolated: a approx 1 AND b approx 0
        const isAOne = Math.abs(nextA - 1) < 0.001;
        const isBZero = Math.abs(nextB) < 0.001;

        if (isAOne && isBZero) {
            setIsolated(true);
        }
    };

    const formatLeftLabel = () => {
        const cleanA = formatNumber(leftCoefficient);
        const cleanB = formatNumber(leftConstant);

        if (cleanA === 1 && cleanB === 0) return variableName;

        const varPart = cleanA === 1
            ? variableName
            : `${cleanA}${variableName}`;

        if (cleanB === 0) return varPart;

        const sign = cleanB > 0 ? "+" : "-";
        return `${varPart} ${sign} ${Math.abs(cleanB)}`;
    };

    const handleSubmit = () => {
        if (submitted) return;

        // Determine correctness
        const isCorrect = isolated; // If they isolated variable, they solved it.
        const praise = getRandomPraise();
        const feedbackText = isCorrect ? praise : "Try again!";

        setSubmitted(true);
        setFeedback({ isCorrect, feedback: feedbackText });

        const resultData = {
            isCorrect,
            value: currentRight,
            history: history,
            stepsTaken: history.length
        };

        // Auto Advance Logic
        if (isCorrect && autoAdvance !== false) {
            setIsAutoAdvancing(true);
            timeoutRef.current = setTimeout(() => {
                onAnswer(resultData);
            }, 2000);
        } else if (!isCorrect) {
            // If incorrect, maybe don't auto advance, just call onAnswer immediately or let them retry?
            // But here 'isolated' is the only way to submit, so it IS correct.
            onAnswer(resultData);
        }
    };

    // Quick continue if auto-advance is slow or user is impatient
    const handleContinue = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        onAnswer({
            isCorrect: isolated,
            value: currentRight,
            history: history,
            stepsTaken: history.length
        });
    };

    // Safe Prompt Extraction
    const getSafePrompt = () => {
        const qContent = question.content;
        if (typeof qContent === 'string') return qContent;
        if (typeof qContent === 'object' && qContent !== null) {
            if (typeof (qContent as any).prompt === 'string') return (qContent as any).prompt;
            if (typeof (qContent as any).prompt?.text === 'string') return (qContent as any).prompt.text;
        }
        return "Solve for " + variableName;
    };

    if (!config) return <div className="p-4 text-red-500">Invalid Configuration</div>;

    return (
        <div className="flex flex-col items-center py-4 w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-lg font-bold text-slate-700 mb-8 self-start">
                {getSafePrompt()}
            </h3>

            <div className="flex items-center gap-4 md:gap-12 mb-16 w-full justify-center flex-wrap">
                <div className="flex flex-col items-center">
                    <div className={`p-4 md:p-8 border-4 rounded-[2rem] md:rounded-[2.5rem] text-xl md:text-3xl font-black min-w-[140px] md:min-w-[220px] text-center shadow-inner transition-all duration-300
                         ${feedback?.isCorrect ? 'bg-green-50 border-green-200 text-green-700' : 'bg-indigo-50 border-indigo-100 text-indigo-900'}
                    `}>
                        {formatLeftLabel()}
                    </div>
                    <div className="w-20 md:w-40 h-2 md:h-3 bg-slate-200 rounded-full mt-4"></div>
                </div>

                <div className="text-3xl md:text-5xl font-black text-slate-200 select-none">=</div>

                <div className="flex flex-col items-center">
                    <div className={`p-4 md:p-8 border-4 rounded-[2rem] md:rounded-[2.5rem] text-xl md:text-3xl font-black min-w-[100px] md:min-w-[160px] text-center shadow-inner transition-all duration-300
                        ${feedback?.isCorrect ? 'bg-green-50 border-green-200 text-green-700' : 'bg-indigo-50 border-indigo-100 text-indigo-900'}
                    `}>
                        {formatNumber(currentRight)}
                    </div>
                    <div className="w-20 md:w-40 h-2 md:h-3 bg-slate-200 rounded-full mt-4"></div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mb-8">
                {dynamicOps.map((op, idx) => (
                    <button
                        key={idx}
                        onClick={() => applyOp(op)}
                        disabled={readOnly || isSubmitting || isolated || submitted}
                        className="flex items-center justify-center p-6 bg-white border-2 border-slate-100 rounded-3xl font-black text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {op.label} <span className="ml-2 text-[10px] text-slate-400 uppercase tracking-widest font-bold">Both Sides</span>
                    </button>
                ))}
            </div>

            {history.length > 0 && (
                <div className="w-full flex flex-col items-center px-6 gap-4">
                    {/* History chips */}
                    {!submitted && (
                        <div className="flex gap-2 flex-wrap justify-center w-full mb-4">
                            {history.map((h, i) => (
                                <span key={i} className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-400 uppercase">
                                    {h.label}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-4 w-full justify-center">
                        {!submitted && (
                            <button
                                onClick={() => {
                                    setIsolated(false);
                                    setHistory([]);
                                    if (config.equation?.left) {
                                        setLeftCoefficient(config.equation.left.a ?? 1);
                                        setLeftConstant(config.equation.left.b ?? 0);
                                        setCurrentRight(config.equation.right?.value ?? 0);
                                    } else if (config.equation_latex) {
                                        const parsed = parseLatexToState(config.equation_latex);
                                        if (parsed) {
                                            setLeftCoefficient(parsed.a);
                                            setLeftConstant(parsed.b);
                                            setCurrentRight(parsed.right);
                                        }
                                    }
                                }}
                                disabled={readOnly || isSubmitting}
                                className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase hover:text-rose-500 transition-colors px-4 py-3 border border-slate-200 rounded-xl"
                            >
                                <RotateCcw size={16} /> Reset
                            </button>
                        )}

                        {isolated && !submitted && !readOnly && !isSubmitting && (
                            <button
                                onClick={handleSubmit}
                                className="flex items-center gap-2 bg-green-500 text-white font-bold text-lg uppercase hover:bg-green-600 transition-colors px-12 py-3 rounded-xl shadow-md animate-bounce"
                            >
                                Submit Answer
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ========== FEEDBACK & NEXT SECTION ========== */}
            {submitted && feedback && (
                <div className="w-full max-w-2xl space-y-4 animate-in slide-in-from-bottom-4 duration-300 mt-4">
                    <div
                        className={`p-6 rounded-2xl flex gap-4 items-start ${feedback.isCorrect
                            ? 'bg-green-50 border-2 border-green-200'
                            : 'bg-red-50 border-2 border-red-200'
                            }`}
                    >
                        <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${feedback.isCorrect ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'}`}>
                            {feedback.isCorrect ? <CheckCircle2 className="w-6 h-6" /> : <Lightbulb className="w-6 h-6" />}
                        </div>

                        <div className="flex-1 space-y-1 pt-1">
                            <h4 className={`font-bold text-lg ${feedback.isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                                {feedback.isCorrect ? (
                                    <span className="flex items-center gap-2">
                                        {feedback.feedback}
                                        {isAutoAdvancing && <Loader2 className="w-4 h-4 animate-spin opacity-50" />}
                                    </span>
                                ) : 'Not quite right'}
                            </h4>

                            {/* Progress Bar for Auto Advance */}
                            {isAutoAdvancing && (
                                <div className="w-full h-1 bg-green-200 mt-3 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 animate-[progress_2s_linear_forward]" style={{ width: '100%' }}></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CONTINUE BUTTON */}
                    <button
                        autoFocus
                        onClick={handleContinue}
                        className={`w-full py-4 rounded-xl font-extrabold text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${feedback.isCorrect
                            ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                            }`}
                    >
                        {feedback.isCorrect ? 'Finish & Next Question' : 'Got it, Next Question'} <ArrowRightCircle size={24} />
                    </button>
                </div>
            )}
        </div>
    );
};
