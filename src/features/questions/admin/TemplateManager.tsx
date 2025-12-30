import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registry } from '../registry';
import { useIndexedDB } from '../../../hooks/useIndexedDB';
import {
    Terminal, Copy, BarChart3, Database, AlertCircle,
    CheckCircle2, RefreshCw, LayoutGrid, ArrowLeft,
    Book, Sparkles, Layers, Box, Code
} from 'lucide-react';

// ============================================================================
// COMPONENTS
// ============================================================================

const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-${color}-50 text-${color}-600`}>
            <Icon size={20} />
        </div>
        <div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">{label}</div>
        </div>
    </div>
);

const TemplateCard = ({ manifest, onClick, stats }: any) => {
    return (
        <button
            onClick={onClick}
            className="group relative flex flex-col items-start text-left bg-white border border-gray-200 hover:border-blue-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden h-full"
        >
            <div className="h-32 w-full relative bg-gradient-to-br from-gray-50 to-gray-100 group-hover:from-blue-50 group-hover:to-indigo-50 flex items-center justify-center transition-colors">
                <Box className="w-12 h-12 text-gray-400 group-hover:text-blue-500 transition-colors opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="px-4 py-2 bg-white/90 backdrop-blur rounded-full text-blue-600 text-sm font-bold shadow-sm">
                        Manage Template
                    </span>
                </div>
            </div>

            <div className="p-6 w-full">
                <div className="flex justify-between items-start mb-2">
                    <div className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-[10px] font-mono font-bold uppercase tracking-wider">
                        v{manifest.version}.0
                    </div>
                    {stats && <div className="text-xs font-medium text-gray-500">{stats.count || 0} items</div>}
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {manifest.name}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                    {manifest.description}
                </p>

                <div className="mt-4 pt-4 border-t border-gray-50 w-full flex items-center justify-between text-xs text-gray-400 font-mono">
                    <span>{manifest.id}</span>
                </div>
            </div>
        </button>
    );
};

export const TemplateManager: React.FC = () => {
    const navigate = useNavigate();
    const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
    const [inventoryStats, setInventoryStats] = useState<{
        total: number,
        distribution: Record<string, { total: number, versions: Record<string, number> }>
    } | null>(null);
    const [isScanning, setIsScanning] = useState(false);

    const { getBrowserItems, isInitialized } = useIndexedDB();
    const allTypes = registry.getAllTypes();
    const selectedManifest = selectedTypeId ? registry.get(selectedTypeId) : null;

    // SCANNINIG LOGIC
    const runInventoryScan = async () => {
        if (!isInitialized) return;

        setIsScanning(true);
        try {
            const items = await getBrowserItems();

            const dist: Record<string, { total: number, versions: Record<string, number> }> = {};

            items.forEach((item: any) => {
                // Determine Raw Type
                let rawType = item.type || item.template_id || 'unknown';
                if (typeof rawType === 'string') rawType = rawType.toUpperCase();

                // Normalize to QLMS ID
                let type = rawType.toLowerCase(); // Default

                if (['MCQ_CONCEPT', 'MCQ_SKILL', 'LEGACY_MCQ', 'MULTIPLE_CHOICE', 'MCQ'].includes(rawType)) {
                    type = 'multiple-choice';
                } else if (['MCQ_BRANCHING', 'BRANCHING', 'ADAPTIVE_MCQ'].includes(rawType)) {
                    type = 'mcq-branching';
                }

                if (!dist[type]) {
                    dist[type] = { total: 0, versions: {} };
                }

                // Determine Version
                let version = 'unknown';
                if (item.metadata?.version) {
                    version = `v${item.metadata.version}`;
                } else if (rawType.includes('LEGACY') || rawType === 'MCQ_CONCEPT' || rawType === 'MCQ_SKILL' || !item.type) {
                    // Check for V2 hallmarks if it's potentially legacy
                    version = 'legacy';
                } else {
                    version = 'v1';
                }

                dist[type].total++;
                dist[type].versions[version] = (dist[type].versions[version] || 0) + 1;
            });

            setInventoryStats({
                total: items.length,
                distribution: dist
            });
        } catch (e) {
            console.error("Scan failed", e);
        } finally {
            setIsScanning(false);
        }
    };

    // Auto-scan when DB is ready
    useEffect(() => {
        if (isInitialized && !inventoryStats) {
            runInventoryScan();
        }
    }, [isInitialized, inventoryStats]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Toast logic would go here
    };

    // ========================================================================
    // DETAIL VIEW
    // ========================================================================
    if (selectedManifest) {
        const stats = inventoryStats?.distribution?.[selectedManifest.id] || { total: 0, versions: {} };
        const versions = Object.entries(stats.versions).sort();

        return (
            <div className="p-8 max-w-7xl mx-auto animate-in slide-in-from-right-4 duration-300">
                {/* NAV */}
                <button
                    onClick={() => setSelectedTypeId(null)}
                    className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium transition-colors"
                >
                    <ArrowLeft size={16} /> Back to Library
                </button>

                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight">{selectedManifest.name}</h1>
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">
                                V{selectedManifest.version} StABLE
                            </span>
                        </div>
                        <p className="text-xl text-gray-500 max-w-2xl">{selectedManifest.description}</p>
                    </div>
                </div>

                {/* STATS ROW */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        label="Active Questions"
                        value={stats.total}
                        icon={Database}
                        color="blue"
                    />

                    {/* VERSION HEALTH BREAKDOWN */}
                    <div className="col-span-3 bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col justify-center">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                            <BarChart3 className="w-3 h-3 inline mr-1" />
                            Version Distribution (Migration Status)
                        </div>
                        <div className="flex items-center gap-4 h-full">
                            {versions.length === 0 ? (
                                <span className="text-sm text-gray-400 italic">No questions found for this type.</span>
                            ) : (
                                versions.map(([ver, count]) => {
                                    const percent = Math.round((count / stats.total) * 100);
                                    const isLegacy = ver === 'legacy';
                                    return (
                                        <button
                                            key={ver}
                                            onClick={() => navigate('/admin/questions', {
                                                state: { filter: { type: selectedManifest.id, version: isLegacy ? 'legacy' : ver } }
                                            })}
                                            className="flex-1 group text-left hover:bg-gray-50 p-2 -my-2 rounded-lg transition-colors"
                                            title="Click to view questions"
                                        >
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className={`font-bold uppercase ${isLegacy ? 'text-red-500' : 'text-green-600'} group-hover:underline`}>
                                                    {ver}
                                                </span>
                                                <span className="font-mono text-gray-500">{count} ({percent}%)</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${isLegacy ? 'bg-red-400' : 'bg-green-500'}`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* MAIN CONTENT GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT: AI & GENERATION */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl border p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-purple-500" />
                                    AI Generation Prompt
                                </h3>
                                <button
                                    onClick={() => selectedManifest.aiContext?.generationPrompt && copyToClipboard(selectedManifest.aiContext.generationPrompt)}
                                    className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border rounded-lg text-xs font-bold text-gray-600 flex items-center gap-2 transition-colors"
                                >
                                    <Copy size={14} /> Copy Prompt
                                </button>
                            </div>

                            <div className="bg-[#0f172a] rounded-xl p-6 overflow-hidden relative shadow-inner group">
                                <div className="absolute top-0 right-0 p-2 opacity-50 text-xs text-gray-500 font-mono">JSON</div>
                                <pre className="text-sm font-mono text-emerald-400 whitespace-pre-wrap leading-relaxed">
                                    {selectedManifest.aiContext?.generationPrompt || '// No generation prompt defined.'}
                                </pre>
                            </div>
                            <p className="mt-3 text-sm text-gray-500">
                                Use this prompt in Gemini or ChatGPT to generate valid JSON structures for this question type.
                            </p>
                        </div>

                        {/* ANALYTICS PREVIEW (Future) */}
                        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center">
                            <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <h4 className="font-bold text-gray-400">Analytics Preview</h4>
                            <p className="text-xs text-gray-400">Sample data visualization coming soon</p>
                        </div>
                    </div>

                    {/* RIGHT: SCHEMA & TECH */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border p-6">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Book className="w-4 h-4" /> Technical Specs
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">React Component</label>
                                    <div className="font-mono text-sm border-b border-gray-100 pb-1 mt-0.5">
                                        {selectedManifest.component.name || 'Anonymous'}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Schema Version</label>
                                    <div className="font-mono text-sm border-b border-gray-100 pb-1 mt-0.5">
                                        v{selectedManifest.version}
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                                        <CheckCircle2 size={16} />
                                        <span>Platinum Analytics Ready</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ========================================================================
    // GALLERY VIEW
    // ========================================================================
    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-2">Template Library</h1>
                    <p className="text-xl text-gray-500">Manage definitions, schemas, and AI prompts for your content types.</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Stats Summary Bubble */}
                    <div className="px-4 py-2 bg-white border rounded-full shadow-sm flex items-center gap-3 text-sm font-medium text-gray-600">
                        {isScanning ? (
                            <RefreshCw className="animate-spin text-blue-500" size={16} />
                        ) : (
                            <Database size={16} className="text-gray-400" />
                        )}
                        <span>{inventoryStats?.total || 0} Questions in Repo</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {allTypes.map(t => {
                    const manifest = registry.get(t.id);
                    if (!manifest) return null;

                    return (
                        <TemplateCard
                            key={t.id}
                            manifest={manifest}
                            stats={{ count: inventoryStats?.distribution?.[t.id]?.total }}
                            onClick={() => setSelectedTypeId(t.id)}
                        />
                    );
                })}

                {/* COMING SOON PLACEHOLDER */}
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center text-gray-400 min-h-[200px]">
                    <LayoutGrid size={32} className="mb-2 opacity-50" />
                    <div className="font-bold">More Coming Soon</div>
                    <div className="text-xs">Drag & Drop, Sortable, etc.</div>
                </div>
            </div>
        </div>
    );
};
