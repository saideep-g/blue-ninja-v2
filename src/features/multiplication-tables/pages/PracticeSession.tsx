import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Send, Sparkles, Zap, Ghost, Grid } from 'lucide-react';
import { useNinja } from '../../../context/NinjaContext';
import { saveSinglePracticeLog, getTableSettings } from '../services/tablesFirestore';
import { playCorrectSound, playIncorrectSound, playCompletionSound } from '../utils/sounds';
import { generatePathQuestions } from '../logic/inputEngine';
import { TablesConfig, DEFAULT_TABLES_CONFIG } from '../logic/types';

type QuestionType = 'DIRECT' | 'MISSING_MULTIPLIER';

interface Question {
    id: string;
    table: number;
    multiplier: number;
    type: QuestionType;
    correctAnswer: number;
    personalBest?: number; // For Ghost Mode
}

interface InteractionLog {
    questionId: string;
    table: number;
    isCorrect: boolean;
    timeTaken: number;
    timestamp: number;
}

const FEEDBACK_MESSAGES = {
    standard: {
        correct: ["Awesome!", "Super!", "Great Job!", "Bingo!", "Nice!", "Yay!", "Whoa!"],
        ghost: ["Ghost Busted!", "Too Fast!", "Speedy!", "Zap!", "Bye Ghost!"]
    },
    advanced: {
        correct: ["Slay.", "Sharp.", "Clean.", "Solid.", "On Point.", "W.", "Crisp."],
        ghost: ["Ghosted.", "Vaporized.", "Untouchable.", "Mach 1.", "Phantom Crushed."]
    }
};

