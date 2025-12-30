
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function TableSelection() {
    const navigate = useNavigate();
    const [selectedTables, setSelectedTables] = useState<number[]>([]);
    const [mode, setMode] = useState<'practice' | 'challenge'>('practice');

    const supportedTables = Array.from({ length: 11 }, (_, i) => i + 2); // 2 to 12

    const toggleTable = (num: number) => {
        setSelectedTables(prev =>
            prev.includes(num)
                ? prev.filter(n => n !== num)
                : [...prev, num]
        );
    };

    const startSession = () => {
        if (selectedTables.length === 0) return;
        // In a real app, transfer state via Context or URL params. 
        // For now we'll just navigate.
        navigate('/tables/practice', { state: { tables: selectedTables, mode } });
    };

    return (
        <div className="max-w-4xl mx-auto p-6 flex flex-col items-center justify-center min-h-screen">
            <header className="mb-12 text-center">
                <h1 className="text-5xl font-extrabold text-indigo-600 mb-4 tracking-tight">
                    Times Tables
                </h1>
                <p className="text-xl text-slate-500">Pick a number to start your adventure!</p>
            </header>

            <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-3xl border border-indigo-50">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 mb-10">
                    {supportedTables.map((num) => (
                        <motion.button
                            key={num}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggleTable(num)}
                            className={`
                h-20 w-full rounded-2xl text-3xl font-bold flex items-center justify-center transition-all shadow-sm
                ${selectedTables.includes(num)
                                    ? 'bg-indigo-500 text-white shadow-indigo-200 shadow-lg ring-4 ring-indigo-200'
                                    : 'bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-400'
                                }
              `}
                        >
                            {num}
                        </motion.button>
                    ))}
                </div>

                <div className="flex flex-col gap-4">
                    <button
                        onClick={startSession}
                        disabled={selectedTables.length === 0}
                        className={`
                w-full py-5 rounded-2xl text-2xl font-bold transition-all
                ${selectedTables.length > 0
                                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xl hover:shadow-2xl translate-y-0'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }
              `}
                    >
                        Start Practice
                    </button>

                    <button
                        onClick={() => navigate('/tables/parent')}
                        className="text-sm text-slate-400 hover:text-slate-600 mt-4 font-medium"
                    >
                        Parent Dashboard
                    </button>
                </div>
            </div>

            {/* Decorative background elements if needed */}
        </div>
    );
}
