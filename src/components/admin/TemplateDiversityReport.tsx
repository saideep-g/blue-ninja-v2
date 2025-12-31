import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Layers, AlertCircle, CheckCircle2, Grid, HelpCircle, List, Box } from 'lucide-react';
import { adminService } from '../../services/admin';
import { QuestionStats } from '../../types/admin';
import { getAllAtomsEnriched } from '../../services/curriculum';

interface Props {
    onBack: () => void;
}

interface GapItem {
    atomId: string;
    atomTitle: string;
    moduleName: string;
    missingTemplate: string;
}

interface GapSummary {
    templateId: string;
    label: string;
    missingCount: number;
    gaps: GapItem[];
}

// Normalize Template IDs
const NORMALIZE_MAP: Record<string, string> = {
    'NUMERIC_INPUT': 'numeric_input',
    'MCQ_CONCEPT': 'multiple-choice',
    'MCQ_SKILL': 'multiple-choice',
    'MCQ': 'multiple-choice',
    'TWO_TIER': 'two_tier',
    'MATCHING': 'matching',
    'SORTING': 'sorting',
    'ERROR_ANALYSIS': 'multiple-choice',
    'TRANSFER_MINI': 'multiple-choice',
    'MULTI_STEP_WORD': 'multiple-choice'
};

const TEMPLATE_LABELS: Record<string, string> = {
    'numeric_input': 'Numeric Input',
    'multiple-choice': 'MCQ / Multiple Choice',
    'two_tier': 'Two-Tier Reasoning',
    'matching': 'Matching Pairs',
    'sorting': 'Sorting',
    'mcq-branching': 'Branching Scenario',
    'code_puzzle': 'Code/Parson Puzzle',
    'unknown': 'Unknown / Legacy'
};

type ViewMode = 'GAPS' | 'MATRIX' | 'INVENTORY';
type MatrixMode = 'TEMPLATE' | 'DIFFICULTY';

