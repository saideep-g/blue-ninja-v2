// @ts-nocheck
import React from 'react';
import { Flame, Trophy } from 'lucide-react';

interface StreakDisplayProps {
    current: number;
    longest: number;
}

export default function StreakDisplay({ current, longest }: StreakDisplayProps) {
    return (
        <div className="flex items-center gap-4">
            {/* Current Streak */}
            <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl shadow-md border border-orange-100">
                <div className="relative">
                    <Flame
                        size={32}
                        className={`${current > 0 ? 'text-orange-500' : 'text-gray-300'}`}
                        fill={current > 0 ? 'currentColor' : 'none'}
                    />
                    {current > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-[10px] font-black">{current}</span>
                        </div>
                    )}
                </div>
                <div>
                    <div className="text-2xl font-black text-gray-800">{current}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">
                        Day Streak
                    </div>
                </div>
            </div>

            {/* Longest Streak */}
            <div className="flex items-center gap-3 bg-gradient-to-br from-yellow-50 to-amber-50 px-4 py-3 rounded-2xl shadow-md border border-yellow-200">
                <Trophy size={28} className="text-yellow-600" />
                <div>
                    <div className="text-2xl font-black text-yellow-700">{longest}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-yellow-600">
                        Best Streak
                    </div>
                </div>
            </div>
        </div>
    );
}
