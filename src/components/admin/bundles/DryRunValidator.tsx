import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../services/db/firebase';
import { Sparkles, Send, AlertCircle, CheckCircle, XCircle, Loader2, Eye, Code } from 'lucide-react';

interface DryRunValidatorProps {
    question: {
        id: string;
        question_text: string;
        model_answer: string;
        evaluation_criteria: string[];
        max_points: number;
        explanation?: string;
    };
}

interface TestResult {
    studentAnswer: string;
    expectedOutcome: 'pass' | 'partial' | 'fail';
    actualScore?: number;
    evaluation?: any;
    latency?: number;
    error?: string;
    timestamp: number;
}

export function DryRunValidator({ question }: DryRunValidatorProps) {
    const [testAnswers, setTestAnswers] = useState({
        good: '',
        partial: '',
        bad: ''
    });
    const [results, setResults] = useState<Record<string, TestResult>>({});
    const [testing, setTesting] = useState<string | null>(null);
    const [showSystemPrompt, setShowSystemPrompt] = useState(false);

    const systemPrompt = `You are a Precise Educational Grading Engine. Your role is to evaluate student answers against specific criteria with absolute consistency and fairness.

CRITICAL RULES:
1. Accept semantically equivalent answers (e.g., "heavy robes" = "thick robes")
2. Award partial credit for partially correct answers
3. Be strict but fair - students must demonstrate understanding
4. Provide constructive, specific feedback
5. ALWAYS respond with valid JSON in the exact schema provided

You must respond ONLY with valid JSON. No markdown, no explanations outside the JSON structure.`;

    const runTest = async (type: 'good' | 'partial' | 'bad') => {
        const answer = testAnswers[type];
        if (!answer.trim()) {
            alert('Please enter a test answer first');
            return;
        }

        setTesting(type);
        const startTime = Date.now();

        try {
            const evaluateFn = httpsCallable(functions, 'evaluateShortAnswer');
            const result = await evaluateFn({
                question: question.question_text,
                student_answer: answer,
                evaluation_criteria: question.evaluation_criteria,
                max_points: question.max_points,
                // Mark as dry run for admin monitoring
                isDryRun: true,
                adminUser: 'ADMIN_DRY_RUN'
            });

            const data = result.data as any;
            const latency = Date.now() - startTime;

            setResults(prev => ({
                ...prev,
                [type]: {
                    studentAnswer: answer,
                    expectedOutcome: type === 'good' ? 'pass' : type === 'partial' ? 'partial' : 'fail',
                    actualScore: data.evaluation?.score,
                    evaluation: data.evaluation,
                    latency,
                    timestamp: Date.now()
                }
            }));
        } catch (error: any) {
            setResults(prev => ({
                ...prev,
                [type]: {
                    studentAnswer: answer,
                    expectedOutcome: type === 'good' ? 'pass' : type === 'partial' ? 'partial' : 'fail',
                    error: error.message,
                    timestamp: Date.now()
                }
            }));
        } finally {
            setTesting(null);
        }
    };

    const getResultIcon = (result: TestResult) => {
        if (result.error) {
            return <XCircle className="w-5 h-5 text-red-500" />;
        }

        const score = result.actualScore || 0;
        const maxPoints = question.max_points;

        if (result.expectedOutcome === 'pass' && score === maxPoints) {
            return <CheckCircle className="w-5 h-5 text-green-500" />;
        } else if (result.expectedOutcome === 'fail' && score === 0) {
            return <CheckCircle className="w-5 h-5 text-green-500" />;
        } else if (result.expectedOutcome === 'partial' && score > 0 && score < maxPoints) {
            return <CheckCircle className="w-5 h-5 text-green-500" />;
        } else {
            return <AlertCircle className="w-5 h-5 text-amber-500" />;
        }
    };

    const getResultMessage = (result: TestResult) => {
        if (result.error) {
            return `Error: ${result.error}`;
        }

        const score = result.actualScore || 0;
        const maxPoints = question.max_points;

        if (result.expectedOutcome === 'pass' && score === maxPoints) {
            return `✓ Correct: AI awarded full marks (${score}/${maxPoints})`;
        } else if (result.expectedOutcome === 'fail' && score === 0) {
            return `✓ Correct: AI awarded zero marks (${score}/${maxPoints})`;
        } else if (result.expectedOutcome === 'partial' && score > 0 && score < maxPoints) {
            return `✓ Correct: AI awarded partial credit (${score}/${maxPoints})`;
        } else {
            return `⚠ Unexpected: Expected ${result.expectedOutcome}, got ${score}/${maxPoints}`;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-6 rounded-2xl border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                            AI Dry Run Validator
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            Test your rubric with sample answers before deploying to students.
                            All tests are logged to the admin monitoring dashboard with identifier <code className="px-2 py-0.5 bg-white dark:bg-slate-800 rounded font-mono text-xs">ADMIN_DRY_RUN</code>.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                    >
                        <Code className="w-4 h-4" />
                        {showSystemPrompt ? 'Hide' : 'View'} System Logic
                    </button>
                </div>

                {/* System Prompt Display */}
                {showSystemPrompt && (
                    <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                            System Instruction Sent to Gemini
                        </p>
                        <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                            {systemPrompt}
                        </pre>
                    </div>
                )}
            </div>

            {/* Question Display */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Question</p>
                <p className="text-lg font-serif italic text-slate-900 dark:text-white mb-4">
                    {question.question_text}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <p className="text-xs font-black text-emerald-600 uppercase tracking-wider mb-2">Model Answer</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
                            {question.model_answer}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-black text-indigo-600 uppercase tracking-wider mb-2">
                            Evaluation Criteria ({question.evaluation_criteria.length} points)
                        </p>
                        <ul className="space-y-1">
                            {question.evaluation_criteria.map((criterion, idx) => (
                                <li key={idx} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2">
                                    <span className="font-bold text-indigo-600">#{idx + 1}</span>
                                    <span>{criterion}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Test Cases */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Good Answer */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-4">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <h4 className="text-sm font-black text-green-700 dark:text-green-400 uppercase tracking-wider">
                            Good Answer
                        </h4>
                    </div>
                    <textarea
                        value={testAnswers.good}
                        onChange={(e) => setTestAnswers(prev => ({ ...prev, good: e.target.value }))}
                        placeholder="Enter a sample answer that should get full marks..."
                        className="w-full h-32 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-green-500 outline-none"
                    />
                    <button
                        onClick={() => runTest('good')}
                        disabled={testing !== null}
                        className="w-full mt-3 px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {testing === 'good' ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Testing...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Test
                            </>
                        )}
                    </button>

                    {results.good && (
                        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 mb-2">
                                {getResultIcon(results.good)}
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {getResultMessage(results.good)}
                                </p>
                            </div>
                            {results.good.latency && (
                                <p className="text-xs text-slate-500">Latency: {results.good.latency}ms</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Partial Answer */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                        <h4 className="text-sm font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                            Partial Answer
                        </h4>
                    </div>
                    <textarea
                        value={testAnswers.partial}
                        onChange={(e) => setTestAnswers(prev => ({ ...prev, partial: e.target.value }))}
                        placeholder="Enter a sample answer that should get partial credit..."
                        className="w-full h-32 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                    <button
                        onClick={() => runTest('partial')}
                        disabled={testing !== null}
                        className="w-full mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {testing === 'partial' ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Testing...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Test
                            </>
                        )}
                    </button>

                    {results.partial && (
                        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 mb-2">
                                {getResultIcon(results.partial)}
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {getResultMessage(results.partial)}
                                </p>
                            </div>
                            {results.partial.latency && (
                                <p className="text-xs text-slate-500">Latency: {results.partial.latency}ms</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Bad Answer */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 mb-4">
                        <XCircle className="w-5 h-5 text-red-600" />
                        <h4 className="text-sm font-black text-red-700 dark:text-red-400 uppercase tracking-wider">
                            Bad Answer
                        </h4>
                    </div>
                    <textarea
                        value={testAnswers.bad}
                        onChange={(e) => setTestAnswers(prev => ({ ...prev, bad: e.target.value }))}
                        placeholder="Enter a sample answer that should get zero marks..."
                        className="w-full h-32 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-red-500 outline-none"
                    />
                    <button
                        onClick={() => runTest('bad')}
                        disabled={testing !== null}
                        className="w-full mt-3 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {testing === 'bad' ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Testing...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Test
                            </>
                        )}
                    </button>

                    {results.bad && (
                        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 mb-2">
                                {getResultIcon(results.bad)}
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {getResultMessage(results.bad)}
                                </p>
                            </div>
                            {results.bad.latency && (
                                <p className="text-xs text-slate-500">Latency: {results.bad.latency}ms</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Detailed Results */}
            {Object.keys(results).length > 0 && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">
                        Detailed AI Feedback
                    </h4>
                    <div className="space-y-4">
                        {Object.entries(results).map(([type, result]) => (
                            result.evaluation && (
                                <div key={type} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                                        {type.charAt(0).toUpperCase() + type.slice(1)} Answer Results
                                    </p>

                                    {/* Criteria Breakdown */}
                                    <div className="space-y-2 mb-3">
                                        {result.evaluation.results?.map((res: any, idx: number) => (
                                            <div key={idx} className="flex gap-3 items-start">
                                                <div className={`shrink-0 ${res.passed ? 'text-green-500' : 'text-slate-300'}`}>
                                                    {res.passed ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4 opacity-30" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                        {res.criterion}
                                                    </p>
                                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                                        {res.feedback}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* AI Summary */}
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                        <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                                            AI Summary
                                        </p>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                                            "{result.evaluation.summary}"
                                        </p>
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
