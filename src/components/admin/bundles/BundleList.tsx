import React from 'react';
import { QuestionBundleMetadata } from '../../../types/bundle';
import { Filter, Layers, Clock, Upload, Plus } from 'lucide-react';

interface BundleListProps {
    bundles: QuestionBundleMetadata[];
    loading: boolean;
    filterGrade: number | 'all';
    setFilterGrade: (g: number | 'all') => void;
    filterSubject: string;
    setFilterSubject: (s: string) => void;
    onSelectBundle: (b: QuestionBundleMetadata) => void;
    onCreateClick: () => void;
}

const SUBJECTS = [
    { id: 'math', name: 'Math' },
    { id: 'science', name: 'Science' },
    { id: 'vocabulary', name: 'Vocabulary (Words)' },
    { id: 'english', name: 'English (Grammar)' },
    { id: 'world', name: 'World (Geography/GK)' },
    { id: 'logic', name: 'Logic & Reasoning' }
];

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const BundleList: React.FC<BundleListProps> = ({
    bundles,
    loading,
    filterGrade,
    setFilterGrade,
    filterSubject,
    setFilterSubject,
    onSelectBundle,
    onCreateClick
}) => {
    const filteredBundles = bundles.filter(b => {
        if (filterGrade !== 'all' && b.grade !== filterGrade) return false;
        if (filterSubject !== 'all' && b.subject !== filterSubject) return false;
        return true;
    });

    return (
        <div className="max-w-6xl mx-auto">
            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex gap-4 items-center">
                <Filter size={20} className="text-slate-400" />
                <select
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-600"
                    value={filterGrade}
                    onChange={e => setFilterGrade(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                >
                    <option value="all">All Grades</option>
                    {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
                </select>
                <select
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-600"
                    value={filterSubject}
                    onChange={e => setFilterSubject(e.target.value)}
                >
                    <option value="all">All Subjects</option>
                    {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <div className="flex-1" />
                <button
                    onClick={onCreateClick}
                    className="hidden md:flex bg-purple-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-purple-700 shadow-md items-center gap-2"
                >
                    <Plus size={18} /> New Bundle
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? <p className="text-slate-500 font-medium p-4">Loading bundles...</p> : filteredBundles.length === 0 ? (
                    <div className="col-span-3 text-center py-20 text-slate-400">
                        <p>No bundles found matching filters.</p>
                    </div>
                ) : filteredBundles.map(b => (
                    <div key={b.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                                Grade {b.grade}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider 
                                ${b.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                {b.subject}
                            </span>
                            {b.tags?.includes('challenge') && (
                                <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1">
                                    ⚠️ Arena
                                </span>
                            )}
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2 truncate" title={b.title}>{b.title}</h3>
                        <p className="text-sm text-slate-500 mb-6 line-clamp-2 h-10">{b.description || "No description provided."}</p>

                        <div className="flex items-center gap-4 text-xs font-bold text-slate-400 mb-6">
                            <span className="flex items-center gap-1"><Layers size={14} /> {b.questionCount} Questions</span>
                            <span className="flex items-center gap-1"><Clock size={14} /> Updated {b.updatedAt?.seconds ? new Date(b.updatedAt.seconds * 1000).toLocaleDateString() : 'N/A'}</span>
                        </div>

                        <button
                            onClick={() => onSelectBundle(b)}
                            className="w-full bg-slate-50 border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-colors flex items-center justify-center gap-2"
                        >
                            <Upload size={18} /> Manage Questions
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
