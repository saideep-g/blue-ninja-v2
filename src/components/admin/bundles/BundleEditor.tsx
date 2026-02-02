import React, { useState, useEffect } from 'react';
import {
    doc, getDoc, updateDoc, writeBatch, increment, serverTimestamp, addDoc, collection
} from 'firebase/firestore';
import { db } from '../../../services/db/firebase';
import { QuestionBundleMetadata, SimplifiedQuestion } from '../../../types/bundle';
import { Check, Download, FileJson, CheckCircle, BookOpen, Search, X, AlertCircle, Copy, Wand, Layers, Edit, AlertOctagon } from 'lucide-react';
import { AutoFixCandidate, getSimilarity } from './utils';
import { EditQuestionModal } from './EditQuestionModal';
import { AutoFixModal } from './AutoFixModal';
import { BundlePreviewSimulator } from './BundlePreviewSimulator';
import { Play } from 'lucide-react';

interface BundleEditorProps {
    bundle: QuestionBundleMetadata;
    onBack: () => void;
    onUpdateBundle: (updatedBundle: QuestionBundleMetadata) => void;
}

export const BundleEditor: React.FC<BundleEditorProps> = ({ bundle, onBack, onUpdateBundle }) => {
    // --- State ---
    const [existingQuestions, setExistingQuestions] = useState<SimplifiedQuestion[]>([]);
    const [parsedQuestions, setParsedQuestions] = useState<SimplifiedQuestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Validation
    const [invalidQuestionIds, setInvalidQuestionIds] = useState<Set<string>>(new Set());
    const [duplicateQuestionIds, setDuplicateQuestionIds] = useState<Set<string>>(new Set());
    const [showInvalidOnly, setShowInvalidOnly] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<SimplifiedQuestion | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Auto-Fix
    const [fixCandidates, setFixCandidates] = useState<AutoFixCandidate[]>([]);
    const [showFixModal, setShowFixModal] = useState(false);

    // Preview
    const [showPreview, setShowPreview] = useState(false);
    const [previewIndex, setPreviewIndex] = useState(0);

    // --- Effects ---
    useEffect(() => {
        fetchExistingQuestions(bundle.id);
    }, [bundle.id]);

    // --- Logic ---
    const validateQuestions = (questions: SimplifiedQuestion[]) => {
        const invalidSet = new Set<string>();
        questions.forEach((q, index) => {
            const id = q.id || `temp_${index}`;
            const template = q.template_id?.toUpperCase();

            // Skip option validation for Numeric types
            if (template === 'NUMERIC_AUTO' || template === 'NUMERIC') {
                if (!q.answer) invalidSet.add(id); // Just ensure answer exists
                return;
            }

            // SHORT_ANSWER Validation
            if (template === 'SHORT_ANSWER') {
                if (!q.model_answer || !q.evaluation_criteria || q.evaluation_criteria.length === 0) {
                    invalidSet.add(id);
                }
                return;
            }

            // MCQ Validation (Default)
            // Ensure answer exists in options
            if (!q.options || q.options.length === 0) {
                // Open ended or invalid MCQ
                // If no template specified, we assume MCQ simplified, so require options
                invalidSet.add(id);
                return;
            }

            const normalizedAnswer = q.answer?.toString().trim().toLowerCase();
            const hasMatch = q.options?.some(opt => opt.toString().trim().toLowerCase() === normalizedAnswer);
            if (!hasMatch) invalidSet.add(id);
        });
        return invalidSet;
    };

    const checkForDuplicates = (questions: SimplifiedQuestion[]) => {
        const textMap = new Map<string, string[]>();
        const duplicateSet = new Set<string>();
        questions.forEach((q, index) => {
            const id = q.id || `temp_${index}`;
            const normalizedText = q.question.trim().toLowerCase();
            if (textMap.has(normalizedText)) {
                const existingIds = textMap.get(normalizedText)!;
                existingIds.push(id);
                existingIds.forEach(dupId => duplicateSet.add(dupId));
            } else {
                textMap.set(normalizedText, [id]);
            }
        });
        return duplicateSet;
    };

    const checkAutoFixCandidates = (questions: SimplifiedQuestion[]) => {
        const candidates: AutoFixCandidate[] = [];
        questions.forEach(q => {
            if (!q.options) return; // Skip if no options (e.g. Numeric)

            const normalizedAnswer = q.answer?.toString().trim().toLowerCase();
            const hasMatch = q.options?.some(opt => opt.toString().trim().toLowerCase() === normalizedAnswer);

            if (!hasMatch && q.options && q.answer && q.options.length > 0) {
                const scoredOptions = q.options.map(opt => ({
                    option: opt,
                    score: getSimilarity(q.answer!, opt)
                }));
                scoredOptions.sort((a, b) => b.score - a.score);

                const best = scoredOptions[0];
                const secondBest = scoredOptions.length > 1 ? scoredOptions[1] : { score: 0 };

                const isHighConfidence = best.score > 0.80;
                const isClearWinner = (best.score - secondBest.score) > 0.15 && best.score > 0.4;
                const isBestGuess = !isHighConfidence && !isClearWinner && best.score > 0.4;

                if (isHighConfidence || isClearWinner || isBestGuess) {
                    candidates.push({
                        questionId: q.id!,
                        questionText: q.question,
                        originalAnswer: q.answer!,
                        suggestedAnswer: best.option,
                        confidence: Math.round(best.score * 100),
                        isBestGuess: isBestGuess
                    });
                }
            }
        });
        setFixCandidates(candidates);
    };

    const fetchExistingQuestions = async (bundleId: string) => {
        setLoading(true);
        try {
            const docRef = doc(db, 'question_bundle_data', bundleId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                if (data.questions) {
                    const qList = Object.values(data.questions) as SimplifiedQuestion[];
                    setExistingQuestions(qList);

                    const invalid = validateQuestions(qList);
                    setInvalidQuestionIds(invalid);
                    const duplicates = checkForDuplicates(qList);
                    setDuplicateQuestionIds(duplicates);
                    checkAutoFixCandidates(qList);
                }
            } else {
                setExistingQuestions([]);
            }
        } catch (e) {
            console.error("Failed to load questions", e);
        } finally {
            setLoading(false);
        }
    };

    const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = event.target?.result as string;
                const parsed = JSON.parse(json);
                let questionsArray = [];
                if (Array.isArray(parsed)) {
                    questionsArray = parsed;
                } else if (parsed && Array.isArray(parsed.questions)) {
                    questionsArray = parsed.questions;
                }

                if (questionsArray.length > 0) {
                    setParsedQuestions(questionsArray);
                } else {
                    alert("JSON must contain a 'questions' array or be an array of questions.");
                }
            } catch (err) {
                alert("Invalid JSON format");
            }
        };
        reader.readAsText(file);
    };

    const commitToFirestore = async () => {
        if (!parsedQuestions.length) return;

        const existingIds = new Set(existingQuestions.filter(q => q.id).map(q => q.id));
        const duplicates = parsedQuestions.filter(q => q.id && existingIds.has(q.id));

        if (duplicates.length > 0) {
            const confirmed = window.confirm(
                `⚠️ DUPLICATE ID WARNING\nFound ${duplicates.length} duplicate IDs (e.g. ${duplicates[0].id}).\nThese will be UPDATED. Proceed?`
            );
            if (!confirmed) return;
        }

        setUploading(true);
        try {
            const batch = writeBatch(db);
            const dataDocRef = doc(db, 'question_bundle_data', bundle.id);
            const questionsMap: Record<string, any> = {};

            parsedQuestions.forEach(q => {
                const finalId = q.id || `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                questionsMap[finalId] = {
                    ...q,
                    id: finalId,
                    updatedAt: new Date().toISOString()
                };
            });

            batch.set(dataDocRef, { questions: questionsMap }, { merge: true });

            const newQuestionsCount = parsedQuestions.length - duplicates.length;
            const parentRef = doc(db, 'question_bundles', bundle.id);
            batch.update(parentRef, {
                questionCount: increment(newQuestionsCount),
                updatedAt: serverTimestamp()
            });

            await batch.commit();
            alert(`Successfully uploaded ${parsedQuestions.length} questions!`);
            setParsedQuestions([]);
            fetchExistingQuestions(bundle.id);
            // We should also likely update the parent bundle object question count locally
            // But fetchBundles in parent will handle it on next load.
            // onUpdateBundle({...bundle, questionCount: bundle.questionCount + newQuestionsCount}) could work but types might mismatch on date
        } catch (e) {
            console.error("Upload failed", e);
            alert("Upload failed. Check console.");
        } finally {
            setUploading(false);
        }
    };

    const toggleBundleTag = async (tag: string) => {
        const currentTags = bundle.tags || [];
        const hasTag = currentTags.includes(tag);
        const newTags = hasTag ? currentTags.filter(t => t !== tag) : [...currentTags, tag];

        // Optimistic
        onUpdateBundle({ ...bundle, tags: newTags });

        try {
            const ref = doc(db, 'question_bundles', bundle.id);
            await updateDoc(ref, { tags: newTags, updatedAt: serverTimestamp() });
        } catch (e) {
            console.error("Failed to update tags", e);
            // Revert
            onUpdateBundle({ ...bundle, tags: currentTags });
            alert("Failed to update setting");
        }
    };

    const handleUpdateQuestion = async (updatedQ: SimplifiedQuestion) => {
        if (!updatedQ.id) return;
        try {
            const bundleRef = doc(db, 'question_bundle_data', bundle.id);
            await updateDoc(bundleRef, { [`questions.${updatedQ.id}`]: updatedQ });

            const updatedList = existingQuestions.map(q => q.id === updatedQ.id ? updatedQ : q);
            setExistingQuestions(updatedList);
            // Re-validate
            setInvalidQuestionIds(validateQuestions(updatedList));
            setDuplicateQuestionIds(checkForDuplicates(updatedList));
            checkAutoFixCandidates(updatedList);
            setEditingQuestion(null);
        } catch (e) {
            console.error("Update failed", e);
            alert("Failed to update question.");
        }
    };

    const handleApplyFixes = async (selectedIds: Set<string>) => {
        const fixesToApply = fixCandidates.filter(f => selectedIds.has(f.questionId));
        if (fixesToApply.length === 0) return;

        setUploading(true);
        try {
            const batch = writeBatch(db); // Not using batch here actually, using single updateDoc with map
            const bundleRef = doc(db, 'question_bundle_data', bundle.id);
            const updates: Record<string, any> = {};
            const updatedList = [...existingQuestions];

            fixesToApply.forEach(fix => {
                updates[`questions.${fix.questionId}.answer`] = fix.suggestedAnswer;
                const qIndex = updatedList.findIndex(q => q.id === fix.questionId);
                if (qIndex !== -1) {
                    updatedList[qIndex] = { ...updatedList[qIndex], answer: fix.suggestedAnswer };
                }
            });

            await updateDoc(bundleRef, updates);

            setExistingQuestions(updatedList);
            setInvalidQuestionIds(validateQuestions(updatedList));
            setDuplicateQuestionIds(checkForDuplicates(updatedList));
            checkAutoFixCandidates(updatedList);
            setFixCandidates([]);
            setShowFixModal(false);
            alert(`Successfully auto-corrected ${fixesToApply.length} questions!`);
        } catch (e) {
            console.error("Auto fix failed", e);
            alert("Failed to apply fixes.");
        } finally {
            setUploading(false);
        }
    };

    const handleFlagQuestion = async (q: SimplifiedQuestion) => {
        if (!q.id) return;
        const reason = prompt("Enter a reason for flagging this question (optional):");
        if (reason === null) return; // Cancelled

        try {
            await addDoc(collection(db, 'review_queue'), {
                bundleId: bundle.id,
                questionId: q.id,
                questionSnapshot: q,
                reason: reason || "Flagged manually",
                flaggedAt: serverTimestamp(),
                status: 'pending'
            });
            alert("Question flagged for review.");
        } catch (e) {
            console.error("Flag failed", e);
            alert("Failed to flag question.");
        }
    };

    // --- Download Utilities ---
    const downloadTemplate = () => {
        const template = {
            "metadata": {
                "grade": "2",
                "subject": "Math",
                "template_id": "MCQ_SIMPLIFIED",
                "created_at": new Date().toISOString().split('T')[0]
            },
            "questions": [{
                "id": "m1_001",
                "chapter_id": "m1",
                "question": "Question text using $Latex$ for math.",
                "options": ["Opt1", "Opt2", "Opt3", "Opt4"],
                "answer": "CorrectOpt",
                "difficulty": "hard",
                "explanation": "Kid-friendly explanation."
            }]
        };
        downloadJSON(template, 'simplified_mcq_template.json');
    };

    const downloadInvalidQuestions = () => {
        const invalidQs = existingQuestions.filter(q => invalidQuestionIds.has(q.id || ''));
        if (invalidQs.length === 0) return alert("None found.");
        downloadJSON(invalidQs, `invalid_qs_${bundle.id}.json`);
    };

    const downloadDuplicateQuestions = () => {
        const duplicateQs = existingQuestions.filter(q => duplicateQuestionIds.has(q.id || ''));
        if (duplicateQs.length === 0) return alert("None found.");
        downloadJSON(duplicateQs, `duplicate_qs_${bundle.id}.json`);
    };

    const downloadJSON = (data: any, filename: string) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <button onClick={onBack} className="mb-6 font-bold text-slate-400 hover:text-slate-600">← Back to Bundles</button>

            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                {/* Header */}
                <div className="bg-slate-900 p-8 text-white flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-black mb-2">{bundle.title}</h2>
                        <div className="flex gap-4 opacity-80 font-mono text-sm">
                            <span>Grade {bundle.grade}</span>
                            <span>•</span>
                            <span className="uppercase">{bundle.subject}</span>
                            <span>•</span>
                            <span>{existingQuestions.length} Questions</span>
                        </div>
                    </div>
                    <button
                        onClick={() => toggleBundleTag('challenge')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${bundle.tags?.includes('challenge')
                            ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/50'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20'
                            }`}
                    >
                        {bundle.tags?.includes('challenge') ? (
                            <div className="bg-white text-purple-600 rounded-full p-0.5"><Check size={12} /></div>
                        ) : (
                            <div className="w-4 h-4 border-2 border-slate-500 rounded-md" />
                        )}
                        <span className="font-bold text-sm">Arena Ready</span>
                    </button>

                    <button
                        onClick={() => {
                            setPreviewIndex(0);
                            setShowPreview(true);
                        }}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl border-2 border-indigo-500/30 bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 hover:border-indigo-500 transition-all shadow-lg shadow-indigo-900/20 active:scale-95"
                    >
                        <Play size={16} fill="currentColor" />
                        <span>Live Preview</span>
                    </button>
                </div>

                <div className="p-8">
                    {/* Actions */}
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-slate-800">Add Questions via JSON</h3>
                        <button onClick={downloadTemplate} className="text-sm font-bold text-purple-600 hover:underline flex items-center gap-1">
                            <Download size={16} /> Download Template
                        </button>
                    </div>

                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-purple-300 transition-colors bg-slate-50/50 mb-8">
                        <FileJson className="mx-auto text-slate-300 mb-4" size={48} />
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleJsonUpload}
                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 mb-4"
                        />
                        <p className="text-xs text-slate-400">Upload a .json file containing an array of simplified questions.</p>
                    </div>

                    {parsedQuestions.length > 0 && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-emerald-600 flex items-center gap-2">
                                    <CheckCircle size={20} /> {parsedQuestions.length} Questions Ready
                                </h4>
                                <button
                                    onClick={commitToFirestore}
                                    disabled={uploading}
                                    className="bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-600 shadow-lg disabled:opacity-50"
                                >
                                    {uploading ? 'Uploading...' : 'Confirm & Upload'}
                                </button>
                            </div>
                            <div className="max-h-96 overflow-y-auto bg-slate-900 rounded-xl p-4 text-xs font-mono text-green-400">
                                <pre>{JSON.stringify(parsedQuestions, null, 2)}</pre>
                            </div>
                        </div>
                    )}

                    {/* Existing Questions List */}
                    <div className="mt-12 border-t border-slate-100 pt-8">
                        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                            <BookOpen className="text-purple-500" />
                            Existing Questions ({existingQuestions.length})
                        </h3>

                        {/* Search Bar */}
                        <div className="mb-6 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search questions by text or ID..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-purple-400 outline-none shadow-sm"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Validation Summary */}
                        <div className="mb-6 flex items-center gap-4 flex-wrap">
                            {invalidQuestionIds.size === 0 && duplicateQuestionIds.size === 0 ? (
                                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg font-bold text-sm border border-emerald-100">
                                    <CheckCircle size={18} />
                                    <span>All questions validated! No issues found.</span>
                                </div>
                            ) : (
                                <>
                                    {invalidQuestionIds.size > 0 && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setShowInvalidOnly(!showInvalidOnly)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-l-lg font-bold text-sm border transition-all
                                                            ${showInvalidOnly ? 'bg-red-600 text-white border-red-600' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}
                                            >
                                                <AlertCircle size={18} />
                                                <span>{invalidQuestionIds.size} Invalid</span>
                                            </button>
                                            <button
                                                onClick={downloadInvalidQuestions}
                                                className="px-3 py-2 bg-white border border-l-0 border-red-200 rounded-r-lg text-red-600 hover:bg-red-50"
                                            >
                                                <Download size={16} />
                                            </button>
                                        </div>
                                    )}
                                    {duplicateQuestionIds.size > 0 && (
                                        <div className="flex items-center gap-1">
                                            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-l-lg font-bold text-sm border border-amber-200">
                                                <Copy size={18} />
                                                <span>{duplicateQuestionIds.size} Duplicates</span>
                                            </div>
                                            <button
                                                onClick={downloadDuplicateQuestions}
                                                className="px-3 py-2 bg-white border border-l-0 border-amber-200 rounded-r-lg text-amber-600 hover:bg-amber-50"
                                            >
                                                <Download size={16} />
                                            </button>
                                        </div>
                                    )}
                                    {fixCandidates.length > 0 && (
                                        <button
                                            onClick={() => setShowFixModal(true)}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 animate-pulse"
                                        >
                                            <Wand size={16} />
                                            <span>Auto-Fix {fixCandidates.length} Issues</span>
                                        </button>
                                    )}
                                </>
                            )}
                        </div>

                        {/* List */}
                        <div className="space-y-4">
                            {existingQuestions.filter(q => {
                                if (showInvalidOnly) return invalidQuestionIds.has(q.id || '') || duplicateQuestionIds.has(q.id || '');
                                return true;
                            }).filter(q => {
                                if (!searchQuery) return true;
                                const query = searchQuery.toLowerCase();
                                return (q.question.toLowerCase().includes(query) || (q.id && q.id.toLowerCase().includes(query)));
                            }).map((q, i) => {
                                const isInvalid = invalidQuestionIds.has(q.id || '');
                                const isDuplicate = duplicateQuestionIds.has(q.id || '');
                                const borderClass = isInvalid ? 'border-red-300 ring-2 ring-red-100' : isDuplicate ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200';
                                const bgClass = isInvalid ? 'bg-red-50/30' : isDuplicate ? 'bg-amber-50/30' : 'bg-white';

                                return (
                                    <div
                                        key={i}
                                        onClick={() => {
                                            setPreviewIndex(i);
                                            setShowPreview(true);
                                        }}
                                        className={`${bgClass} border ${borderClass} p-4 rounded-xl flex gap-4 items-start shadow-sm cursor-pointer hover:border-indigo-300 hover:ring-2 hover:ring-indigo-50 transition-all group`}
                                    >
                                        <span className={`px-2 py-1 rounded-md text-xs font-mono font-bold ${isInvalid ? 'bg-red-100 text-red-600' : isDuplicate ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                            {q.id || `#${i + 1}`}
                                        </span>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <p className="font-bold text-slate-800 text-sm mb-1 group-hover:text-indigo-600 transition-colors">{q.question}</p>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingQuestion(q);
                                                        }}
                                                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-purple-600"
                                                        title="Edit"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleFlagQuestion(q);
                                                        }}
                                                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-amber-500"
                                                        title="Flag for Review"
                                                    >
                                                        <AlertOctagon size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 text-xs flex-wrap">
                                                <span className={`${isInvalid ? 'text-red-600 border-b-2 border-red-200' : 'text-emerald-600'} font-bold`}>Ans: {q.answer}</span>
                                                <span className="text-slate-400">•</span>
                                                <span className="text-slate-500">
                                                    {q.options?.map(opt => {
                                                        const isMatch = opt.toString().trim().toLowerCase() === q.answer?.toString().trim().toLowerCase();
                                                        return isMatch ? <b key={opt} className="text-emerald-600 underline decoration-2">{opt}</b> : <span key={opt} className="mr-1">{opt},</span>;
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {editingQuestion && (
                <EditQuestionModal
                    question={editingQuestion}
                    onClose={() => setEditingQuestion(null)}
                    onSave={handleUpdateQuestion}
                />
            )}

            {showFixModal && (
                <AutoFixModal
                    candidates={fixCandidates}
                    isApplying={uploading}
                    onClose={() => setShowFixModal(false)}
                    onApply={handleApplyFixes}
                />
            )}

            {showPreview && existingQuestions.length > 0 && (
                <BundlePreviewSimulator
                    questions={existingQuestions}
                    initialIndex={previewIndex}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </div>
    );
};
