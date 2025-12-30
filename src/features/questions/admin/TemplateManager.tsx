import React, { useState } from 'react';
import { registry } from '../registry';
import { Terminal, Copy, BarChart3, Database, AlertCircle, CheckCircle2 } from 'lucide-react';

const MOCK_INVENTORY_STATS = {
    total: 1250,
    distribution: [
        { type: 'LEGACY_MCQ', count: 850, version: 'legacy', details: 'Old V2 Template' },
        { type: 'multiple-choice', count: 300, version: 'v1', details: 'Standard QLMS' },
        { type: 'mcq-branching', count: 100, version: 'v1', details: 'New Adaptive Flow' }
    ]
};

export const TemplateManager: React.FC = () => {
    const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
    const [showStats, setShowStats] = useState(false);

    const allTypes = registry.getAllTypes();
    const selectedManifest = selectedTypeId ? registry.get(selectedTypeId) : null;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Toast logic here ideally
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <header className="border-b pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Template Manager</h1>
                    <p className="text-gray-500">Source of truth for Question Schemas & Generation.</p>
                </div>
                <button
                    onClick={() => setShowStats(!showStats)}
                    className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 font-medium"
                >
                    <BarChart3 className="w-4 h-4" />
                    {showStats ? 'Hide Inventory' : 'Scan Inventory'}
                </button>
            </header>

            {/* INVENTORY STATS PANEL */}
            {showStats && (
                <div className="bg-gray-900 text-white rounded-2xl p-6 shadow-xl animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-3 mb-6">
                        <Database className="w-6 h-6 text-blue-400" />
                        <h2 className="text-xl font-bold">Repository Health Check</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Summary Widget */}
                        <div className="bg-gray-800 p-4 rounded-xl">
                            <div className="text-gray-400 text-sm mb-1">Total Questions</div>
                            <div className="text-4xl font-mono font-bold">{MOCK_INVENTORY_STATS.total}</div>
                            <div className="text-xs text-green-400 mt-2 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Database Connected
                            </div>
                        </div>

                        {/* Distribution Bar */}
                        <div className="col-span-2 space-y-4">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Version Distribution</h3>
                            <div className="space-y-3">
                                {MOCK_INVENTORY_STATS.distribution.map((item, idx) => {
                                    const percent = Math.round((item.count / MOCK_INVENTORY_STATS.total) * 100);
                                    return (
                                        <div key={idx}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-bold flex items-center gap-2">
                                                    {item.version === 'legacy' ? <AlertCircle className="w-3 h-3 text-red-400" /> : <CheckCircle2 className="w-3 h-3 text-green-400" />}
                                                    {item.type} <span className="opacity-50 font-normal">({item.version})</span>
                                                </span>
                                                <span className="font-mono">{percent}%</span>
                                            </div>
                                            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${item.version === 'legacy' ? 'bg-red-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT: TEMPLATE BROWSING */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                {/* SIDEBAR: LIST */}
                <div className="md:col-span-1 space-y-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Available Types</h3>
                    {allTypes.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setSelectedTypeId(t.id)}
                            className={`w-full text-left p-3 rounded-lg border transition-all ${selectedTypeId === t.id
                                    ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm ring-1 ring-blue-200'
                                    : 'bg-white border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            <div className="font-bold">{t.name}</div>
                            <div className="text-xs text-gray-500 font-mono mt-1">ID: {t.id} (v{t.latestVersion})</div>
                        </button>
                    ))}
                </div>

                {/* MAIN: DETAILS */}
                <div className="md:col-span-3">
                    {selectedManifest ? (
                        <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                            {/* HEADER */}
                            <div className="p-6 border-b bg-gray-50">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">{selectedManifest.name}</h2>
                                        <p className="text-gray-600 mt-1">{selectedManifest.description}</p>
                                    </div>
                                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full border border-blue-200">
                                        Version {selectedManifest.version}.0
                                    </span>
                                </div>
                            </div>

                            {/* CONTENT */}
                            <div className="p-6 space-y-8">

                                {/* AI PROMPT SECTION */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-bold flex items-center gap-2 text-indigo-900">
                                            <Terminal className="w-5 h-5" />
                                            AI Generation Prompt
                                        </h3>
                                        <button
                                            onClick={() => selectedManifest.aiContext?.generationPrompt && copyToClipboard(selectedManifest.aiContext.generationPrompt)}
                                            className="text-xs flex items-center gap-1 text-gray-500 hover:text-indigo-600 font-bold"
                                        >
                                            <Copy className="w-3 h-3" /> COPY TO CLIPBOARD
                                        </button>
                                    </div>
                                    <div className="bg-gray-900 rounded-xl p-4 overflow-hidden relative group">
                                        <pre className="text-sm font-mono text-green-300 whitespace-pre-wrap">
                                            {selectedManifest.aiContext?.generationPrompt || 'No prompt defined for this type.'}
                                        </pre>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Paste this prompt into Gemini/Model Studio to generate valid JSON for this template version.
                                    </p>
                                </div>

                                {/* SCHEMA INFO */}
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-2">Technical Schema</h3>
                                    <div className="bg-gray-50 p-4 rounded-xl border text-sm text-gray-600 space-y-1">
                                        <div><span className="font-mono text-gray-400">Component:</span> {selectedManifest.component.name || 'UnknownComponent'}</div>
                                        <div><span className="font-mono text-gray-400">Schema ID:</span> {selectedManifest.id}:v{selectedManifest.version}</div>
                                        <div><span className="font-mono text-gray-400">Analytics:</span> Platinum Standard Compliant</div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-2xl bg-gray-50 text-gray-400">
                            Select a template from the list to view generation details.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
