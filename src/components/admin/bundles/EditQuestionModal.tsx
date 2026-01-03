import React from 'react';
import { X } from 'lucide-react';
import { SimplifiedQuestion } from '../../../types/bundle';
import { getSimilarity } from './utils';

interface EditQuestionModalProps {
    question: SimplifiedQuestion;
    onClose: () => void;
    onSave: (q: SimplifiedQuestion) => void;
}

export const EditQuestionModal: React.FC<EditQuestionModalProps> = ({ question, onClose, onSave }) => {
    // Local state for editing to avoid mutating prop directly until save
    const [edited, setEdited] = React.useState<SimplifiedQuestion>(question);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                    <h3 className="text-xl font-black">Edit Question</h3>
                    <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Question Text</label>
                        <textarea
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-purple-400 outline-none"
                            rows={3}
                            value={edited.question}
                            onChange={e => setEdited({ ...edited, question: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Answer (Must match an option exactly)</label>
                        <input
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-400 outline-none"
                            value={edited.answer}
                            onChange={e => setEdited({ ...edited, answer: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Explanation</label>
                        <textarea
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-purple-400 outline-none"
                            rows={2}
                            value={edited.explanation || ''}
                            onChange={e => setEdited({ ...edited, explanation: e.target.value })}
                            placeholder="Explain why the answer is correct..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Options</label>
                        <div className="space-y-2">
                            {edited.options?.map((opt, idx) => {
                                const similarity = getSimilarity(edited.answer || '', opt);
                                const score = Math.round(similarity * 100);
                                let scoreColor = 'text-red-400 bg-red-50';
                                if (score === 100) scoreColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
                                else if (score > 80) scoreColor = 'text-emerald-500 bg-emerald-50';
                                else if (score > 50) scoreColor = 'text-amber-500 bg-amber-50';

                                return (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <div className="flex-1 relative">
                                            <input
                                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-purple-400 outline-none pr-16"
                                                value={opt}
                                                onChange={e => {
                                                    const newOpts = [...(edited.options || [])];
                                                    newOpts[idx] = e.target.value;
                                                    setEdited({ ...edited, options: newOpts });
                                                }}
                                            />
                                            <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded border ${scoreColor}`}>
                                                {score}% Match
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                // Quick Action: Set as Answer
                                                setEdited({ ...edited, answer: opt });
                                            }}
                                            className="px-3 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-purple-100 hover:text-purple-600 transition-colors border border-slate-200 whitespace-nowrap"
                                        >
                                            Set as Answer
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                    <button
                        onClick={() => onSave(edited)}
                        className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-xl shadow-lg hover:bg-purple-700 transition-colors"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};
