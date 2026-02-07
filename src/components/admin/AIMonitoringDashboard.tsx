import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/db/firebase';
import {
    Calendar, Download, Filter, Search, AlertCircle, CheckCircle,
    XCircle, Clock, Zap, DollarSign, TrendingUp, User, FileText,
    Activity, BarChart3, RefreshCw
} from 'lucide-react';

interface AILogEntry {
    date: string;
    timestamp: number;
    studentId: string;
    studentName: string;
    questionId: string;
    questionText: string;
    subject: string;
    questionType: string;
    inputText: string;
    outputText: string;
    responseTime: number;
    inputTokensCount: number;
    outputTokensCount: number;
    isSuccess: boolean;
    isValid: boolean;
    errorMessage?: string;
    score?: number;
}

const GEMINI_PRICING = {
    inputPer1M: 0.075,  // $0.075 per 1M input tokens
    outputPer1M: 0.30   // $0.30 per 1M output tokens
};

export function AIMonitoringDashboard() {
    const [logs, setLogs] = useState<AILogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuarter, setSelectedQuarter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failed'>('all');
    const [selectedLog, setSelectedLog] = useState<AILogEntry | null>(null);

    // Generate quarter options
    const getQuarterOptions = () => {
        const options = [];
        const currentYear = new Date().getFullYear();
        const quarters = ['JAN-MAR', 'APR-JUN', 'JUL-SEP', 'OCT-DEC'];

        for (let year = currentYear; year >= currentYear - 1; year--) {
            quarters.forEach(q => {
                options.push(`${year}-${q}`);
            });
        }
        return options;
    };

    // Set default to current quarter
    useEffect(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const quarter = Math.floor(month / 3);
        const quarters = ['JAN-MAR', 'APR-JUN', 'JUL-SEP', 'OCT-DEC'];
        setSelectedQuarter(`${year}-${quarters[quarter]}`);
    }, []);

    // Fetch logs for selected quarter
    useEffect(() => {
        if (!selectedQuarter) return;

        const fetchLogs = async () => {
            setLoading(true);
            try {
                // Use modular Firestore syntax
                // Path: admin/system/ai_monitoring/{selectedQuarter}
                const docRef = doc(db, 'admin', 'system', 'ai_monitoring', selectedQuarter);
                const snapshot = await getDoc(docRef);

                if (snapshot.exists()) {
                    const data = snapshot.data();
                    const entries = (data?.entries || []) as AILogEntry[];

                    // Sort by timestamp descending (newest first)
                    entries.sort((a, b) => b.timestamp - a.timestamp);
                    setLogs(entries);
                } else {
                    setLogs([]);
                }
            } catch (error) {
                console.error('Failed to fetch AI monitoring logs:', error);
                setLogs([]);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [selectedQuarter]);

    // Calculate statistics
    const stats = React.useMemo(() => {
        const totalLogs = logs.length;
        const successCount = logs.filter(l => l.isSuccess).length;
        const failedCount = logs.filter(l => !l.isSuccess).length;
        const invalidJsonCount = logs.filter(l => l.isSuccess && !l.isValid).length;

        const totalInputTokens = logs.reduce((sum, l) => sum + (l.inputTokensCount || 0), 0);
        const totalOutputTokens = logs.reduce((sum, l) => sum + (l.outputTokensCount || 0), 0);

        const inputCost = (totalInputTokens / 1_000_000) * GEMINI_PRICING.inputPer1M;
        const outputCost = (totalOutputTokens / 1_000_000) * GEMINI_PRICING.outputPer1M;
        const totalCost = inputCost + outputCost;

        const avgLatency = totalLogs > 0
            ? logs.reduce((sum, l) => sum + (l.responseTime || 0), 0) / totalLogs
            : 0;

        return {
            totalLogs,
            successCount,
            failedCount,
            invalidJsonCount,
            successRate: totalLogs > 0 ? ((successCount / totalLogs) * 100).toFixed(1) : '0',
            totalInputTokens,
            totalOutputTokens,
            totalTokens: totalInputTokens + totalOutputTokens,
            totalCost,
            avgLatency: Math.round(avgLatency)
        };
    }, [logs]);

    // Filter logs
    const filteredLogs = React.useMemo(() => {
        let filtered = logs;

        // Status filter
        if (filterStatus === 'success') {
            filtered = filtered.filter(l => l.isSuccess);
        } else if (filterStatus === 'failed') {
            filtered = filtered.filter(l => !l.isSuccess);
        }

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(l =>
                l.studentName?.toLowerCase().includes(term) ||
                l.questionId?.toLowerCase().includes(term) ||
                l.questionText?.toLowerCase().includes(term) ||
                l.subject?.toLowerCase().includes(term)
            );
        }

        return filtered;
    }, [logs, filterStatus, searchTerm]);

    const exportToCSV = () => {
        const headers = [
            'Date', 'Student Name', 'Question ID', 'Subject', 'Input Text',
            'Output Text', 'Latency (ms)', 'Input Tokens', 'Output Tokens',
            'Success', 'Valid JSON', 'Error Message', 'Score'
        ];

        const rows = filteredLogs.map(log => [
            new Date(log.timestamp).toLocaleString(),
            log.studentName,
            log.questionId,
            log.subject,
            `"${(log.inputText || '').replace(/"/g, '""')}"`,
            `"${(log.outputText || '').replace(/"/g, '""')}"`,
            log.responseTime,
            log.inputTokensCount,
            log.outputTokensCount,
            log.isSuccess ? 'Yes' : 'No',
            log.isValid ? 'Yes' : 'No',
            log.errorMessage || '',
            log.score || ''
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-monitoring-${selectedQuarter}.csv`;
        a.click();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
            {/* Header */}
            <header className="max-w-7xl mx-auto mb-8">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-3">
                            <Activity className="w-10 h-10 text-indigo-600" />
                            AI Monitoring Dashboard
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 font-medium">
                            Track AI evaluation performance, costs, and system health
                        </p>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-2">
                            <BarChart3 className="w-5 h-5 text-indigo-600" />
                            <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Total Requests</p>
                        </div>
                        <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalLogs}</p>
                        <p className="text-xs text-slate-500 mt-1">{stats.successRate}% success rate</p>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 shadow-sm border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-3 mb-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <p className="text-xs font-black text-green-700 dark:text-green-400 uppercase tracking-wider">Successful</p>
                        </div>
                        <p className="text-3xl font-black text-green-700 dark:text-green-400">{stats.successCount}</p>
                        <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                            {stats.invalidJsonCount} invalid JSON
                        </p>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 shadow-sm border border-red-200 dark:border-red-800">
                        <div className="flex items-center gap-3 mb-2">
                            <XCircle className="w-5 h-5 text-red-600" />
                            <p className="text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-wider">Failed</p>
                        </div>
                        <p className="text-3xl font-black text-red-700 dark:text-red-400">{stats.failedCount}</p>
                        <p className="text-xs text-red-600 dark:text-red-500 mt-1">API errors</p>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6 shadow-sm border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center gap-3 mb-2">
                            <DollarSign className="w-5 h-5 text-amber-600" />
                            <p className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">Estimated Cost</p>
                        </div>
                        <p className="text-3xl font-black text-amber-700 dark:text-amber-400">
                            ${stats.totalCost.toFixed(4)}
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                            {(stats.totalTokens / 1000).toFixed(1)}K tokens
                        </p>
                    </div>
                </div>

                {/* Filters and Controls */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Quarter Selector */}
                        <div>
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                Quarter
                            </label>
                            <select
                                value={selectedQuarter}
                                onChange={(e) => setSelectedQuarter(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:border-indigo-500 outline-none"
                            >
                                {getQuarterOptions().map(q => (
                                    <option key={q} value={q}>{q}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">
                                <Filter className="w-3 h-3 inline mr-1" />
                                Status
                            </label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as any)}
                                className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:border-indigo-500 outline-none"
                            >
                                <option value="all">All Requests</option>
                                <option value="success">Successful Only</option>
                                <option value="failed">Failed Only</option>
                            </select>
                        </div>

                        {/* Search */}
                        <div className="md:col-span-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">
                                <Search className="w-3 h-3 inline mr-1" />
                                Search
                            </label>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Student name, question ID, subject..."
                                className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:border-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex justify-between items-center">
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                            Showing {filteredLogs.length} of {stats.totalLogs} requests
                        </p>
                        <button
                            onClick={exportToCSV}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* Logs Table */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                <tr className="text-xs font-black uppercase tracking-wider text-slate-500">
                                    <th className="px-6 py-4 text-left">Date/Time</th>
                                    <th className="px-6 py-4 text-left">Student</th>
                                    <th className="px-6 py-4 text-left">Question</th>
                                    <th className="px-6 py-4 text-left">Subject</th>
                                    <th className="px-6 py-4 text-center">Latency</th>
                                    <th className="px-6 py-4 text-center">Tokens</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-20 text-center">
                                            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-400 mb-4" />
                                            <p className="text-slate-500 font-medium">Loading logs...</p>
                                        </td>
                                    </tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-20 text-center">
                                            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                                            <p className="text-slate-500 font-medium">No logs found for this period</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                {new Date(log.timestamp).toLocaleString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-slate-400" />
                                                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                                                        {log.studentName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-mono text-slate-500 dark:text-slate-400">
                                                    {log.questionId}
                                                </p>
                                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate max-w-xs">
                                                    {log.questionText}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded text-xs font-bold uppercase">
                                                    {log.subject}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Clock className="w-3 h-3 text-slate-400" />
                                                    <span className="text-sm font-mono text-slate-600 dark:text-slate-400">
                                                        {log.responseTime}ms
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Zap className="w-3 h-3 text-amber-500" />
                                                    <span className="text-sm font-mono text-slate-600 dark:text-slate-400">
                                                        {(log.inputTokensCount + log.outputTokensCount).toLocaleString()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {log.isSuccess ? (
                                                    log.isValid ? (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-bold">
                                                            <CheckCircle className="w-3 h-3" />
                                                            Success
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-bold">
                                                            <AlertCircle className="w-3 h-3" />
                                                            Invalid JSON
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-bold">
                                                        <XCircle className="w-3 h-3" />
                                                        Failed
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => setSelectedLog(log)}
                                                    className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals Footer */}
                    {!loading && filteredLogs.length > 0 && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 border-t-2 border-indigo-200 dark:border-indigo-800 px-6 py-4">
                            <div className="grid grid-cols-4 gap-4 text-center">
                                <div>
                                    <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                                        Total Input Tokens
                                    </p>
                                    <p className="text-lg font-black text-indigo-700 dark:text-indigo-300">
                                        {stats.totalInputTokens.toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                                        Total Output Tokens
                                    </p>
                                    <p className="text-lg font-black text-indigo-700 dark:text-indigo-300">
                                        {stats.totalOutputTokens.toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                                        Avg Latency
                                    </p>
                                    <p className="text-lg font-black text-indigo-700 dark:text-indigo-300">
                                        {stats.avgLatency}ms
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                                        Estimated Cost
                                    </p>
                                    <p className="text-lg font-black text-indigo-700 dark:text-indigo-300">
                                        ${stats.totalCost.toFixed(4)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setSelectedLog(null)} />

                    <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                                        Request Details
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                                        {new Date(selectedLog.timestamp).toLocaleString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                                >
                                    <XCircle className="w-8 h-8 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Student</p>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white">{selectedLog.studentName}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Question ID</p>
                                    <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">{selectedLog.questionId}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Subject</p>
                                    <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{selectedLog.subject}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Response Time</p>
                                    <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">{selectedLog.responseTime}ms</p>
                                </div>
                            </div>

                            {/* Question Text */}
                            <div>
                                <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Question</p>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <p className="text-sm text-slate-700 dark:text-slate-300">{selectedLog.questionText}</p>
                                </div>
                            </div>

                            {/* Input Text */}
                            <div>
                                <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Student Answer (Input)</p>
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                    <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{selectedLog.inputText}"</p>
                                    <p className="text-xs text-slate-500 mt-2">
                                        Tokens: {selectedLog.inputTokensCount}
                                    </p>
                                </div>
                            </div>

                            {/* Output Text */}
                            <div>
                                <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">AI Response (Output)</p>
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                                    <pre className="text-xs text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono">
                                        {selectedLog.outputText || 'No output'}
                                    </pre>
                                    <p className="text-xs text-slate-500 mt-2">
                                        Tokens: {selectedLog.outputTokensCount}
                                    </p>
                                </div>
                            </div>

                            {/* Error Message (if any) */}
                            {selectedLog.errorMessage && (
                                <div>
                                    <p className="text-xs font-black text-red-600 uppercase tracking-wider mb-2">Error Message</p>
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                        <p className="text-sm text-red-700 dark:text-red-400 font-mono">{selectedLog.errorMessage}</p>
                                    </div>
                                </div>
                            )}

                            {/* Status Indicators */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className={`p-4 rounded-xl border-2 ${selectedLog.isSuccess ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
                                    <p className="text-xs font-black uppercase tracking-wider mb-1">API Call</p>
                                    <p className={`text-lg font-black ${selectedLog.isSuccess ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                        {selectedLog.isSuccess ? 'Success' : 'Failed'}
                                    </p>
                                </div>
                                <div className={`p-4 rounded-xl border-2 ${selectedLog.isValid ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'}`}>
                                    <p className="text-xs font-black uppercase tracking-wider mb-1">JSON Valid</p>
                                    <p className={`text-lg font-black ${selectedLog.isValid ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                                        {selectedLog.isValid ? 'Yes' : 'No'}
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl border-2 bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800">
                                    <p className="text-xs font-black uppercase tracking-wider mb-1">Score</p>
                                    <p className="text-lg font-black text-indigo-700 dark:text-indigo-400">
                                        {selectedLog.score !== undefined ? `${selectedLog.score} / 3` : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
