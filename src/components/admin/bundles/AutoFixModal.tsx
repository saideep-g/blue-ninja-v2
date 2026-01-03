import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Wand } from 'lucide-react';
import { AutoFixCandidate } from './utils';

interface AutoFixModalProps {
    candidates: AutoFixCandidate[];
    onClose: () => void;
    onApply: (selectedIds: Set<string>) => void;
    isApplying: boolean;
}

export const AutoFixModal: React.FC<AutoFixModalProps> = ({ candidates, onClose, onApply, isApplying }) => {
    const [selectedFixIds, setSelectedFixIds] = useState<Set<string>>(new Set());

    // Initialize selection with high-confidence matches
    useEffect(() => {
        const highConfIds = candidates
            .filter(f => !f.isBestGuess)
            .map(f => f.questionId);
        setSelectedFixIds(new Set(highConfIds));
    }, [candidates]);

    const handleCheckboxChange = (id: string, checked: boolean) => {
        const newSet = new Set(selectedFixIds);
        if (checked) newSet.add(id);
        else newSet.delete(id);
        setSelectedFixIds(newSet);
    };

    const bestGuesses = candidates.filter(f => f.isBestGuess);
    const highConfidence = candidates.filter(f => !f.isBestGuess);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-purple-600 p-6 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <Wand size={24} className="text-purple-200" />
                        <div>
                            <h3 className="text-xl font-black">AI Auto-Fix</h3>
                            <p className="text-purple-200 text-sm">Review and apply suggested corrections</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black">{selectedFixIds.size}</div>
                        <div className="text-xs text-purple-200 font-bold uppercase">Selected</div>
                    </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                    {/* Group 1: High Confidence */}
                    {highConfidence.length > 0 && (
                        <div>
                            <div className="px-6 py-3 bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-wider border-b border-emerald-100 sticky top-0 z-10 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <CheckCircle size={14} />
                                    <span>High Confidence Matches</span>
                                </div>
                                <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">{highConfidence.length}</span>
                            </div>
                            {highConfidence.map((fix) => (
                                <div key={fix.questionId} className={`p-4 border-b border-slate-100 transition-colors flex gap-3
                                         ${selectedFixIds.has(fix.questionId) ? 'bg-purple-50' : 'hover:bg-slate-50'}`}>
                                    <input
                                        type="checkbox"
                                        className="mt-1 w-5 h-5 cursor-pointer accent-purple-600"
                                        checked={selectedFixIds.has(fix.questionId)}
                                        onChange={(e) => handleCheckboxChange(fix.questionId, e.target.checked)}
                                    />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-slate-700 text-sm line-clamp-1 flex-1 mr-4">{fix.questionText}</h4>
                                            <span className="bg-emerald-100 text-emerald-700 text-xs font-black px-2 py-1 rounded-full">{fix.confidence}% Match</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm">
                                            <div className="flex-1 p-2 bg-red-50 border border-red-100 rounded-lg">
                                                <span className="text-xs font-bold text-red-400 uppercase tracking-wider block mb-1">Invalid</span>
                                                <span className="text-red-700 font-bold line-through opacity-70">{fix.originalAnswer}</span>
                                            </div>
                                            <div className="text-slate-300"><CheckCircle size={16} /></div>
                                            <div className="flex-1 p-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                                                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">Fix</span>
                                                <span className="text-emerald-700 font-black">{fix.suggestedAnswer}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Group 2: Potential Matches (Best Guess) */}
                    {bestGuesses.length > 0 && (
                        <div>
                            <div className="px-6 py-3 bg-amber-50 text-amber-700 text-xs font-black uppercase tracking-wider border-t border-amber-100 sticky top-0 z-10 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <AlertCircle size={14} />
                                    <span>Potential Matches (Review Needed)</span>
                                </div>
                                <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">{bestGuesses.length}</span>
                            </div>
                            {bestGuesses.map((fix) => (
                                <div key={fix.questionId} className={`p-4 border-b border-amber-100 transition-colors flex gap-3
                                         ${selectedFixIds.has(fix.questionId) ? 'bg-amber-100/50' : 'bg-amber-50/20 hover:bg-amber-50'}`}>
                                    <input
                                        type="checkbox"
                                        className="mt-1 w-5 h-5 cursor-pointer accent-amber-600"
                                        checked={selectedFixIds.has(fix.questionId)}
                                        onChange={(e) => handleCheckboxChange(fix.questionId, e.target.checked)}
                                    />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-slate-700 text-sm line-clamp-1 flex-1 mr-4">{fix.questionText}</h4>
                                            <span className="bg-amber-100 text-amber-700 text-xs font-black px-2 py-1 rounded-full">{fix.confidence}% Match</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm">
                                            <div className="flex-1 p-2 bg-slate-50 border border-slate-100 rounded-lg">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Current</span>
                                                <span className="text-slate-600 font-bold line-through opacity-70">{fix.originalAnswer}</span>
                                            </div>
                                            <div className="text-amber-300"><Wand size={16} /></div>
                                            <div className="flex-1 p-2 bg-amber-50 border border-amber-100 rounded-lg">
                                                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block mb-1">Best Guess</span>
                                                <span className="text-amber-800 font-bold">{fix.suggestedAnswer}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onApply(selectedFixIds)}
                        disabled={isApplying || selectedFixIds.size === 0}
                        className="px-8 py-3 bg-purple-600 text-white font-bold rounded-xl shadow-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {isApplying ? 'Applying...' : `Fix Selected (${selectedFixIds.size})`}
                    </button>
                </div>
            </div>
        </div>
    );
};
