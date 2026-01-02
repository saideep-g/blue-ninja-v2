import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useNinja } from '../../../context/NinjaContext';
import { getTableSettings } from '../services/tablesFirestore';
import { Play, Sparkles, Zap, Bug } from 'lucide-react';

export default function TableSelection() {
    const navigate = useNavigate();
    const { user, ninjaStats } = useNinja();
    const [assignedTables, setAssignedTables] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDebug, setShowDebug] = useState(false);

    // Determine Grade Level / Mode
    // Robust detection logic
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
        // Console Debug
        console.group('[TableSelection Debug]');
        console.log('User UID:', user?.uid);
        console.log('Raw NinjaStats:', ninjaStats);
        console.log('Resolved Class:', userClass);
        console.log('Is Advanced:', isAdvanced);
        console.groupEnd();
    }, [userClass, isAdvanced, ninjaStats, user]);

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

    // Back Button Logic Removed to prevent app exit on navigation.
    // user will naturally navigate back using browser or on-screen buttons.


    const startSession = () => {
        if (assignedTables.length === 0) return;
        navigate('/tables/practice', { state: { tables: assignedTables } });
    };

    if (loading) return (
        <div className={`min-h-screen flex items-center justify-center text-2xl font-bold ${isAdvanced ? 'bg-[#FAF9F6] text-[#FF8DA1]' : 'bg-slate-50 text-slate-400'}`}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                {isAdvanced ? <Zap size={48} /> : <Sparkles size={48} />}
            </motion.div>
        </div>
    );

    return (
        <div className={`max-w-4xl mx-auto p-6 flex flex-col items-center justify-center min-h-screen relative overflow-hidden transition-colors duration-500 ${isAdvanced ? 'bg-[#FAF9F6]' : 'bg-slate-50'}`}>

            <header className="mb-12 text-center z-10">
                <div
                    onClick={() => setShowDebug(!showDebug)}
                    className={`text-5xl font-extrabold mb-4 tracking-tight cursor-pointer select-none ${isAdvanced ? 'text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400' : 'text-indigo-600'}`}
                >
                    {isAdvanced ? 'Tables Era' : 'Times Tables'}
                </div>
                <p className={`text-xl ${isAdvanced ? 'text-gray-400 font-serif italic' : 'text-slate-500'}`}>
                    {isAdvanced ? 'Optimize your mastery speed.' : 'Master your multiplication powers!'}
                </p>
                <div className="mt-2 text-xs opacity-50 font-mono text-gray-400">
                    Class: {userClass} | Mode: {isAdvanced ? 'Speed' : 'Standard'}
                </div>
            </header>

            <div className={`rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-12 w-full max-w-xl border text-center z-10 transition-all ${isAdvanced ? 'bg-white/80 backdrop-blur-xl border-white' : 'bg-white border-indigo-50'}`}>
                {assignedTables.length > 0 ? (
                    <>
                        <div className="mb-8">
                            <p className={`text-lg mb-4 ${isAdvanced ? 'text-gray-500 font-medium' : 'text-slate-600'}`}>
                                {isAdvanced ? 'Active protocols:' : 'Your current mission covers tables:'}
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {assignedTables.slice().sort((a, b) => a - b).map(t => (
                                    <span key={t} className={`px-4 py-2 rounded-full font-bold text-xl ${isAdvanced ? 'bg-pink-50 text-pink-500 border border-pink-100' : 'bg-indigo-100 text-indigo-700'}`}>
                                        x{t}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={startSession}
                            className={`w-full py-6 rounded-2xl text-2xl font-bold shadow-xl hover:shadow-2xl flex items-center justify-center gap-4 transition-all ${isAdvanced ? 'bg-[#FF8DA1] hover:bg-[#ff7b93] text-white shadow-[0_10px_20px_rgba(255,141,161,0.3)]' : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white'}`}
                        >
                            <Play className="w-8 h-8 fill-current" />
                            {isAdvanced ? 'Start Session' : 'Start Practice'}
                        </motion.button>
                    </>
                ) : (
                    <div className="py-8">
                        <p className={`text-xl font-medium mb-4 ${isAdvanced ? 'text-gray-400' : 'text-slate-400'}`}>No protocols assigned.</p>
                        <p className={`${isAdvanced ? 'text-gray-400' : 'text-slate-500'}`}>Ask admin to configure target vectors.</p>
                    </div>
                )}

                <div className={`mt-8 pt-8 border-t ${isAdvanced ? 'border-gray-100' : 'border-slate-100'}`}>
                    <button
                        onClick={() => navigate('/')}
                        className={`text-sm font-bold mb-4 flex items-center justify-center gap-2 w-full py-2 rounded-xl transition-colors ${isAdvanced ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                    >
                        ← Back to Dashboard
                    </button>
                    <button
                        onClick={() => navigate('/tables/parent')}
                        className={`text-sm font-medium hover:underline ${isAdvanced ? 'text-gray-400 hover:text-pink-400' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Parent Dashboard (Admin)
                    </button>
                    <button
                        onClick={() => setShowDebug(!showDebug)}
                        className="block mx-auto mt-4 text-xs text-slate-300 hover:text-slate-500 flex items-center gap-1"
                    >
                        <Bug size={12} /> Debug Profile
                    </button>
                </div>
            </div>

            {/* Debug Overlay */}
            {showDebug && (
                <div className="fixed bottom-4 right-4 bg-black/90 text-green-400 p-4 rounded-lg font-mono text-xs z-50 max-w-sm overflow-auto max-h-96 shadow-2xl border border-green-900">
                    <h4 className="font-bold border-b border-green-800 pb-2 mb-2">DEBUG: User Profile</h4>
                    <div className="space-y-1">
                        <div><span className="text-gray-500">UID:</span> {user?.uid.substring(0, 8)}...</div>
                        <div><span className="text-gray-500">Resolved Class:</span> <span className="text-white font-bold">{userClass}</span></div>
                        <div><span className="text-gray-500">Is Advanced:</span> {isAdvanced ? 'YES' : 'NO'}</div>
                        <div className="mt-2 border-t border-green-900 pt-2 text-gray-400">Raw Stats Dump:</div>
                        <pre className="whitespace-pre-wrap break-all text-[10px] text-gray-500">
                            {JSON.stringify(ninjaStats, null, 2)}
                        </pre>
                    </div>
                </div>
            )}

            {/* Decorative background elements */}
            {isAdvanced ? (
                <>
                    <div className="fixed -top-20 -right-20 w-96 h-96 bg-pink-100/50 rounded-full blur-[100px] animate-pulse" />
                    <div className="fixed bottom-0 -left-20 w-80 h-80 bg-purple-100/40 rounded-full blur-[120px]" />
                </>
            ) : (
                <>
                    <div className="fixed top-20 left-20 w-32 h-32 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
                    <div className="fixed top-40 right-20 w-32 h-32 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
                </>
            )}
        </div>
    );
}
