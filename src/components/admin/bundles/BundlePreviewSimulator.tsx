import React, { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, Monitor, Smartphone } from 'lucide-react';
import { SimplifiedQuestion } from '../../../types/bundle';
import { TemplateRouter } from '../../templates/TemplateRouter';

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

    const currentQuestion = questions[currentIndex];

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

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col ${s.backdrop} animate-in fade-in duration-300`}>
            {/* Ultra-Condensed Header */}
            <div className={`w-full flex justify-between items-center px-2 py-2 border-b transition-all ${theme === 'era' ? 'bg-slate-900/50 border-white/5' : 'bg-white border-slate-200'}`}>
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

                    <div className={`text-xs font-black transition-all ${theme === 'era' ? 'text-white/40' : 'text-slate-400'}`}>
                        PREVIEW: <span className={theme === 'era' ? 'text-white' : 'text-slate-900'}>{currentIndex + 1} / {questions.length}</span>
                    </div>

                    <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest">
                        <CheckCircle size={10} /> Correct Answer Revealed
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className={`p-2 rounded-lg transition-all ${theme === 'era' ? 'text-white/40 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`}
                >
                    <X size={20} />
                </button>
            </div>

            {/* Main Full-Screen Area */}
            <div className="flex-1 flex justify-center overflow-hidden">
                <div className={`w-full flex flex-col min-h-0 transition-all duration-500 ${theme === 'mobile' ? 'max-w-md my-4 rounded-[3rem] border-8 border-slate-900 shadow-2xl overflow-hidden' : 'max-w-none h-full'}`}>
                    <div className={`flex-1 overflow-y-auto custom-scrollbar flex flex-col transition-all duration-500 ${s.wrapper} ${s.container}`}>
                        <div className={`mx-auto w-full transition-all duration-500 ${theme === 'mobile' ? 'p-6' : 'max-w-5xl py-2 px-2'}`}>
                            <TemplateRouter
                                question={currentQuestion as any}
                                onSubmit={() => nextQuestion()}
                                isPreview={true}
                                readOnly={false}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Subtle Progress Bar at bottom */}
            <div className="h-1 w-full bg-slate-800 flex">
                <div
                    className={`h-full transition-all duration-500 ${theme === 'era' ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-purple-500'}`}
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
                    background-color: #f8fafc !important;
                }
                .mobile-theme-wrapper .qlms-renderer-host {
                    color: #1e293b !important;
                }
                .era-theme-wrapper .qlms-renderer-host {
                    color: white !important;
                }
                .mobile-theme-wrapper input {
                    background-color: #f1f5f9 !important;
                    border-color: #e2e8f0 !important;
                }
                .era-theme-wrapper {
                    background-color: transparent !important;
                }
            `}} />
        </div>
    );
};