export const TemplateDiversityReport: React.FC<Props> = ({ onBack }) => {
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('GAPS');
    const [matrixMode, setMatrixMode] = useState<MatrixMode>('TEMPLATE');

    // Gap Data
    const [complianceScore, setComplianceScore] = useState(0);
    const [gapSummaries, setGapSummaries] = useState<GapSummary[]>([]);
    const [selectedGap, setSelectedGap] = useState<string | null>(null);

    // Matrix Data Cache
    const [statsCache, setStatsCache] = useState<{ qs: QuestionStats[], atoms: any[] } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [qStats, atoms] = await Promise.all([
                adminService.getQuestionStats(),
                getAllAtomsEnriched()
            ]);

            setStatsCache({ qs: qStats, atoms });
            processGaps(qStats, atoms);

        } catch (error) {
            console.error("Analysis failed", error);
        } finally {
            setLoading(false);
        }
    };

    // Logic 1: Gap Analysis (Existing)
    const processGaps = (qStats: QuestionStats[], atoms: any[]) => {
        const inventory = new Map<string, Set<string>>();
        qStats.forEach(q => {
            const atomId = q.atom || 'Uncategorized';
            let type = (q.type || 'unknown').toLowerCase().replace('legacy_', '');
            if (['mcq', 'mcq_concept', 'mcq_skill'].includes(type)) type = 'multiple-choice';
            if (!inventory.has(atomId)) inventory.set(atomId, new Set());
            inventory.get(atomId)?.add(type);
        });

        const summaries: Record<string, GapSummary> = {};
        let totalRequirements = 0;
        let metRequirements = 0;

        atoms.forEach(atom => {
            const requiredTemplates = atom.template_ids || [];
            const availableTemplates = inventory.get(atom.atom_id) || new Set();

            requiredTemplates.forEach((req: string) => {
                const normalizedReq = NORMALIZE_MAP[req] || 'unknown_req';
                const isMet = availableTemplates.has(normalizedReq);
                totalRequirements++;
                if (isMet) metRequirements++;
                else {
                    if (!summaries[normalizedReq]) {
                        summaries[normalizedReq] = {
                            templateId: normalizedReq,
                            label: TEMPLATE_LABELS[normalizedReq] || normalizedReq,
                            missingCount: 0,
                            gaps: []
                        };
                    }
                    summaries[normalizedReq].missingCount++;
                    summaries[normalizedReq].gaps.push({
                        atomId: atom.atom_id,
                        atomTitle: atom.title,
                        moduleName: atom.moduleName || 'Unknown Module',
                        missingTemplate: req
                    });
                }
            });
        });

        const score = totalRequirements > 0 ? Math.round((metRequirements / totalRequirements) * 100) : 0;
        setComplianceScore(score);
        setGapSummaries(Object.values(summaries).sort((a, b) => b.missingCount - a.missingCount));
    };

    const matrixGrid = useMemo(() => {
        if (!statsCache) return null;
        const { qs, atoms } = statsCache;

        // 1. Setup Rows (Modules) 
        const validModules = new Set(atoms.map(a => a.moduleName || 'General'));
        const modules = Array.from(validModules).sort();

        // 2. Setup Columns & Helpers
        const isTemplateMode = matrixMode === 'TEMPLATE';
        const cols = isTemplateMode
            ? ['multiple-choice', 'two_tier', 'matching', 'sorting', 'numeric_input', 'mcq-branching']
            : ['EASY', 'MEDIUM', 'HARD'];

        // 3. Atom -> Module Map & Requirements Map
        const atomToModule = new Map<string, string>();
        const moduleRequirements = new Map<string, Set<string>>();

        modules.forEach(m => moduleRequirements.set(m, new Set()));

        atoms.forEach(a => {
            const mod = a.moduleName || 'General';
            atomToModule.set(a.atom_id, mod);
            if (a.template_ids && Array.isArray(a.template_ids)) {
                a.template_ids.forEach((tId: string) => {
                    const normId = NORMALIZE_MAP[tId];
                    if (normId) moduleRequirements.get(mod)?.add(normId);
                });
            }
        });

        const grid: Record<string, Record<string, number>> = {};
        const colTotals: Record<string, number> = {};
        cols.forEach(c => colTotals[c] = 0);

        modules.forEach(m => {
            grid[m] = {};
            cols.forEach(c => grid[m][c] = 0);
        });

        let unmappedCount = 0;

        qs.forEach(q => {
            let mod = 'General';
            if (q.atom && atomToModule.has(q.atom)) {
                mod = atomToModule.get(q.atom)!;
            } else {
                unmappedCount++;
                if (!grid[mod]) return;
            }

            let key = '';
            if (isTemplateMode) {
                let type = (q.type || 'unknown').toLowerCase().replace('legacy_', '');
                if (['mcq', 'mcq_concept', 'mcq_skill', 'multiple_choice'].includes(type)) type = 'multiple-choice';
                key = type;
            } else {
                const d = (q.difficulty || 'MEDIUM').toLowerCase().trim();
                if (['easy', 'beginner', '1'].includes(d)) key = 'EASY';
                else if (['hard', 'advanced', '3'].includes(d)) key = 'HARD';
                else key = 'MEDIUM';
            }

            if (grid[mod][key] !== undefined) {
                grid[mod][key]++;
                colTotals[key]++;
            }
        });

        return { rows: modules, cols, grid, colTotals, moduleRequirements, unmappedCount };

    }, [statsCache, matrixMode]);

    const inventoryData = useMemo(() => {
        if (!statsCache) return [];
        const counts: Record<string, number> = {};

        statsCache.qs.forEach(q => {
            let type = (q.type || 'unknown').toLowerCase().replace('legacy_', '');
            if (['mcq', 'mcq_concept', 'mcq_skill', 'multiple_choice'].includes(type)) type = 'multiple-choice';
            // Clean up other potential inconsistencies if needed
            counts[type] = (counts[type] || 0) + 1;
        });

        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => ({
                type,
                label: TEMPLATE_LABELS[type] || type.replace(/_/g, ' ').toUpperCase(),
                count,
                percent: Math.round((count / statsCache.qs.length) * 100)
            }));
    }, [statsCache]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-full min-h-[50vh] space-y-4">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-purple-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 font-medium">Analyzing curriculum dimensions...</p>
        </div>
    );

    const activeGap = gapSummaries.find(g => g.templateId === selectedGap);

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header */}
            <div className="bg-white border-b px-8 py-4 sticky top-0 z-20 flex flex-col md:flex-row items-center justify-between shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition text-slate-500">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Layers className="text-purple-600" size={20} />
                            Curriculum Health Dashboard
                        </h2>
                        <div className="text-xs font-medium text-slate-500 mt-1 flex gap-3">
                            <span>{complianceScore}% Pedagogical Fit</span>
                            <span>•</span>
                            <span>{statsCache?.qs.length || 0} Questions</span>
                        </div>
                    </div>
                </div>

                {/* View Toggles */}
                <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
                    <button
                        onClick={() => setViewMode('GAPS')}
                        className={`px-4 py-2 text-xs font-bold rounded-md transition flex items-center gap-2 ${viewMode === 'GAPS' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <AlertCircle size={14} /> Gap Analysis
                    </button>
                    <button
                        onClick={() => setViewMode('MATRIX')}
                        className={`px-4 py-2 text-xs font-bold rounded-md transition flex items-center gap-2 ${viewMode === 'MATRIX' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Grid size={14} /> Coverage Matrix
                    </button>
                    <button
                        onClick={() => setViewMode('INVENTORY')}
                        className={`px-4 py-2 text-xs font-bold rounded-md transition flex items-center gap-2 ${viewMode === 'INVENTORY' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Box size={14} /> Template Inventory
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">

                {viewMode === 'GAPS' && (
                    // ================== GAP ANALYSIS VIEW ==================
                    <>
                        <div className="flex-1 overflow-y-auto p-8 border-r border-slate-200">
                            <div className="max-w-3xl mx-auto space-y-6">
                                <div className="flex items-center gap-4 p-4 bg-purple-50 border border-purple-100 rounded-xl">
                                    <div className="p-3 bg-white rounded-full shadow-sm">
                                        <span className="text-xl font-bold text-purple-600">{complianceScore}%</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-purple-900">Health Score</h3>
                                        <p className="text-xs text-purple-700">Percentage of required formats present in inventory.</p>
                                    </div>
                                </div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Missing Formats by Priority</h3>
                                <div className="grid gap-3">
                                    {gapSummaries.map((summary) => (
                                        <div
                                            key={summary.templateId}
                                            onClick={() => setSelectedGap(summary.templateId)}
                                            className={`p-4 bg-white border rounded-xl cursor-pointer hover:shadow-md transition-all group ${selectedGap === summary.templateId ? 'border-purple-400 ring-1 ring-purple-100' : 'border-slate-200'}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${selectedGap === summary.templateId ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                                                        <AlertCircle size={18} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800">{summary.label}</h4>
                                                        <p className="text-xs text-slate-500">Required in {summary.missingCount} atoms but missing</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-full group-hover:bg-purple-100 group-hover:text-purple-700 transition">
                                                        {summary.missingCount} Gaps
                                                    </span>
                                                    <ArrowLeft className="rotate-180 text-slate-300 group-hover:text-purple-400" size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className={`w-96 bg-white border-l border-slate-200 shadow-xl transform transition-transform duration-300 ${selectedGap ? 'translate-x-0' : 'translate-x-full'} absolute right-0 top-16 bottom-0`}>
                            {activeGap && (
                                <div className="flex flex-col h-full">
                                    <div className="p-6 border-b border-slate-100 bg-slate-50">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-800">Missing: {activeGap.label}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase rounded">Action Required</span>
                                                </div>
                                            </div>
                                            <button onClick={() => setSelectedGap(null)} className="text-slate-400 hover:text-slate-600">×</button>
                                        </div>
                                        <p className="text-sm text-slate-500 mt-2">Use this list to prompt AI for generation.</p>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-0">
                                        {activeGap.gaps.map((item, idx) => (
                                            <div key={idx} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition group">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{item.moduleName}</div>
                                                <div className="font-semibold text-slate-800 text-sm mb-1">{item.atomTitle}</div>
                                                <div className="text-xs text-slate-400 font-mono">{item.atomId}</div>
                                                <button className="mt-3 w-full py-1.5 text-xs font-bold text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition opacity-0 group-hover:opacity-100">
                                                    Generate {activeGap.label}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {viewMode === 'MATRIX' && (
                    // ================== MATRIX VIEW ==================
                    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
                        <div className="px-8 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-sm">
                            <div className="flex items-center gap-4">
                                <span className="text-slate-500 font-bold uppercase tracking-wider text-xs">Dimension:</span>
                                <div className="flex bg-white rounded-lg border border-slate-200 p-0.5 shadow-sm">
                                    <button
                                        onClick={() => setMatrixMode('TEMPLATE')}
                                        className={`px-3 py-1.5 rounded-md font-bold text-xs transition ${matrixMode === 'TEMPLATE' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        By Format
                                    </button>
                                    <button
                                        onClick={() => setMatrixMode('DIFFICULTY')}
                                        className={`px-3 py-1.5 rounded-md font-bold text-xs transition ${matrixMode === 'DIFFICULTY' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        By Difficulty
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span className="font-bold mr-2">Status:</span>
                                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-200 rounded-full"></div> N/A</div>
                                <div className="flex items-center gap-1 ml-2"><div className="w-2 h-2 bg-red-400 rounded-full"></div> Critical Gap</div>
                                <div className="flex items-center gap-1 ml-2"><div className="w-2 h-2 bg-amber-400 rounded-full"></div> Minimal</div>
                                <div className="flex items-center gap-1 ml-2"><div className="w-2 h-2 bg-emerald-400 rounded-full"></div> Robust</div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-8">
                            {matrixGrid && (
                                <div className="inline-block min-w-full align-middle">
                                    <table className="min-w-full text-sm border-separate border-spacing-1.5">
                                        <thead>
                                            <tr>
                                                <th className="bg-white sticky top-0 left-0 z-10 p-3 text-left font-bold text-slate-800 border-b-2 w-64 shadow-sm rounded-lg">Chapter / Module</th>
                                                {matrixGrid.cols.map(col => (
                                                    <th key={col} className="bg-white sticky top-0 z-0 p-3 text-center font-bold text-slate-600 border-b w-32 shadow-sm text-xs uppercase tracking-wider rounded-lg">
                                                        {TEMPLATE_LABELS[col] || col}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white">
                                            {matrixGrid.rows.map(row => (
                                                <tr key={row} className="hover:bg-slate-50 transition group">
                                                    <td className="bg-slate-50 sticky left-0 z-0 p-3 font-medium text-slate-700 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] text-xs rounded-l-lg truncate max-w-[200px]" title={row}>{row}</td>
                                                    {matrixGrid.cols.map(col => {
                                                        const count = matrixGrid.grid[row][col] || 0;
                                                        const isRequired = matrixMode === 'DIFFICULTY' ? true : matrixGrid.moduleRequirements.get(row)?.has(col);
                                                        let bg = 'bg-slate-50', text = 'text-slate-300', border = 'border-transparent', content: React.ReactNode = count;

                                                        if (!isRequired && count === 0) {
                                                            bg = 'bg-slate-100 opacity-50';
                                                            text = 'text-slate-300';
                                                            content = <span className="text-xs">-</span>;
                                                        } else {
                                                            if (count === 0) { bg = 'bg-red-50 group-hover:bg-red-100'; text = 'text-red-400'; border = 'border-red-100'; }
                                                            else if (count < 3) { bg = 'bg-amber-50 group-hover:bg-amber-100'; text = 'text-amber-600'; border = 'border-amber-100'; }
                                                            else { bg = 'bg-emerald-50 group-hover:bg-emerald-100'; text = 'text-emerald-600'; border = 'border-emerald-100'; }
                                                        }

                                                        return (
                                                            <td key={`${row}-${col}`} className={`p-3 text-center rounded-lg border ${border} ${bg} cursor-pointer transition-colors relative group/cell`}>
                                                                <span className={`font-bold ${text}`}>{content}</span>
                                                                {count < 5 && isRequired && (
                                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 backdrop-blur-[1px] transition-opacity">
                                                                        <span className="bg-white shadow-md border border-slate-200 text-[10px] font-bold px-2 py-1 rounded-full text-blue-600 whitespace-nowrap">+ Add</span>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-100 font-bold text-slate-800">
                                            <tr>
                                                <td className="p-3 text-left border-t-2 border-slate-300 rounded-bl-lg">TOTALS <span className="text-[10px] font-normal text-slate-500">{matrixGrid.unmappedCount > 0 && `(+${matrixGrid.unmappedCount} unmapped)`}</span></td>
                                                {matrixGrid.cols.map(col => (
                                                    <td key={col} className="p-3 text-center border-t-2 border-slate-300">{matrixGrid.colTotals[col]}</td>
                                                ))}
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                            <div className="mt-8 text-center text-xs text-slate-400 max-w-2xl mx-auto p-4 border border-dashed rounded-xl flex items-start gap-3">
                                <HelpCircle className="shrink-0" size={16} />
                                <div className="text-left">
                                    <strong>How to read this matrix:</strong>
                                    <ul className="list-disc pl-4 mt-1 space-y-1">
                                        <li><strong>Gray cells (-):</strong> Format not explicitly required by curriculum for this chapter.</li>
                                        <li><strong>Red cells (0):</strong> Critical gaps. Chapter requires this format but has none.</li>
                                        <li><strong>Totals:</strong> Bottom row shows total questions matched to these columns. Unmapped questions are excluded.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'INVENTORY' && (
                    // ================== INVENTORY VIEW ==================
                    <div className="flex-1 overflow-auto p-8 bg-slate-50/50">
                        <div className="max-w-4xl mx-auto">
                            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Box className="text-purple-600" size={20} />
                                Total Content Inventory
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {inventoryData.map((item) => (
                                    <div key={item.type} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="text-sm font-bold text-slate-700">{item.label}</div>
                                            <div className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{item.percent}%</div>
                                        </div>
                                        <div className="mt-auto">
                                            <div className="text-3xl font-bold text-slate-800">{item.count}</div>
                                            <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mt-1">Questions</div>
                                        </div>
                                        <div className="w-full bg-slate-100 h-1 mt-4 rounded-full overflow-hidden">
                                            <div className="bg-purple-600 h-full rounded-full" style={{ width: `${item.percent}%` }}></div>
                                        </div>
                                        <div className="mt-3 text-[10px] text-slate-400 font-mono">
                                            ID: {item.type}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 text-center text-xs text-slate-400 p-4 border border-dashed rounded-xl bg-slate-50">
                                Showing all question forms detected in the database, including legacy types not used in current reporting.
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
