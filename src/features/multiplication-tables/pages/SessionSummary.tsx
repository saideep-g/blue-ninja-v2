
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RefreshCw, Home, Award } from 'lucide-react';

interface InteractionLog {
    questionId: string;
    table: number;
    isCorrect: boolean;
    timeTaken: number;
    timestamp: number;
}

export default function SessionSummary() {
    const location = useLocation();
    const navigate = useNavigate();
    const logs = (location.state as { logs: InteractionLog[] })?.logs || [];

    const totalQuestions = logs.length;
    const correctAnswers = logs.filter(l => l.isCorrect).length;
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    // Calculate specific weak areas (tables with < 80% accuracy)
    const tableStats: Record<number, { correct: number, total: number }> = {};
    logs.forEach(log => {
        if (!tableStats[log.table]) tableStats[log.table] = { correct: 0, total: 0 };
        tableStats[log.table].total++;
        if (log.isCorrect) tableStats[log.table].correct++;
    });

    const weakTables = Object.entries(tableStats)
        .filter(([_, stats]) => (stats.correct / stats.total) < 0.8)
        .map(([table]) => table);

    const getEncouragement = () => {
        if (accuracy === 100) return "Perfect Score! You're a Math Wizard! 🧙‍♂️";
        if (accuracy >= 80) return "Amazing Job! Keep it up! 🌟";
        if (accuracy >= 60) return "Good effort! Practice makes perfect! 💪";
        return "Don't give up! You're learning! 🌱";
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center"
            >
                <div className="flex justify-center mb-6">
                    <Award className={`w-24 h-24 ${accuracy >= 80 ? 'text-yellow-400' : 'text-blue-400'}`} />
                </div>

                <h1 className="text-4xl font-black text-slate-800 mb-2">Session Complete!</h1>
                <p className="text-xl text-slate-500 mb-8">{getEncouragement()}</p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-indigo-50 p-4 rounded-2xl">
                        <div className="text-3xl font-black text-indigo-600">{accuracy}%</div>
                        <div className="text-sm font-bold text-indigo-400">Accuracy</div>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-2xl">
                        <div className="text-3xl font-black text-emerald-600">{correctAnswers}/{totalQuestions}</div>
                        <div className="text-sm font-bold text-emerald-400">Score</div>
                    </div>
                </div>

                {weakTables.length > 0 && (
                    <div className="mb-8 p-4 bg-orange-50 rounded-2xl border border-orange-100 text-left">
                        <h3 className="font-bold text-orange-800 mb-1">Focus Areas:</h3>
                        <p className="text-orange-600 text-sm">
                            Next time, try focusing on the <strong>{weakTables.join(', ')}</strong> times tables.
                        </p>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => navigate('/tables')}
                        className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Practice Again
                    </button>
                    <button
                        onClick={() => navigate('/tables')}
                        className="w-full py-4 text-slate-400 hover:text-slate-600 font-bold flex items-center justify-center gap-2"
                    >
                        <Home className="w-5 h-5" />
                        Back to Home
                    </button>
                </div>

            </motion.div>
        </div>
    );
}
