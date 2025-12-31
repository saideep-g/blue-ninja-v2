import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useNinja } from '../../../context/NinjaContext';
import { getTableSettings } from '../services/tablesFirestore';
import { Play } from 'lucide-react';

export default function TableSelection() {
    const navigate = useNavigate();
    const { user } = useNinja();
    const [assignedTables, setAssignedTables] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchSettings = async () => {
            setLoading(true);
            try {
                const settings = await getTableSettings(user.uid);
                if (settings && settings.selectedTables) {
                    setAssignedTables(settings.selectedTables);
                } else {
                    setAssignedTables([]);
                }
            } catch (err) {
                console.error("Failed to load table settings", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [user]);

    // Back Button - Exit App Confirmation
    useEffect(() => {
        window.history.pushState(null, '', window.location.pathname);

        const handlePopState = () => {
            const confirmExit = window.confirm("Do you want to exit the app?");
            if (confirmExit) {
                // Try to close tab (works if opened by script, otherwise browser security blocks it)
                window.close();
                // Fallback for PWA/Mobile wrappers:
                // In some mobile browsers, navigating to 'about:blank' or triggering a specific bridge event might be needed.
                // For standard web, effectively 'stopping' here or redirecting to a 'goodbye' page is standard practice.
                // If this is a standalone PWA, standard window.close might be ignored.
                // We will try to replace with a blank page as a "close" proxy for standard web.
                window.location.href = "about:blank";
            } else {
                window.history.pushState(null, '', window.location.pathname);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const startSession = () => {
        if (assignedTables.length === 0) return;
        navigate('/tables/practice', { state: { tables: assignedTables } });
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-2xl font-bold text-slate-400">Loading your mission...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 flex flex-col items-center justify-center min-h-screen">
            <header className="mb-12 text-center">
                <h1 className="text-5xl font-extrabold text-indigo-600 mb-4 tracking-tight">
                    Times Tables
                </h1>
                <p className="text-xl text-slate-500">Master your multiplication powers!</p>
            </header>

            <div className="bg-white rounded-3xl shadow-xl p-12 w-full max-w-xl border border-indigo-50 text-center">
                {assignedTables.length > 0 ? (
                    <>
                        <div className="mb-8">
                            <p className="text-lg text-slate-600 mb-4">Your current mission covers tables:</p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {assignedTables.slice().sort((a, b) => a - b).map(t => (
                                    <span key={t} className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full font-bold text-xl">x{t}</span>
                                ))}
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={startSession}
                            className="w-full py-6 rounded-2xl text-3xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xl hover:shadow-2xl flex items-center justify-center gap-4"
                        >
                            <Play className="w-8 h-8 fill-current" />
                            Start Practice
                        </motion.button>
                    </>
                ) : (
                    <div className="py-8">
                        <p className="text-xl text-slate-400 font-medium mb-4">No tables assigned yet.</p>
                        <p className="text-slate-500">Ask your parent to configure your practice tables in the Parent Dashboard.</p>
                    </div>
                )}

                <div className="mt-8 pt-8 border-t border-slate-100">
                    <button
                        onClick={() => navigate('/tables/parent')}
                        className="text-sm text-slate-400 hover:text-slate-600 font-medium"
                    >
                        Parent Dashboard (Admin)
                    </button>
                </div>
            </div>

            {/* Decorative background elements */}
            <div className="fixed top-20 left-20 w-32 h-32 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
            <div className="fixed top-40 right-20 w-32 h-32 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
        </div>
    );
}
