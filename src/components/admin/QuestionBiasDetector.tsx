import React, { useState, useEffect } from 'react';
import { getDocs, doc, getDoc, collection } from 'firebase/firestore';
import { db } from '../../services/db/firebase';
import { Loader, AlertTriangle, Download, RefreshCw, CheckCircle, ArrowLeft } from 'lucide-react';

interface BiasReportItem {
    bundleId: string;
    bundleName: string; // From metadata
    questionId: string;
    questionText: string;
    options: string[]; // Added options for context
    biasedOption: string;
    correctOption: string;
    ratio: number; // Length of correct / Max Length of others
    originalData: any; // Raw JSON for export
}

interface BundleReport {
    id: string;
    name: string;
    totalQuestions: number;
    flaggedCount: number;
    items: BiasReportItem[];
}

export const QuestionBiasDetector: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [reports, setReports] = useState<BundleReport[]>([]);

    const [analyzedCount, setAnalyzedCount] = useState(0);
    const [totalQuestionsScanned, setTotalQuestionsScanned] = useState(0);

    const analyzeBundles = async () => {
        setLoading(true);
        setReports([]);
        setProgress(0);
        setAnalyzedCount(0);
        setTotalQuestionsScanned(0);

        try {
            // 1. Fetch Request Bundles Metadata
            const bundlesCol = collection(db, 'question_bundles');
            const bundlesSnap = await getDocs(bundlesCol);
            const bundles = bundlesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            const results: BundleReport[] = [];
            let processed = 0;
            let totalQ = 0;

            // 2. Iterate and Analyze
            for (const bundle of bundles) {
                // Update Progress
                processed++;
                setProgress(Math.round((processed / bundles.length) * 100));

                const dataRef = doc(db, 'question_bundle_data', bundle.id);
                const dataSnap = await getDoc(dataRef);

                if (!dataSnap.exists() || !dataSnap.data().questions) continue;

                const questions = dataSnap.data().questions; // Object or Array
                const qList = Array.isArray(questions) ? questions : Object.values(questions);
                totalQ += qList.length;

                const flaggedItems: BiasReportItem[] = [];

                qList.forEach((q: any) => {
                    // Normalize Options
                    let options: string[] = [];
                    let correctText = '';

                    // Handle V2/V3 structures
                    if (Array.isArray(q.options)) {
                        options = q.options;
                        if (q.answer) correctText = q.answer;
                        // Sometimes q.answer is an index or letter? Assuming text based on user request "option choice text".
                        // Logic: Match answer string to options.
                    }

                    if (!correctText || options.length < 2) return;

                    // Length Analysis
                    const correctLen = correctText.length;
                    const otherLens = options.filter(o => o !== correctText).map(o => o.length);
                    const maxOther = Math.max(...otherLens, 0);

                    // Threshold: Correct answer is significantly longer?
                    // User said: "longer than other choices it has a high likelihood of being correct"
                    // Let's flag if it is the STRICTLY longest, and maybe by a margin?
                    // User simple request: "when the option choice text is longer than other choices"

                    // Rule: Correct answer must be strictly longer
                    if (maxOther > 0 && correctLen > maxOther) {

                        // 1. Tokenize / Single Word Check
                        // Ignore single words to avoid "Cat" vs "Hippopotamus" triggering bias
                        const isSingleWord = !correctText.trim().includes(' ');

                        // 2. Calculate "Jump" (Variance from second longest)
                        // How much longer is the correct answer than the longest distractor?
                        const jump = (correctLen - maxOther) / maxOther;

                        // 3. Thresholds
                        // - Must not be a single word
                        // - Jump must be > 20% (0.2). This naturally filters "Balanced" cases where
                        //   a distractor is close in length (e.g. Correct=100, D1=95 -> Jump=5% -> safe).
                        if (!isSingleWord && jump > 0.2) {
                            flaggedItems.push({
                                bundleId: bundle.id,
                                bundleName: (bundle as any).title || (bundle as any).name || bundle.id,
                                questionId: q.id,
                                questionText: q.question,
                                options: options, // Save full options for AI context
                                biasedOption: correctText,
                                correctOption: correctText,
                                ratio: correctLen / maxOther, // Keep ratio for report (1.x format)
                                originalData: q
                            });
                        }
                    }
                });

                if (flaggedItems.length > 0) {
                    results.push({
                        id: bundle.id,
                        name: (bundle as any).title || (bundle as any).name || bundle.id,
                        totalQuestions: qList.length,
                        flaggedCount: flaggedItems.length,
                        items: flaggedItems
                    });
                }
            }

            setReports(results);
            setAnalyzedCount(bundles.length);
            setTotalQuestionsScanned(totalQ);

        } catch (e) {
            console.error(e);
            alert("Analysis failed. Check console.");
        } finally {
            setLoading(false);
        }
    };

    const downloadFullReport = () => {
        const timestamp = new Date().toISOString().split('T')[0];

        // Flatten list and preserve EXACT original structure
        const flatList = reports.flatMap(r => r.items.map(item => ({
            ...item.originalData, // Spread the raw original object

            // Inject AI metadata as distinct fields (using underscores to avoid collision)
            __bundle_id__: r.id,
            __bundle_name__: r.name,
            __bias_detected__: "LENGTH_VARIANCE",
            __correction_instruction__: `The correct answer ('${item.correctOption}') is ${(item.ratio * 100 - 100).toFixed(0)}% longer than the longest distractor. Please rewrite options to balance lengths.`
        })));

        const blob = new Blob([JSON.stringify(flatList, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `length_bias_report_FULL_${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const downloadBundleReport = (report: BundleReport) => {
        const timestamp = new Date().toISOString().split('T')[0];
        const flatList = report.items.map(item => ({
            ...item.originalData,
            __bundle_id__: report.id,
            __bundle_name__: report.name,
            __bias_detected__: "LENGTH_VARIANCE",
            __correction_instruction__: `The correct answer ('${item.correctOption}') is ${(item.ratio * 100 - 100).toFixed(0)}% longer than the longest distractor. Please rewrite options to balance lengths.`
        }));

        const blob = new Blob([JSON.stringify(flatList, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bias_report_${report.id}_${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const totalFlagged = reports.reduce((s, r) => s + r.flaggedCount, 0);

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-2 transition-colors">
                        <ArrowLeft size={16} /> Back to Dashboard
                    </button>
                    <h1 className="text-3xl font-black text-slate-800">Length Bias Detector</h1>
                    <p className="text-slate-500">Identify questions where the correct answer is the longest option.</p>
                </div>
                <div className="flex gap-4">
                    {!loading && (
                        <button
                            onClick={analyzeBundles}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95"
                        >
                            <RefreshCw size={20} />
                            {analyzedCount > 0 ? "Re-Run Analysis" : "Start Global Scan"}
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 animate-in fade-in">
                    <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                    <h2 className="text-xl font-bold text-slate-700">Analyzing Question Bundles...</h2>
                    <p className="text-slate-400 mb-4">Fetching and calculating string lengths across database...</p>
                    <div className="w-64 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-2 text-xs font-mono text-slate-400">{progress}%</div>
                </div>
            ) : analyzedCount > 0 ? (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Bundles Scanned</div>
                            <div className="text-4xl font-black text-slate-800">{analyzedCount}</div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Questions</div>
                            <div className="text-4xl font-black text-slate-800">{totalQuestionsScanned}</div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Potential Bias Found</div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-amber-500">{totalFlagged}</span>
                                    <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${((totalFlagged / totalQuestionsScanned) * 100) > 20 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                        {totalQuestionsScanned > 0 ? ((totalFlagged / totalQuestionsScanned) * 100).toFixed(1) : 0}% Rate
                                    </span>
                                </div>
                            </div>
                            <AlertTriangle className="absolute right-2 bottom-2 text-amber-100/50 w-12 h-12 md:w-16 md:h-16 -z-0" />
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center">
                            <button
                                onClick={downloadFullReport}
                                disabled={totalFlagged === 0}
                                className="w-full h-full flex flex-col items-center justify-center gap-3 text-green-600 hover:bg-green-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Download size={32} />
                                <span className="font-bold">Download JSON Report</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700">Affected Bundles</h3>
                        </div>
                        {reports.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                                <CheckCircle size={48} className="text-green-400 mb-4" />
                                <p className="font-medium">No length bias detected!</p>
                                <p className="text-sm">Great job keeping distractors balanced.</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs">
                                    <tr>
                                        <th className="p-4">Bundle Name</th>
                                        <th className="p-4 text-center">Questions</th>
                                        <th className="p-4 text-center">Bias Rate</th>
                                        <th className="p-4 text-center">Flagged</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {reports.map(repo => {
                                        const rate = (repo.flaggedCount / repo.totalQuestions) * 100;
                                        const isHigh = rate > 20;
                                        return (
                                            <tr key={repo.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4 font-medium text-slate-700">{repo.name}</td>
                                                <td className="p-4 text-center text-slate-500">{repo.totalQuestions}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${isHigh ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                        {rate.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-bold text-xs">{repo.flaggedCount}</span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => downloadBundleReport(repo)}
                                                        className="text-blue-600 hover:underline font-medium flex items-center gap-1 ml-auto"
                                                    >
                                                        <Download size={14} /> Download
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-slate-200 rounded-3xl">
                    <div className="bg-slate-100 p-6 rounded-full mb-6 text-slate-400">
                        <RefreshCw size={48} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 mb-2">Ready to Scan</h3>
                    <p className="text-slate-500 text-center max-w-md mb-8">
                        This tool will check all bundles for questions where the correct answer is significantly longer than the distractors (a common quality issue).
                    </p>
                    <button
                        onClick={analyzeBundles}
                        className="bg-slate-800 hover:bg-slate-900 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg active:scale-95"
                    >
                        Start Scan
                    </button>
                </div>
            )}
        </div>
    );
};
