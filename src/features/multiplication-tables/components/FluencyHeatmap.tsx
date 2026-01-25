import React, { useState, useMemo, useEffect } from 'react';
import { FirestorePracticeLog } from '../services/tablesFirestore';
import { X, Clock, Target, Hash, Grid3x3 } from 'lucide-react';

interface FluencyHeatmapProps {
    logs: FirestorePracticeLog[];
    className?: string;
    layout?: 'row' | 'grid';
}

interface CellData {
    table: number;
    multiplier: number;
    attempts: number;
    correct: number;
    speedSum: number;
    speedCount: number;
    accuracy: number; // 0-100
    avgSpeed: number; // Seconds
    status: 'MASTERED' | 'FLUENT' | 'REVIEW' | 'STRUGGLING' | 'WARNING' | 'UNTESTED';
}

export const FluencyHeatmap: React.FC<FluencyHeatmapProps> = ({ logs, className = '', layout = 'row' }) => {
    const [selectedCell, setSelectedCell] = useState<CellData | null>(null);
    const [panelPos, setPanelPos] = useState<'bottom' | 'top'>('bottom');
    const containerRef = React.useRef<HTMLDivElement>(null);

    // 1. Process Data
    const { gridData, activeTables } = useMemo(() => {
        const lookup: Record<string, CellData> = {};
        const tablesSet = new Set<number>();
        const multipliers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

        // Pass 1: Aggregate Logs
        logs.forEach(log => {
            if (!log.table || !log.multiplier) return;

            tablesSet.add(log.table);
            const key = `${log.table}-${log.multiplier}`;

            if (!lookup[key]) {
                lookup[key] = {
                    table: log.table,
                    multiplier: log.multiplier,
                    attempts: 0,
                    correct: 0,
                    speedSum: 0,
                    speedCount: 0,
                    accuracy: 0,
                    avgSpeed: 0,
                    status: 'UNTESTED'
                };
            }

            const cell = lookup[key];
            cell.attempts++;
            if (log.isCorrect) {
                cell.correct++;
                if (log.isValidForSpeed === true) {
                    cell.speedSum += log.timeTaken;
                    cell.speedCount++;
                }
            }
        });

        // Pass 2: Calculate Metrics & Status
        Object.values(lookup).forEach(cell => {
            cell.accuracy = cell.attempts > 0 ? Math.round((cell.correct / cell.attempts) * 100) : 0;
            cell.avgSpeed = cell.speedCount > 0 ? parseFloat((cell.speedSum / cell.speedCount / 1000).toFixed(1)) : 0;

            // Determine Status
            if (cell.attempts === 0) {
                cell.status = 'UNTESTED';
            } else if (cell.accuracy < 50) {
                cell.status = 'WARNING';
            } else if (cell.accuracy <= 70) {
                cell.status = 'STRUGGLING';
            } else {
                // Accuracy > 70
                if (cell.accuracy > 90 && cell.avgSpeed > 0 && cell.avgSpeed < 3.0) {
                    cell.status = 'MASTERED';
                } else if (cell.accuracy > 80 && cell.avgSpeed > 0 && cell.avgSpeed < 5.0) {
                    cell.status = 'FLUENT';
                } else {
                    cell.status = 'REVIEW';
                }
            }
        });

        // Determine Active Tables Logic
        // If logs exist, use logged tables. If not, default to 2-12 for display.
        let tables = Array.from(tablesSet).sort((a, b) => a - b);
        if (tables.length === 0) tables = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

        // Ensure ALL combinations for active tables exist in lookup for rendering
        tables.forEach(t => {
            multipliers.forEach(m => {
                const key = `${t}-${m}`;
                if (!lookup[key]) {
                    lookup[key] = {
                        table: t,
                        multiplier: m,
                        attempts: 0,
                        correct: 0,
                        speedSum: 0,
                        speedCount: 0,
                        accuracy: 0,
                        avgSpeed: 0,
                        status: 'UNTESTED'
                    };
                }
            });
        });

        return { gridData: lookup, activeTables: tables };
    }, [logs]);

    // Visibility Observer to close panel on scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                // Auto-close if less than 50% of the heatmap is visible
                if (entry.intersectionRatio < 0.5) {
                    setSelectedCell(null);
                }
            },
            { threshold: [0.5] }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // Global Click Listener to Close Panel
    useEffect(() => {
        const handleClickOutside = () => setSelectedCell(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const handleCellClick = (e: React.MouseEvent, cell: CellData) => {
        e.stopPropagation();

        // Auto-position panel to avoid obscuring the clicked cell
        const clickY = e.clientY;
        const windowHeight = window.innerHeight;
        const isBottomHalf = clickY > windowHeight * 0.55; // If in bottom 55%

        setPanelPos(isBottomHalf ? 'top' : 'bottom');

        if (selectedCell?.table === cell.table && selectedCell?.multiplier === cell.multiplier) {
            setSelectedCell(null);
        } else {
            setSelectedCell(cell);
        }
    };

    const multipliers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    const getCellColor = (status: CellData['status'], isSelected: boolean) => {
        const base = isSelected ? 'ring-4 ring-indigo-500 z-10 scale-110 shadow-lg' : 'hover:opacity-80';

        switch (status) {
            case 'MASTERED': return `${base} bg-green-500 text-white`;      // Bright Green
            case 'FLUENT': return `${base} bg-emerald-400 text-white`;    // Emerald
            case 'REVIEW': return `${base} bg-yellow-400 text-yellow-900`;// Yellow
            case 'STRUGGLING': return `${base} bg-orange-500 text-white`; // Orange
            case 'WARNING': return `${base} bg-red-500 text-white`;       // Red
            case 'UNTESTED': default: return `${base} bg-slate-200 text-slate-400`; // Slate Grey
        }
    };

    return (
        <div ref={containerRef} className={`space-y-4 ${className}`} onClick={(e) => { e.stopPropagation(); setSelectedCell(null); }}>
            <div className="flex items-center gap-2 mb-4">
                <Grid3x3 className="w-5 h-5 text-indigo-600" />
                <h3 className="tex-lg font-bold text-slate-800">Fluency Heatmap</h3>
            </div>

            {layout === 'row' ? (
                <div className="overflow-x-auto pb-4" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-block min-w-[600px]">
                        {/* Header Row */}
                        <div className="flex mb-2">
                            <div className="w-12"></div> {/* Spacer for Row Labels */}
                            {multipliers.map(m => (
                                <div key={m} className="w-10 text-center text-xs font-bold text-slate-400">{m}</div>
                            ))}
                        </div>

                        {/* Rows */}
                        {activeTables.map(table => (
                            <div key={table} className="flex items-center mb-2">
                                {/* Row Label */}
                                <div className="w-12 text-xs font-bold text-slate-500 pr-3 text-right">x{table}</div>

                                {/* Cells */}
                                <div className="flex gap-2">
                                    {multipliers.map(m => {
                                        const cell = gridData[`${table}-${m}`];
                                        const isSelected = selectedCell?.table === table && selectedCell?.multiplier === m;

                                        return (
                                            <button
                                                key={m}
                                                onClick={(e) => handleCellClick(e, cell)}
                                                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 ${getCellColor(cell.status, isSelected)}`}
                                                title={`${table}x${m}: ${cell.status}`}
                                            >
                                                {cell.status !== 'UNTESTED' && <span className="text-[10px] font-bold">{cell.accuracy}%</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                    {activeTables.map(t =>
                        multipliers.map(m => {
                            const cell = gridData[`${t}-${m}`];
                            const isSelected = selectedCell?.table === t && selectedCell?.multiplier === m;
                            return (
                                <button
                                    key={`${t}-${m}`}
                                    onClick={(e) => handleCellClick(e, cell)}
                                    className={`w-8 h-8 md:w-10 md:h-10 rounded-sm flex items-center justify-center transition-all duration-200 ${getCellColor(cell.status, isSelected)}`}
                                    title={`${t}x${m}: ${cell.status}`}
                                >
                                </button>
                            )
                        })
                    )}
                </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-slate-500 px-2">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-500"></div> Mastered (90%+, &lt;3s)</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-400"></div> Fluent (80%+, &lt;5s)</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-400"></div> Review (&gt;70%)</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-orange-500"></div> Struggling</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500"></div> Warning</div>
            </div>

            {/* Sticky Detail Panel */}
            {selectedCell && (
                <div
                    className={`fixed left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-slate-900/95 backdrop-blur-xl text-white p-6 pt-12 rounded-[2.5rem] shadow-2xl border border-slate-700/50 z-50 animate-in duration-300 pointer-events-auto transition-all ${panelPos === 'top' ? 'top-24 slide-in-from-top' : 'bottom-6 slide-in-from-bottom'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => setSelectedCell(null)}
                        className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition-colors z-50"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4 text-white" />
                    </button>

                    <div className="flex items-center justify-around">
                        {/* Combo Box */}
                        <div className="bg-white/10 p-5 rounded-2xl flex flex-col items-center justify-center min-w-[100px]">
                            <span className="text-2xl font-black text-white">{selectedCell.table} × {selectedCell.multiplier}</span>
                            <span className="text-[10px] uppercase font-bold text-white/50 mt-1 tracking-widest">Combo</span>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-white/50 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Speed</span>
                                <span className="text-xl font-bold text-white">{selectedCell.avgSpeed > 0 ? `${selectedCell.avgSpeed}s` : '--'}</span>
                            </div>

                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-white/50 mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> Accuracy</span>
                                <span className={`text-xl font-bold ${selectedCell.accuracy > 80 ? 'text-green-400' : selectedCell.accuracy < 50 ? 'text-red-400' : 'text-yellow-400'}`}>
                                    {selectedCell.accuracy}%
                                </span>
                            </div>

                            <div className="flex flex-col col-span-2 mt-2 pt-2 border-t border-white/10">
                                <span className="text-xs font-bold text-white/50 mb-1 flex items-center gap-1"><Hash className="w-3 h-3" /> Total Attempts</span>
                                <span className="text-base font-bold text-white">{selectedCell.attempts}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
