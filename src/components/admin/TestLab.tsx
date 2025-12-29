import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNinja } from '../../context/NinjaContext';
import { questionBundlesCollection } from '../../services/db/firestore';
import { getDocs, query, limit, orderBy } from 'firebase/firestore';
import { FlaskConical, Play, Search, XCircle, ChevronRight, Package, Filter, Layout } from 'lucide-react';

/**
 * Test Lab / Simulation Control
 * 
 * "The Holodeck" for Blue Ninja.
 * Allows Admins to configure specific scenarios and "Launch" into the Student View.
 */
export default function TestLab() {
    const navigate = useNavigate();
    const [config, setConfig] = useState({
        mode: 'ALGORITHMIC', // 'ALGORITHMIC' | 'BUNDLE' | 'TOPIC'
        targetId: '', // Bundle ID or Topic String
        forceTemplate: '',
        questionCount: 5,
        bypassHistory: true
    });

    // Data Loading
    const [availableBundles, setAvailableBundles] = useState<any[]>([]);
    const [isLoadingBundles, setIsLoadingBundles] = useState(false);

    useEffect(() => {
        loadBundles();
    }, []);

    const loadBundles = async () => {
        setIsLoadingBundles(true);
        try {
            // Fetch recent bundles
            const q = query(questionBundlesCollection, orderBy('created_at', 'desc'), limit(20));
            const snap = await getDocs(q);
            const bundles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAvailableBundles(bundles);
        } catch (e) {
            console.error("Failed to load bundles", e);
        }
        setIsLoadingBundles(false);
    };

    const handleLaunch = () => {
        const payload = {
            ...config,
            timestamp: Date.now()
        };

        // Use Session Storage (clears when tab closes = safer)
        // Check local vs session in hook.
        localStorage.setItem('BLUE_NINJA_SIM_CONFIG', JSON.stringify(payload));

        // Navigate to Student Home
        // Force reload to ensure hooks pick up the new config immediately
        window.location.href = '/';
    };

    const clearConfig = () => {
        localStorage.removeItem('BLUE_NINJA_SIM_CONFIG');
        setConfig({
            mode: 'ALGORITHMIC',
            targetId: '',
            forceTemplate: '',
            questionCount: 5,
            bypassHistory: true
        });
        alert("Simulation Cleared. Return to standard user mode.");
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8 space-y-8">
            {/* Header */}
            <div className="max-w-6xl mx-auto flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
                        <FlaskConical size={40} className="text-purple-600" strokeWidth={2.5} />
                        Test Lab <span className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold tracking-widest align-middle">BETA</span>
                    </h1>
                    <p className="text-slate-500 font-medium mt-2 max-w-2xl">
                        Configure a simulation scenario and launch the student experience.
                        The system will act exactly as if these conditions were met naturally.
                    </p>
                </div>
                <div className="flex gap-4">
                    <button onClick={clearConfig} className="px-6 py-3 font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all flex items-center gap-2">
                        <XCircle size={20} /> Clear
                    </button>
                    <button
                        onClick={handleLaunch}
                        className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black uppercase tracking-widest rounded-xl shadow-xl shadow-purple-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                    >
                        <Play size={24} fill="currentColor" /> Launch Simulator
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* 1. SCENARIO TYPE */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">1. Select Strategy</h2>

                        <div className="space-y-3">
                            <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${config.mode === 'ALGORITHMIC' ? 'border-purple-500 bg-purple-50' : 'border-slate-100 hover:border-slate-300'}`}>
                                <input
                                    type="radio"
                                    name="mode"
                                    className="hidden"
                                    checked={config.mode === 'ALGORITHMIC'}
                                    onChange={() => setConfig({ ...config, mode: 'ALGORITHMIC', targetId: '' })}
                                />
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                    <Filter size={20} />
                                </div>
                                <div>
                                    <span className="block font-bold text-slate-800">Algorithmic Filter</span>
                                    <span className="text-xs text-slate-500">Use standard V2/V3 logic but force specific Templates/Topics.</span>
                                </div>
                            </label>

                            <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${config.mode === 'BUNDLE' ? 'border-purple-500 bg-purple-50' : 'border-slate-100 hover:border-slate-300'}`}>
                                <input
                                    type="radio"
                                    name="mode"
                                    className="hidden"
                                    checked={config.mode === 'BUNDLE'}
                                    onChange={() => setConfig({ ...config, mode: 'BUNDLE' })}
                                />
                                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                                    <Package size={20} />
                                </div>
                                <div>
                                    <span className="block font-bold text-slate-800">Assign Bundle</span>
                                    <span className="text-xs text-slate-500">Load a specific Question Bundle directly.</span>
                                </div>
                            </label>

                            <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${config.mode === 'UI' ? 'border-purple-500 bg-purple-50' : 'border-slate-100 hover:border-slate-300'}`}>
                                <input
                                    type="radio"
                                    name="mode"
                                    className="hidden"
                                    checked={config.mode === 'UI'}
                                    onChange={() => setConfig({ ...config, mode: 'UI' })} // Placeholder for future
                                />
                                <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                                    <Layout size={20} />
                                </div>
                                <div>
                                    <span className="block font-bold text-slate-800">UI Stress Test</span>
                                    <span className="text-xs text-slate-500">Test specific UI states (e.g. Mission Complete, Badges).</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Global Settings */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Global Overrides</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-600 mb-1 block">Question Limit</label>
                                <input
                                    type="number"
                                    value={config.questionCount}
                                    onChange={(e) => setConfig({ ...config, questionCount: parseInt(e.target.value) })}
                                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold"
                                />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.bypassHistory}
                                    onChange={(e) => setConfig({ ...config, bypassHistory: e.target.checked })}
                                    className="w-5 h-5 accent-purple-600"
                                />
                                <span className="text-sm font-medium text-slate-600">Bypass History (Force Regenerate)</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* 2. CONFIGURATION DETAILS */}
                <div className="lg:col-span-2 space-y-6">
                    {/* ALGORTHMIC CONFIG */}
                    {config.mode === 'ALGORITHMIC' && (
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-right-4">
                            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                                <Filter className="text-blue-500" /> Algorithmic Filters
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-black uppercase text-slate-400 mb-2 block">Force Template</label>
                                    <select
                                        className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                                        value={config.forceTemplate}
                                        onChange={(e) => setConfig({ ...config, forceTemplate: e.target.value })}
                                    >
                                        <option value="">(None - Mixed)</option>
                                        <option value="MCQ_CONCEPT">MCQ Concept</option>
                                        <option value="NUMBER_LINE_PLACE">Number Line</option>
                                        <option value="NUMERIC_INPUT">Numeric Input</option>
                                        <option value="CLASSIFY_SORT">Classify / Sort</option>
                                        <option value="MATCHING">Matching Pairs</option>
                                        <option value="ERROR_ANALYSIS">Error Analysis</option>
                                        <option value="STEP_ORDER">Step Order</option>
                                        <option value="TWO_TIER">Two Tier (Reasoning)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-black uppercase text-slate-400 mb-2 block">Force Topic / Module</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                                        placeholder="e.g. integers, algebra"
                                        value={config.targetId} // In Algo mode, targetId is topic
                                        onChange={(e) => setConfig({ ...config, targetId: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="mt-8 p-4 bg-blue-50 rounded-2xl text-blue-800 text-sm">
                                <b>Note:</b> This mode queries the built-in CurriculumV3 JSONs. It will try to find questions matching these criteria.
                            </div>
                        </div>
                    )}

                    {/* BUNDLE PICKER */}
                    {config.mode === 'BUNDLE' && (
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-right-4">
                            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                                <Package className="text-orange-500" /> Select Bundle
                            </h2>

                            {isLoadingBundles ? (
                                <div className="text-center py-10 text-slate-400 animate-pulse">Loading Bundles...</div>
                            ) : (
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                    {availableBundles.map((b) => (
                                        <div
                                            key={b.id}
                                            onClick={() => setConfig({ ...config, targetId: b.id })}
                                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center group
                                                ${config.targetId === b.id
                                                    ? 'border-orange-500 bg-orange-50'
                                                    : 'border-slate-100 hover:border-orange-300 hover:bg-slate-50'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-black text-lg
                                                     ${config.targetId === b.id ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-500'}
                                                `}>
                                                    B
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-800 group-hover:text-orange-700">{b.name || b.bundle_id || 'Untitled Bundle'}</h3>
                                                    <p className="text-xs text-slate-500">
                                                        {b.item_count || b.items?.length || 0} Questions • {b.difficulty || 'Mixed'} • {b.description?.slice(0, 50)}...
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center
                                                ${config.targetId === b.id ? 'border-orange-500' : 'border-slate-300'}
                                            `}>
                                                {config.targetId === b.id && <div className="w-3 h-3 rounded-full bg-orange-500" />}
                                            </div>
                                        </div>
                                    ))}

                                    {availableBundles.length === 0 && (
                                        <div className="text-center py-10 text-slate-400">
                                            No published bundles found in Firestore.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