export default function PracticeSession() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, ninjaStats } = useNinja();

    // Determine Grade Level / Mode
    // Robust detection logic matching TableSelection
    const statsAny = ninjaStats as any;
    const userAny = user as any;

    // Check all potential locations
    const rawClass =
        statsAny?.class ||
        statsAny?.grade ||
        statsAny?.profile?.class ||
        userAny?.profile?.class ||
        userAny?.class ||
        2;

    const userClass = parseInt(String(rawClass), 10); // Ensure integer
    const isAdvanced = userClass >= 7;

    useEffect(() => {
        console.log(`[PracticeSession] Theme Init - Class: ${userClass} (Raw: ${rawClass}), Advanced: ${isAdvanced}`);
    }, [userClass, isAdvanced, rawClass]);

    const theme = isAdvanced ? {
        // Study Era "Soft & Smart" Theme
        bg: "bg-[#FAF9F6]",
        cardBg: "bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]",
        text: "text-[#4A4A4A]",
        accent: "text-[#FF8DA1]",
        button: "bg-[#FF8DA1] hover:bg-[#ff7b93] text-white shadow-[0_10px_20px_rgba(255,141,161,0.3)]",
        secondaryButton: "bg-gray-100 text-gray-400 font-medium hover:bg-gray-200",
        numpadBg: "bg-white text-gray-600 border border-gray-100 hover:bg-pink-50 hover:border-pink-200 transition-colors",
        numpadActive: "border-pink-300 bg-pink-50",
        progressBar: "bg-[#FF8DA1]",
        feedbackCorrect: "text-[#FF8DA1] drop-shadow-sm",
        feedbackBg: "bg-white/90"
    } : {
        bg: "bg-slate-50",
        cardBg: "bg-white shadow-xl",
        text: "text-slate-800",
        accent: "text-indigo-400",
        button: "bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm",
        secondaryButton: "bg-rose-50 text-rose-500 border-rose-200",
        numpadBg: "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
        numpadActive: "border-indigo-700",
        progressBar: "bg-green-500",
        feedbackCorrect: "text-green-500",
        feedbackBg: "bg-white/80"
    };

    // Session State
    const [config, setConfig] = useState<TablesConfig | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState<string>('');
    const [startTime, setStartTime] = useState<number>(Date.now());
    const [showFeedback, setShowFeedback] = useState<'CORRECT' | 'INCORRECT' | 'GHOST_DEFEATED' | null>(null);
    const [feedbackText, setFeedbackText] = useState('');
    const [sessionLogs, setSessionLogs] = useState<InteractionLog[]>([]);
    const [streak, setStreak] = useState(0);
    const [isGhostDefeated, setIsGhostDefeated] = useState(false);
    const [showHeatmap, setShowHeatmap] = useState(false); // Modal state

    // Initialize Session & Config
    useEffect(() => {
        if (!user) return;

        const initSession = async () => {
            // 1. Load Config (Ledger)
            const fetchedConfig = await getTableSettings(user.uid) || DEFAULT_TABLES_CONFIG;
            setConfig(fetchedConfig);

            // 2. Generate Pool
            const sessionLength = isAdvanced ? 25 : 20;
            const candidates = generatePathQuestions(fetchedConfig, isAdvanced, sessionLength);

            // 3. Map to Question Objects
            const newQuestions: Question[] = candidates.map((c, i) => ({
                id: `${c.table}-x-${c.multiplier}-${c.type}-${i}`,
                table: c.table,
                multiplier: c.multiplier,
                type: c.type,
                correctAnswer: c.type === 'MISSING_MULTIPLIER' ? c.multiplier : (c.table * c.multiplier),
                personalBest: fetchedConfig.tableStats?.[c.table]?.avgTime || 5000 // Default 5s if no stats
            }));

            setQuestions(newQuestions);
            setStartTime(Date.now()); // Reset start time for first q
        };

        initSession();
    }, [user, isAdvanced]); // Removed dependnecies on old stats

    // Intercept Back Button
    useEffect(() => {
        window.history.pushState(null, '', window.location.pathname);
        const handlePopState = (event: PopStateEvent) => {
            // Only confirm if not at end
            if (currentIndex < questions.length - 1) {
                const confirmExit = window.confirm("Do you want to exit the practice session? Progress may be lost.");
                if (confirmExit) navigate('/tables');
                else window.history.pushState(null, '', window.location.pathname);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [navigate, currentIndex, questions.length]);

    const currentQuestion = questions[currentIndex];

    const handleInput = (num: number) => {
        if (userAnswer.length < 4) { // Allow up to 4 digits for larger tables (20x20=400)
            setUserAnswer(prev => prev + num.toString());
        }
    };

    const handleBackspace = () => {
        setUserAnswer(prev => prev.slice(0, -1));
    };

    const handleSubmit = useCallback(() => {
        if (!currentQuestion || !userAnswer) return;

        const answerInt = parseInt(userAnswer, 10);
        const isCorrect = answerInt === currentQuestion.correctAnswer;
        const timeTaken = Date.now() - startTime;

        setSessionLogs(prev => [...prev, {
            questionId: currentQuestion.id,
            table: currentQuestion.table,
            isCorrect,
            timeTaken,
            timestamp: Date.now()
        }]);

        if (user) {
            const isValidForSpeed = timeTaken <= 30000 && isCorrect;
            saveSinglePracticeLog(user.uid, {
                questionId: currentQuestion.id,
                table: currentQuestion.table,
                multiplier: currentQuestion.multiplier,
                type: currentQuestion.type,
                isCorrect,
                timeTaken,
                isValidForSpeed
            });
        }

        if (isCorrect) {
            // Check Ghost Defeated
            const beatGhost = currentQuestion.personalBest && timeTaken < currentQuestion.personalBest;
            const messages = isAdvanced ? FEEDBACK_MESSAGES.advanced : FEEDBACK_MESSAGES.standard;

            if (beatGhost) {
                const msg = messages.ghost[Math.floor(Math.random() * messages.ghost.length)];
                setFeedbackText(msg);
                setShowFeedback('GHOST_DEFEATED');
            } else {
                const msg = messages.correct[Math.floor(Math.random() * messages.correct.length)];
                setFeedbackText(msg);
                setShowFeedback('CORRECT');
            }

            setStreak(s => s + 1);
            playCorrectSound();
        } else {
            setShowFeedback('INCORRECT');
            setStreak(0);
            playIncorrectSound();
        }

        setTimeout(() => {
            setShowFeedback(null);
            setUserAnswer('');
            setIsGhostDefeated(false); // Reset ghost flag if used

            if (currentIndex < questions.length - 1) {
                setCurrentIndex(prev => prev + 1);
                setStartTime(Date.now());
            } else {
                playCompletionSound();
                const currentLog = {
                    questionId: currentQuestion!.id,
                    table: currentQuestion!.table,
                    isCorrect,
                    timeTaken,
                    timestamp: Date.now()
                };
                navigate('/tables/summary', {
                    state: {
                        logs: [...sessionLogs, currentLog],
                        initialConfig: config
                    }
                });
            }
        }, isCorrect ? (isAdvanced ? 600 : 1000) : 2500);

    }, [currentIndex, currentQuestion, userAnswer, startTime, questions, sessionLogs, navigate, user, isAdvanced]);

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (showFeedback) return;
            if (e.key >= '0' && e.key <= '9') handleInput(parseInt(e.key));
            else if (e.key === 'Backspace') handleBackspace();
            else if (e.key === 'Enter') handleSubmit();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [userAnswer, showFeedback, handleSubmit]);


    if (!currentQuestion) return <div>Loading...</div>;

    return (
        <div className={`min-h-screen ${theme.bg} ${theme.text} flex flex-col items-center relative overflow-hidden transition-colors duration-500`}>

            {/* Background Animations */}
            {isAdvanced ? (
                <>
                    <div className="fixed -top-20 -right-20 w-96 h-96 bg-pink-100/50 rounded-full blur-[100px] animate-pulse" />
                    <div className="fixed bottom-0 -left-20 w-80 h-80 bg-purple-100/40 rounded-full blur-[120px]" />
                </>
            ) : (
                // Original playful blobs
                <>
                </>
            )}

            {/* Top Bar */}
            <div className="w-full p-4 flex justify-between items-center max-w-lg mx-auto z-10">
                <button onClick={() => navigate('/tables')} className={`p-2 rounded-full hover:bg-opacity-80 transition ${isAdvanced ? 'bg-white shadow-sm text-pink-400' : 'bg-white text-slate-600'}`}>
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex gap-2 items-center flex-1 mx-4">
                    <div className={`h-2 flex-1 rounded-full overflow-hidden ${isAdvanced ? 'bg-pink-100' : 'bg-slate-200'}`}>
                        <div
                            className={`h-full transition-all duration-500 ${theme.progressBar}`}
                            style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
                        />
                    </div>
                    <span className={`text-xs font-bold ${isAdvanced ? 'text-pink-400' : 'text-slate-400'}`}>{currentIndex + 1}/{questions.length}</span>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => setShowHeatmap(true)} className={`p-2 rounded-full hover:bg-opacity-80 transition ${isAdvanced ? 'bg-white shadow-sm text-pink-400' : 'bg-white text-slate-600'}`}>
                        <Grid className="w-5 h-5" />
                    </button>
                    <div className={`flex items-center gap-1 font-bold ${isAdvanced ? 'text-[#FF8DA1]' : 'text-orange-500'}`}>
                        {isAdvanced ? <Zap className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                        <span>{streak}</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 w-full max-w-lg flex flex-col items-center justify-center p-4 z-10">

                {/* Question Card */}
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={currentQuestion.id}
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -50 }}
                        className={`${theme.cardBg} w-full rounded-3xl p-8 mb-8 flex flex-col items-center justify-center min-h-[220px] transition-colors duration-300 relative overflow-hidden`}
                    >
                        {isAdvanced && <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-pink-300/50 to-transparent" />}
                        <div className={`text-6xl font-black tracking-tighter flex items-center gap-4 ${theme.text} relative z-10`}>
                            {currentQuestion.type === 'DIRECT' ? (
                                <>
                                    <span>{currentQuestion.table}</span>
                                    <span className={theme.accent}>×</span>
                                    <span>{currentQuestion.multiplier}</span>
                                    <span className="opacity-40">=</span>
                                    <span className={`min-w-[80px] text-center border-b-4 ${userAnswer ? (isAdvanced ? 'border-pink-400 text-pink-500' : 'border-indigo-500 text-indigo-600') : (isAdvanced ? 'border-pink-100' : 'border-slate-200')} pb-2 transition-colors`}>
                                        {userAnswer || '?'}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span>{currentQuestion.table}</span>
                                    <span className={theme.accent}>×</span>
                                    <span className={`min-w-[80px] text-center border-b-4 ${userAnswer ? (isAdvanced ? 'border-fuchsia-500 text-fuchsia-400' : 'border-indigo-500 text-indigo-600') : (isAdvanced ? 'border-violet-600' : 'border-slate-200')} pb-2 transition-colors`}>
                                        {userAnswer || '?'}
                                    </span>
                                    <span className="opacity-40">=</span>
                                    <span>{currentQuestion.table * currentQuestion.multiplier}</span>
                                </>
                            )}
                        </div>

                        {/* Ghost Bar */}
                        {currentQuestion.personalBest && (
                            <div className="absolute bottom-0 left-0 h-2 bg-slate-100 w-full overflow-hidden">
                                <motion.div
                                    key={currentQuestion.id} // Reset animation on new question
                                    initial={{ width: "0%" }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: currentQuestion.personalBest / 1000, ease: "linear" }}
                                    className="h-full bg-slate-300"
                                />
                                <div className="absolute right-2 top-0 bottom-0 flex items-center">
                                    <Ghost size={12} className="text-slate-400 -mt-3" />
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Feedback Overlay */}
                <AnimatePresence>
                    {showFeedback === 'CORRECT' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1.2 }}
                            exit={{ opacity: 0 }}
                            className={`absolute inset-0 flex items-center justify-center ${theme.feedbackBg} backdrop-blur-sm z-20 pointer-events-none`}
                        >
                            <div className={`${theme.feedbackCorrect} font-black text-4xl md:text-6xl flex flex-col items-center gap-4 text-center p-4`}>
                                {isAdvanced ? <Zap className="w-12 h-12 md:w-16 md:h-16" /> : null}
                                {feedbackText}
                            </div>
                        </motion.div>
                    )}
                    {showFeedback === 'GHOST_DEFEATED' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1.2 }}
                            exit={{ opacity: 0 }}
                            className={`absolute inset-0 flex items-center justify-center ${theme.feedbackBg} backdrop-blur-sm z-20 pointer-events-none`}
                        >
                            <div className={`text-purple-500 font-black text-3xl md:text-6xl flex flex-col items-center gap-4 text-center p-4`}>
                                <Ghost className="w-12 h-12 md:w-16 md:h-16" />
                                {feedbackText}
                            </div>
                        </motion.div>
                    )}
                    {showFeedback === 'INCORRECT' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute bottom-32 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg border border-red-400 z-20 pointer-events-none"
                        >
                            <span className="font-bold">Result: {currentQuestion.correctAnswer}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-3 md:gap-8 w-full max-w-xs md:max-w-3xl">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                            key={num}
                            onClick={() => handleInput(num)}
                            className={`h-16 md:h-24 rounded-xl shadow-sm border-b-4 active:border-b-0 active:translate-y-1 text-2xl md:text-5xl font-bold transition-all font-mono ${theme.numpadBg}`}
                        >
                            {num}
                        </button>
                    ))}
                    <button
                        onClick={handleBackspace}
                        className={`h-16 md:h-24 rounded-xl shadow-sm border-b-4 active:border-b-0 active:translate-y-1 font-bold transition-all flex items-center justify-center ${theme.secondaryButton}`}
                    >
                        <span className="text-xl md:text-4xl">⌫</span>
                    </button>
                    <button
                        onClick={() => handleInput(0)}
                        className={`h-16 md:h-24 rounded-xl shadow-sm border-b-4 active:border-b-0 active:translate-y-1 text-2xl md:text-5xl font-bold transition-all font-mono ${theme.numpadBg}`}
                    >
                        0
                    </button>
                    <button
                        onClick={handleSubmit}
                        className={`h-16 md:h-24 rounded-xl border-b-4 active:border-b-0 active:translate-y-1 font-bold transition-all flex items-center justify-center ${theme.button}`}
                        style={{ borderBottomColor: 'rgba(0,0,0,0.2)' }}
                    >
                        <Send className="w-6 h-6 md:w-10 md:h-10" />
                    </button>
                </div>

            </div>

            {/* Heatmap Modal */}
            <AnimatePresence>
                {showHeatmap && config && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-slate-800">Mastery Heatmap</h2>
                                <button onClick={() => setShowHeatmap(false)} className="text-slate-400 hover:text-slate-600">close</button>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                {Object.entries(config.tableStats).map(([table, stat]) => {
                                    const t = parseInt(table);
                                    if (t > 12 && !isAdvanced) return null; // Hide >12 for basics

                                    // Color logic
                                    let bg = "bg-slate-100";
                                    let text = "text-slate-400";

                                    if (stat.avgTime > 0) {
                                        if (stat.avgTime < 2000) { bg = "bg-emerald-400"; text = "text-emerald-900"; }
                                        else if (stat.avgTime < 4000) { bg = "bg-green-200"; text = "text-green-800"; }
                                        else if (stat.avgTime < 10000) { bg = "bg-amber-100"; text = "text-amber-800"; }
                                        else { bg = "bg-red-100"; text = "text-red-800"; }
                                    }

                                    return (
                                        <div key={t} className={`${bg} ${text} p-4 rounded-xl flex flex-col items-center justify-center gap-1`}>
                                            <span className="text-2xl font-black">x{t}</span>
                                            <span className="text-xs font-mono font-bold">
                                                {stat.avgTime > 0 ? (stat.avgTime / 1000).toFixed(1) + 's' : '-'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
