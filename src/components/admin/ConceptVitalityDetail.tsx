import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, CheckCircle2, AlertCircle, Search, Activity, Download } from 'lucide-react';
import { adminService } from '../../services/admin';
import { getCurriculumStats, getAllAtomsEnriched } from '../../services/curriculum';
import { QuestionStats } from '../../types/admin';

interface Props {
    onBack: () => void;
}

interface AtomRow {
    id: string;
    title: string;
    module: string;
    questionCount: number;
    status: 'ROBUST' | 'WEAK' | 'EMPTY';
}

export const ConceptVitalityDetail: React.FC<Props> = ({ onBack }) => {
    const [loading, setLoading] = useState(true);
    const [atoms, setAtoms] = useState<AtomRow[]>([]);
    const [search, setSearch] = useState('');
    const [stats, setStats] = useState<{ total: number, robust: number, weak: number, empty: number, unmapped: number }>({ total: 0, robust: 0, weak: 0, empty: 0, unmapped: 0 });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Parallel Fetch
            const [qStats, allAtoms] = await Promise.all([
                adminService.getQuestionStats(),
                getAllAtomsEnriched()
            ]);

            // Create Lookup Map for Question Counts
            const countMap = new Map<string, number>();
            let unmappedCount = 0;
            const validAtomIds = new Set(allAtoms.map(a => a.atom_id));
            const validAtomTitles = new Set(allAtoms.map(a => a.title.toLowerCase()));

            qStats.forEach(q => {
                const atomId = q.atom || 'Uncategorized';
                // Check if this matches ANY valid ID or Title
                if (validAtomIds.has(atomId) || validAtomTitles.has(atomId.toLowerCase())) {
                    countMap.set(atomId, (countMap.get(atomId) || 0) + 1);
                } else {
                    unmappedCount++;
                    // Still track it for debug
                    countMap.set(atomId, (countMap.get(atomId) || 0) + 1);
                }
            });

            // Merge Data
            const rows: AtomRow[] = allAtoms.map(atom => {
                // Try Exact ID Match first
                let count = countMap.get(atom.atom_id) || 0;

                // Try Name Match (Case Insensitive)
                if (count === 0) {
                    const matchKey = Array.from(countMap.keys()).find(k => k.toLowerCase() === atom.title.toLowerCase());
                    if (matchKey) count += countMap.get(matchKey) || 0;
                }

                let status: AtomRow['status'] = 'EMPTY';
                if (count >= 5) status = 'ROBUST';
                else if (count > 0) status = 'WEAK';

                return {
                    id: atom.atom_id,
                    title: atom.title,
                    module: atom.moduleName || 'Unknown Module',
                    questionCount: count,
                    status
                };
            });

            // Calculate Stats
            const newStats = {
                total: rows.length,
                robust: rows.filter(r => r.status === 'ROBUST').length,
                weak: rows.filter(r => r.status === 'WEAK').length,
                empty: rows.filter(r => r.status === 'EMPTY').length,
                unmapped: unmappedCount // Add this to tracking
            };

            setAtoms(rows.sort((a, b) => {
                // Sort by Status (Empty -> Weak -> Robust) then Module
                const statusOrder = { EMPTY: 0, WEAK: 1, ROBUST: 2 };
                if (statusOrder[a.status] !== statusOrder[b.status]) return statusOrder[a.status] - statusOrder[b.status];
                return a.module.localeCompare(b.module);
            }));
            setStats(newStats);

        } catch (error) {
            console.error("Failed to load vitality details", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredAtoms = useMemo(() => {
        if (!search) return atoms;
        return atoms.filter(a =>
            a.title.toLowerCase().includes(search.toLowerCase()) ||
            a.module.toLowerCase().includes(search.toLowerCase())
        );
    }, [atoms, search]);

    // Split for 2-column layout
    const midPoint = Math.ceil(filteredAtoms.length / 2);
    const leftCol = filteredAtoms.slice(0, midPoint);
    const rightCol = filteredAtoms.slice(midPoint);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-full min-h-[50vh] space-y-4">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 font-medium">Analyzing content density...</p>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header */}
            <div className="bg-white border-b px-8 py-4 sticky top-0 z-20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition text-slate-500">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Activity className="text-emerald-600" size={20} />
                            Concept Vitality Report
                        </h2>
                        <div className="flex items-center gap-4 mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                            <span>{stats.total} Total Atoms</span>
                            <span className="text-emerald-600">● {stats.robust} Robust</span>
                            <span className="text-amber-500">● {stats.weak} Weak</span>
                            <span className="text-red-500">● {stats.empty} Empty</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Filter atoms..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 rounded-lg text-sm transition-all"
                        />
                    </div>
                    <button className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-sm font-bold">
                        <Download size={14} /> Export
                    </button>
                </div>
            </div>

            {/* UNMAPPED WARNING */}
            {stats.unmapped > 0 && (
                <div className="mx-8 mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="p-2 bg-amber-100 rounded-lg">
                        <AlertCircle className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-amber-900 text-sm">Data Integrity Warning: {stats.unmapped} Ques. Unmapped</h3>
                        <p className="text-xs text-amber-700 mt-1">
                            We found {stats.unmapped} questions in your database that do not match any recognized V3 Atom ID.
                            These are likely legacy items. They will not contribute to Vitality Scores until tagged.
                        </p>
                    </div>
                    <button className="px-4 py-2 bg-white border border-amber-200 text-amber-700 font-bold text-xs rounded-lg hover:bg-amber-100 transition shadow-sm">
                        Fix Mappings
                    </button>
                </div>
            )}

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">

                    {/* Left Column */}
                    <div className="space-y-1">
                        {leftCol.map(atom => (
                            <AtomRowItem key={atom.id} atom={atom} />
                        ))}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-1">
                        {rightCol.map(atom => (
                            <AtomRowItem key={atom.id} atom={atom} />
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
};

const AtomRowItem = ({ atom }: { atom: AtomRow }) => {
    const statusColor = {
        ROBUST: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        WEAK: 'bg-amber-50 text-amber-700 border-amber-100',
        EMPTY: 'bg-red-50 text-red-700 border-red-100'
    }[atom.status];

    const icon = {
        ROBUST: <CheckCircle2 size={14} className="text-emerald-600" />,
        WEAK: <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin-slow" />, // Static indicator preferred
        EMPTY: <AlertCircle size={14} className="text-red-500" />
    }[atom.status];

    // Use specific icons correctly
    const StatusIcon = atom.status === 'ROBUST' ? CheckCircle2 : atom.status === 'EMPTY' ? AlertCircle : AlertCircle;


    return (
        <div className="group flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-default">
            <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${statusColor} bg-opacity-50`}>
                        {atom.status}
                    </span>
                    <span className="text-xs text-slate-400 truncate max-w-[150px]">{atom.module}</span>
                </div>
                <h4 className="text-sm font-semibold text-slate-700 truncate" title={atom.title}>{atom.title}</h4>
            </div>

            <div className="flex items-center gap-3">
                <div className="text-right">
                    <div className="text-lg font-bold text-slate-800 leading-tight">{atom.questionCount}</div>
                    <div className="text-[10px] text-slate-400 font-medium uppercase">Questions</div>
                </div>
                {atom.status === 'WEAK' && (
                    <button className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-md shadow-sm hover:bg-blue-700 transition">
                        Add
                    </button>
                )}
            </div>
        </div>
    );
};
