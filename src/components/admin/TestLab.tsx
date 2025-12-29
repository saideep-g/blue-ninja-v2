import React, { useState, useEffect } from 'react';
import { useNinja } from '../../context/NinjaContext';
import { db } from '../../services/db/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

/**
 * Test Lab / Simulation Control
 * Allows setting overrides for the Mission Generator.
 */
export default function TestLab() {
    const { user } = useNinja();
    const [config, setConfig] = useState({
        forceTemplate: '',
        forceModule: '',
        questionCount: 5,
        bypassHistory: true
    });
    const [activeSim, setActiveSim] = useState<any>(null);

    useEffect(() => {
        // Load existing
        const saved = localStorage.getItem('BLUE_NINJA_SIM_CONFIG');
        if (saved) {
            setActiveSim(JSON.parse(saved));
        }
    }, []);

    const saveConfig = () => {
        const payload = {
            ...config,
            // Filter empty strings
            forceTemplate: config.forceTemplate || undefined,
            forceModule: config.forceModule || undefined,
        };
        localStorage.setItem('BLUE_NINJA_SIM_CONFIG', JSON.stringify(payload));
        setActiveSim(payload);
        alert('Simulation Configured! \nNext time "Daily Flight" loads, it will use these settings.');
    };

    const clearConfig = () => {
        localStorage.removeItem('BLUE_NINJA_SIM_CONFIG');
        setActiveSim(null);
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-black text-purple-800 uppercase tracking-tighter">🧪 Test Lab (Dev Only)</h1>
                <p className="text-gray-600">Inject scenarios into the Mission Generator to test specific content or flows.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* CONFIG FORM */}
                <div className="bg-white p-6 rounded-3xl shadow-lg border border-purple-100 space-y-4">
                    <h2 className="text-xl font-bold text-gray-800">Mission Injection</h2>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-gray-400">Force Template Type</label>
                        <select
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                            value={config.forceTemplate}
                            onChange={(e) => setConfig({ ...config, forceTemplate: e.target.value })}
                        >
                            <option value="">(None - Use Algorithm)</option>
                            <option value="MCQ_CONCEPT">MCQ_CONCEPT</option>
                            <option value="NUMBER_LINE_PLACE">NUMBER_LINE_PLACE</option>
                            <option value="NUMERIC_INPUT">NUMERIC_INPUT</option>
                            <option value="CLASSIFY_SORT">CLASSIFY_SORT</option>
                            <option value="MATCHING">MATCHING</option>
                            <option value="ERROR_ANALYSIS">ERROR_ANALYSIS</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-gray-400">Force Module / Topic</label>
                        <input
                            type="text"
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                            placeholder="e.g. integer_addition"
                            value={config.forceModule}
                            onChange={(e) => setConfig({ ...config, forceModule: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-gray-400">Total Questions</label>
                        <input
                            type="number"
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                            value={config.questionCount}
                            onChange={(e) => setConfig({ ...config, questionCount: parseInt(e.target.value) })}
                        />
                    </div>

                    <div className="flex items-center gap-3 py-2">
                        <input
                            type="checkbox"
                            checked={config.bypassHistory}
                            onChange={(e) => setConfig({ ...config, bypassHistory: e.target.checked })}
                            className="w-5 h-5 accent-purple-600"
                        />
                        <span className="text-sm font-medium text-gray-700">Bypass "Already Completed" Check (Force Regeneration)</span>
                    </div>

                    <div className="pt-4 flex gap-4">
                        <button onClick={saveConfig} className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700">
                            Inject Scenario
                        </button>
                        <button onClick={clearConfig} className="py-3 px-6 bg-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-300">
                            Clear
                        </button>
                    </div>
                </div>

                {/* ACTIVE STATUS */}
                <div className="space-y-6">
                    <div className={`p-6 rounded-3xl border-2 ${activeSim ? 'border-green-400 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                        <h3 className="text-lg font-bold text-gray-700 mb-2">Simulation Status</h3>
                        {activeSim ? (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-green-700 font-bold">
                                    <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                                    ACTIVE
                                </div>
                                <pre className="text-xs bg-white p-3 rounded-xl border border-green-200 overflow-auto">
                                    {JSON.stringify(activeSim, null, 2)}
                                </pre>
                                <p className="text-sm text-green-800 mt-2">
                                    Go to <b>Dev Dashboard</b> or <b>Student Home</b> to trigger generation.
                                </p>
                            </div>
                        ) : (
                            <div className="text-gray-400 text-sm">
                                Not configured. System using standard V2/V3 algorithm.
                            </div>
                        )}
                    </div>

                    <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                        <h3 className="text-lg font-bold text-blue-800 mb-2">Quick Shortcuts</h3>
                        <div className="space-y-2">
                            <button onClick={() => {
                                setConfig({
                                    forceTemplate: 'MCQ_CONCEPT',
                                    forceModule: '',
                                    questionCount: 5,
                                    bypassHistory: true
                                });
                            }} className="block w-full text-left text-sm text-blue-600 hover:underline">
                                Load "MCQ Test" Preset
                            </button>
                            <button onClick={() => {
                                setConfig({
                                    forceTemplate: '',
                                    forceModule: 'integers',
                                    questionCount: 10,
                                    bypassHistory: true
                                });
                            }} className="block w-full text-left text-sm text-blue-600 hover:underline">
                                Load "Integer Integers" Preset
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
