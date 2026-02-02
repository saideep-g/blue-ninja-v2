import React, { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, Monitor, Smartphone, Sparkles, Brain, Eye, EyeOff, LayoutPanelLeft, ArrowRight, ArrowLeft, Play } from 'lucide-react';
import { SimplifiedQuestion } from '../../../types/bundle';
import { TemplateRouter } from '../../templates/TemplateRouter';
import { aiEvaluationService } from '../../../services/aiEvaluationService';

interface BundlePreviewSimulatorProps {
    questions: SimplifiedQuestion[];
    initialIndex: number;
    onClose: () => void;
}

type Theme = 'era' | 'mobile';

export const BundlePreviewSimulator: React.FC<BundlePreviewSimulatorProps> = ({
    questions,
    initialIndex,
    onClose
}) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [theme, setTheme] = useState<Theme>('era');

    // AI Debugging & Dry Run State
    const [studentSample, setStudentSample] = useState('');
    const [aiResult, setAiResult] = useState<any | null>(null);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [showSystemLogic, setShowSystemLogic] = useState(false);
    const [showDebugSidebar, setShowDebugSidebar] = useState(true);

    const currentQuestion = questions[currentIndex];

    // Reset AI result when question changes
    useEffect(() => {
        setAiResult(null);
        setStudentSample('');
        setIsEvaluating(false);
    }, [currentIndex]);

    // Navigation Logic
    const nextQuestion = useCallback(() => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    }, [currentIndex, questions.length]);

    const prevQuestion = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    }, [currentIndex]);

    // Keyboard Listeners
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') nextQuestion();
            if (e.key === 'ArrowLeft') prevQuestion();
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [nextQuestion, prevQuestion, onClose]);

    const handleRunDryRun = async () => {
        if (!studentSample.trim()) return alert("Enter a sample answer to test.");
        setIsEvaluating(true);
        setAiResult(null);

        try {
            // Using a dummy user id for dry run to avoid polluting production metrics
            // aiEvaluationService uses "ADMIN_DRY_RUN" as student name automatically in Section 10 docs
            const response = await aiEvaluationService.evaluateShortAnswer(
                'admin-dry-run-uid',
                'ADMIN_DRY_RUN',
                {
                    ...currentQuestion,
                    id: currentQuestion.id || 'dry-run',
                    type: currentQuestion.template_id || 'SHORT_ANSWER',
                    question_text: currentQuestion.question,
                    model_answer: currentQuestion.model_answer,
                    evaluation_criteria: currentQuestion.evaluation_criteria || [],
                } as any,
                studentSample
            );
            setAiResult(response);
        } catch (e: any) {
            console.error("Dry run failed:", e);
            alert("Dry run evaluation failed. Check console.");
        } finally {
            setIsEvaluating(false);
        }
    };

    // Theme styles
    const themeStyles = {
        era: {
            backdrop: 'bg-slate-900',
            wrapper: 'bg-slate-900',
            pill: 'bg-indigo-600 text-white',
            inactivePill: 'bg-slate-800 text-slate-400 hover:text-white',
            accent: 'text-indigo-400',
            container: 'era-theme-wrapper'
        },
        mobile: {
            backdrop: 'bg-slate-100',
            wrapper: 'bg-white',
            pill: 'bg-purple-600 text-white',
            inactivePill: 'bg-slate-200 text-slate-500 hover:text-slate-700',
            accent: 'text-purple-600',
            container: 'mobile-theme-wrapper'
        }
    };

    const s = themeStyles[theme];

    if (!currentQuestion) return null;

    const isShortAnswer = currentQuestion.template_id === 'SHORT_ANSWER';

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col ${s.backdrop} animate-in fade-in duration-300 overflow-hidden`}>
            {/* Header */}
            <div className={`w-full flex justify-between items-center px-4 py-3 border-b transition-all ${theme === 'era' ? 'bg-slate-900/50 border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-6">
                    <div className="flex bg-slate-800/50 p-0.5 rounded-lg border border-white/5 backdrop-blur-md">
                        <button
                            onClick={() => setTheme('era')}
                            className={`px-4 py-1 rounded-md text-[10px] font-black transition-all ${theme === 'era' ? s.pill : s.inactivePill}`}
                        >
                            ERA
                        </button>
                        <button
                            onClick={() => setTheme('mobile')}
                            className={`px-4 py-1 rounded-md text-[10px] font-black transition-all ${theme === 'mobile' ? themeStyles.mobile.pill : themeStyles.mobile.inactivePill}`}
                        >
                            MOBILE
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={prevQuestion} disabled={currentIndex === 0} className="text-slate-500 hover:text-white disabled:opacity-30"><ArrowLeft size={18} /></button>
                        <div className={`text-xs font-black transition-all ${theme === 'era' ? 'text-white/40' : 'text-slate-400'}`}>
                            Q: <span className={theme === 'era' ? 'text-white font-mono' : 'text-slate-900 font-mono'}>{currentIndex + 1} / {questions.length}</span>
                        </div>
                        <button onClick={nextQuestion} disabled={currentIndex === questions.length - 1} className="text-slate-500 hover:text-white disabled:opacity-30"><ArrowRight size={18} /></button>
                    </div>

                    {isShortAnswer && (
                        <button
                            onClick={() => setShowDebugSidebar(!showDebugSidebar)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${showDebugSidebar ? 'bg-amber-500 text-white shadow-lg shadow-amber-900/20' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                        >
                            <Sparkles size={12} /> {showDebugSidebar ? 'Close Dry Run' : 'Test AI Evaluation'}
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-all ${theme === 'era' ? 'text-white/40 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`}
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Main Content Areas */}
            <div className="flex-1 flex overflow-hidden">
                {/* Simulator Area */}
                <div className="flex-1 flex justify-center overflow-hidden relative">
                    <div className={`w-full h-full flex flex-col transition-all duration-500 ${theme === 'mobile' ? 'max-w-md my-4 rounded-[3.5rem] border-[12px] border-slate-800 shadow-2xl relative overflow-hidden bg-slate-950' : 'max-w-none h-full'}`}>
                        {theme === 'mobile' && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-slate-800 rounded-b-3xl z-20 flex items-center justify-center p-1">
                                <div className="w-12 h-1 bg-slate-700 rounded-full" />
                            </div>
                        )}
                        <div className={`flex-1 overflow-y-auto custom-scrollbar flex flex-col transition-all duration-500 ${s.wrapper} ${s.container}`}>
                            <div className={`mx-auto w-full transition-all duration-500 ${theme === 'mobile' ? 'pt-10 p-6' : 'max-w-5xl py-8 px-8'}`}>
                                <TemplateRouter
                                    question={{
                                        ...currentQuestion,
                                        type: currentQuestion.template_id || 'MCQ_SIMPLIFIED'
                                    } as any}
                                    onSubmit={() => nextQuestion()}
                                    isPreview={true}
                                    readOnly={false}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dry Run / Debug Sidebar */}
                {isShortAnswer && showDebugSidebar && (
                    <div className="w-[450px] border-l border-white/5 bg-slate-900/50 backdrop-blur-3xl flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-950/40">
                            <div>
                                <h3 className="text-sm font-black text-amber-500 flex items-center gap-2 uppercase tracking-[0.2em]">
                                    <Sparkles size={16} /> Dry Run Validator
                                </h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Test Rubrics against AI (Gemini 3 Flash)</p>
                            </div>
                            <button
                                onClick={() => setShowSystemLogic(!showSystemLogic)}
                                className={`p-2 rounded-xl transition-all ${showSystemLogic ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                title="View System Instructions"
                            >
                                {showSystemLogic ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {/* System Logic Injector */}
                            {showSystemLogic && (
                                <div className="space-y-3 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                        <Brain size={12} /> System Instruction Context
                                    </h4>
                                    <div className="text-[10px] font-mono text-slate-400 leading-relaxed bg-slate-950/50 p-3 rounded-lg border border-white/5">
                                        "You are a helpful teaching assistant helping a student in Grade 2... You must evaluate based ON the provided rubric... Return response in valid JSON: &#123; results: [&#123; criterion, passed, feedback &#125;], score, summary &#125;"
                                    </div>
                                    <p className="text-[9px] text-slate-500 italic">This instruction is concatenated with your specific Rubric below.</p>
                                </div>
                            )}

                            {/* Diff-View / Model Answer Side-by-Side */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <LayoutPanelLeft size={12} /> AI Comparison View
                                </h4>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-2">
                                        <div className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter px-2">Model Answer (Goal)</div>
                                        <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-[11px] text-emerald-100 italic min-h-[100px] leading-relaxed">
                                            {currentQuestion.model_answer || 'No model answer provided.'}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-[9px] font-black text-amber-500 uppercase tracking-tighter px-2">Student Input (Mock)</div>
                                        <textarea
                                            className="w-full p-3 bg-slate-950/50 border border-white/10 rounded-xl text-[11px] text-white focus:ring-1 focus:ring-amber-500 outline-none min-h-[100px] leading-relaxed resize-none transition-all focus:bg-slate-950"
                                            placeholder="Type a sample student answer here..."
                                            value={studentSample}
                                            onChange={(e) => setStudentSample(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Rubric View */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Rubric (Numbering IDs)</h4>
                                <div className="space-y-2">
                                    {(currentQuestion.evaluation_criteria || []).map((criterion, idx) => (
                                        <div key={idx} className="flex gap-3 p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-white/10 transition-all">
                                            <div className="w-5 h-5 bg-slate-800 rounded-md flex items-center justify-center text-[10px] font-mono text-slate-400 group-hover:bg-slate-700 transition-colors">
                                                {idx + 1}
                                            </div>
                                            <div className="text-[11px] text-slate-300 leading-snug">{criterion}</div>
                                        </div>
                                    ))}
                                    {(currentQuestion.evaluation_criteria || []).length === 0 && (
                                        <div className="p-4 border-2 border-dashed border-white/5 rounded-xl text-center text-slate-500 text-xs italic">
                                            No criteria defined yet. AI will default to general accuracy.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Evaluation Results */}
                            {aiResult && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Evaluation Result</h4>
                                        <div className="text-[10px] font-black bg-emerald-500 text-white px-2 py-1 rounded-md">SCORE: {aiResult.score} / {currentQuestion.evaluation_criteria?.length || aiResult.results?.length || 3}</div>
                                    </div>

                                    <div className="space-y-2">
                                        {aiResult.results?.map((res: any, idx: number) => (
                                            <div key={idx} className={`p-3 rounded-xl border flex gap-3 transition-all ${res.passed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20 opacity-80'}`}>
                                                <div className={`mt-0.5 ${res.passed ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    <CheckCircle size={14} />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[11px] font-bold text-white leading-tight">{res.criterion}</p>
                                                    <p className="text-[10px] text-slate-400 italic">"{res.feedback}"</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                                        <p className="text-[11px] text-indigo-100 font-medium italic leading-relaxed">
                                            <Sparkles className="inline mr-1 text-indigo-400" size={12} />
                                            "{aiResult.summary}"
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Evaluation Action */}
                            <div className="pt-4 border-t border-white/5 sticky bottom-0 bg-slate-900 py-4 shadow-[0_-10px_20px_rgba(15,23,42,0.8)]">
                                <button
                                    onClick={handleRunDryRun}
                                    disabled={isEvaluating || !studentSample.trim()}
                                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-amber-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                                >
                                    {isEvaluating ? (
                                        <>
                                            <Monitor className="animate-pulse" size={16} /> Thinking...
                                        </>
                                    ) : (
                                        <>
                                            <Play size={14} fill="white" /> Execute Dry Run
                                        </>
                                    )}
                                </button>
                                <p className="text-[9px] text-center text-slate-500 mt-2 font-bold opacity-60">Uses {aiResult ? 'cached billing' : 'Gemini 3 Flash'} for real-time validation.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Subtle Progress Bar */}
            <div className="h-1 w-full bg-slate-800 flex relative overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 relative z-10 ${theme === 'era' ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-purple-500'}`}
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .mobile-theme-wrapper {
                    background-color: #0f172a !important;
                }
                .mobile-theme-wrapper .qlms-renderer-host {
                    color: white !important;
                }
                .era-theme-wrapper .qlms-renderer-host {
                    color: white !important;
                }
                .era-theme-wrapper {
                    background-color: transparent !important;
                }
            `}} />
        </div>
    );
};
