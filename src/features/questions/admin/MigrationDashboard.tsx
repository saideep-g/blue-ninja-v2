import React, { useState } from 'react';
import { LegacyToMCQV1, QuestionTransformer } from './transformers';
import { registry } from '../registry';
import { Check, X, ArrowRight, Database, RefreshCw, Play } from 'lucide-react';

// Mock Data Source for Demo
const MOCK_LEGACY_DB = [
    { id: 'old_1', type: 'MCQ', question: 'What is 2+2?', options: ['3', '4', '5'], correctOptionIndex: 1 },
    { id: 'old_2', type: 'MCQ', text: 'Capital of France?', options: ['London', 'Paris'], answer: 'Paris' },
    { id: 'old_3', type: 'UNKNOWN', question: 'Broken Data', options: null }
];

export const MigrationDashboard: React.FC = () => {
    const [scannedItems, setScannedItems] = useState<any[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [selectedTransformer, setSelectedTransformer] = useState<QuestionTransformer>(LegacyToMCQV1);
    const [isMigrating, setIsMigrating] = useState(false);

    const scan = () => {
        // In real app: await db.questions.filter(q => !q.meta?.version).toArray();
        setScannedItems(MOCK_LEGACY_DB);
        setResults([]);
    };

    const runDryRun = () => {
        const outcomes = scannedItems.map(item => {
            const res = selectedTransformer.transform(item);

            // Validate against Registry Schema?
            // const manifest = registry.get(selectedTransformer.targetType);
            // const zodRes = manifest?.schema.safeParse(res.data);

            return {
                original: item,
                ...res
            };
        });
        setResults(outcomes);
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">
            <header className="border-b pb-4">
                <h1 className="text-3xl font-bold text-gray-900">Question Migration Tool</h1>
                <p className="text-gray-500">Upgrade legacy content to QLMS V1/V2 Schemas.</p>
            </header>

            {/* CONTROLS */}
            <div className="flex gap-4 p-4 bg-gray-50 rounded-xl border items-center">
                <button
                    onClick={scan}
                    className="flex items-center gap-2 px-4 py-2 bg-white border shadow-sm rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                >
                    <Database className="w-4 h-4" /> Scan Legacy DB
                </button>

                <div className="h-8 w-px bg-gray-300 mx-2" />

                <label className="text-sm font-bold text-gray-700">Transformer:</label>
                <select
                    className="px-3 py-2 border rounded-lg bg-white"
                    onChange={(e) => {
                        if (e.target.value === LegacyToMCQV1.id) setSelectedTransformer(LegacyToMCQV1);
                    }}
                >
                    <option value={LegacyToMCQV1.id}>{LegacyToMCQV1.id}</option>
                </select>

                <button
                    onClick={runDryRun}
                    disabled={scannedItems.length === 0}
                    className="ml-auto flex items-center gap-2 px-6 py-2 bg-blue-600 text-white shadow-md rounded-lg hover:bg-blue-700 font-bold disabled:opacity-50"
                >
                    <Play className="w-4 h-4" /> Run Assessment
                </button>
            </div>

            {/* RESULTS GRID */}
            <div className="grid gap-4">
                {results.map((res, idx) => (
                    <div key={idx} className={`border rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4 ${res.success ? 'bg-white border-green-100' : 'bg-red-50 border-red-200'}`}>
                        {/* BEFORE */}
                        <div className="text-xs font-mono bg-gray-50 p-3 rounded border overflow-auto max-h-40">
                            <div className="font-bold text-gray-400 mb-2">ORIGINAL ({res.original.type})</div>
                            <pre>{JSON.stringify(res.original, null, 2)}</pre>
                        </div>

                        {/* ARROW (Mobile: Down, Desktop: Right) */}
                        <div className="flex items-center justify-center md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2">
                            {res.success
                                ? <ArrowRight className="text-green-500 w-6 h-6 hidden md:block" />
                                : <X className="text-red-500 w-6 h-6" />
                            }
                        </div>

                        {/* AFTER */}
                        <div className={`text-xs font-mono p-3 rounded border overflow-auto max-h-40 ${res.success ? 'bg-green-50 border-green-200' : 'bg-red-100 border-red-200'}`}>
                            <div className="font-bold text-gray-400 mb-2">
                                {res.success ? `TRANSFORMED (${selectedTransformer.targetType})` : 'ERROR'}
                            </div>
                            {res.success ? (
                                <pre className="text-green-900">{JSON.stringify(res.data, null, 2)}</pre>
                            ) : (
                                <div className="text-red-700 font-bold">{res.error}</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {results.length > 0 && (
                <div className="flex justify-end pt-4 border-t">
                    <button className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 shadow-lg">
                        <RefreshCw className="w-4 h-4 inline mr-2" />
                        Apply & Save {results.filter(r => r.success).length} Changes
                    </button>
                </div>
            )}
        </div>
    );
};
