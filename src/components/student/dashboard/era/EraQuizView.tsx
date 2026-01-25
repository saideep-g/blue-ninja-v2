import React, { forwardRef, useImperativeHandle } from 'react';
import { X } from 'lucide-react';
import { TemplateRouter } from '../../../templates/TemplateRouter';
import { AlertCircle, LogOut, Play } from 'lucide-react';
import { Question } from '../../../../types/models';

interface EraQuizViewProps {
    questions: Question[];
    currentQuestionIndex: number;
    onAnswer: (result: any) => void;
    onClose: () => void;
}

export interface EraQuizViewHandle {
    triggerExitConfirmation: () => void;
}

export const EraQuizView = forwardRef<EraQuizViewHandle, EraQuizViewProps>(({
    questions,
    currentQuestionIndex,
    onAnswer,
    onClose
}, ref) => {
    const [seconds, setSeconds] = React.useState(0);
    const [showExitConfirm, setShowExitConfirm] = React.useState(false);

    useImperativeHandle(ref, () => ({
        triggerExitConfirmation: () => {
            setShowExitConfirm(true);
        }
    }));

    React.useEffect(() => {
        const timer = setInterval(() => setSeconds(s => s + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (totalSeconds: number) => {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleAttemptClose = () => {
        setShowExitConfirm(true);
    };

    const confirmExit = () => {
        onClose();
    };

    return (
        <div className="max-w-3xl mx-auto py-2 animate-in fade-in zoom-in duration-500 relative">
            <div className="flex justify-between items-center mb-8 px-4">
                <button
                    onClick={handleAttemptClose}
                    className="p-3 bg-white/50 backdrop-blur-md rounded-full text-gray-500 hover:text-rose-500 hover:bg-rose-50 transition-all shadow-sm"
                >
                    <X size={24} />
                </button>

                {/* Gen Z Timer Pill */}
                <div className="px-6 py-2 bg-white/80 backdrop-blur-md rounded-full text-indigo-900 font-black tracking-widest text-lg shadow-sm border border-white/50 animate-pulse">
                    {formatTime(seconds)} ⏳
                </div>

                <div className="px-4 py-2 bg-white/50 backdrop-blur-md rounded-full shadow-sm text-xs font-black uppercase tracking-widest text-gray-600 border border-white/50">
                    Q{currentQuestionIndex + 1}/{questions.length}
                </div>
            </div>

            {questions[currentQuestionIndex] && (
                <TemplateRouter
                    question={questions[currentQuestionIndex]}
                    isSubmitting={false}
                    onSubmit={onAnswer}
                />
            )}

            {/* Exit Confirmation Modal */}
            {showExitConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="bg-rose-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                            <LogOut className="text-rose-600 w-8 h-8" />
                        </div>

                        <h3 className="text-2xl font-black text-slate-800 text-center mb-2">
                            Pause Session?
                        </h3>
                        <p className="text-slate-500 text-center font-medium mb-8">
                            Progress will be saved, but you'll lose your current flow! 🌊
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => setShowExitConfirm(false)}
                                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Play className="w-5 h-5 fill-current" /> Keep Grinding
                            </button>

                            <button
                                onClick={confirmExit}
                                className="w-full py-4 bg-white text-slate-400 border-2 border-slate-100 rounded-xl font-bold hover:bg-slate-50 hover:text-slate-600 active:scale-95 transition-all"
                            >
                                I needs a break 😴
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});
