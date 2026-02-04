// @ts-nocheck
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DailyCompletionEntry {
    date: string;
    completedSubjects: string[];
    totalSubjects: number;
    isPerfectDay: boolean;
    timestamp: any;
}

interface ConsistencyCalendarProps {
    currentMonth: Date;
    dailyCompletions: DailyCompletionEntry[];
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
    onMonthChange: (direction: 'prev' | 'next') => void;
}

export default function ConsistencyCalendar({
    currentMonth,
    dailyCompletions,
    selectedDate,
    onDateSelect,
    onMonthChange
}: ConsistencyCalendarProps) {

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days: (Date | null)[] = [];

        // Add empty slots for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add actual days
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day));
        }

        return days;
    };

    const getCompletionForDate = (date: Date): DailyCompletionEntry | null => {
        const dateStr = date.toISOString().split('T')[0];
        return dailyCompletions.find(entry => entry.date === dateStr) || null;
    };

    const getDayColor = (date: Date): string => {
        const completion = getCompletionForDate(date);
        const today = new Date().toISOString().split('T')[0];
        const dateStr = date.toISOString().split('T')[0];
        const isFuture = dateStr > today;

        if (isFuture) {
            return 'bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed border border-gray-200 dark:border-gray-700';
        }

        if (!completion || completion.completedSubjects.length === 0) {
            // Inactive Day - White
            return 'bg-white dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600';
        }

        if (completion.isPerfectDay) {
            // Perfect Day - Green
            return 'bg-green-500 text-white hover:bg-green-600 shadow-md';
        }

        // Partial Day - Blue
        return 'bg-blue-500 text-white hover:bg-blue-600 shadow-md';
    };

    const isToday = (date: Date): boolean => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const isSelected = (date: Date): boolean => {
        return date.toDateString() === selectedDate.toDateString();
    };

    const days = getDaysInMonth(currentMonth);
    const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="bg-theme-card/60 backdrop-blur-xl p-6 rounded-3xl border border-theme-border shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={() => onMonthChange('prev')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                    aria-label="Previous month"
                >
                    <ChevronLeft size={20} />
                </button>

                <h3 className="font-serif italic text-xl text-theme-text">
                    {monthName}
                </h3>

                <button
                    onClick={() => onMonthChange('next')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                    aria-label="Next month"
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Day Labels */}
            <div className="grid grid-cols-7 gap-2 mb-3">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div
                        key={day}
                        className="text-center text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 py-2"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
                {days.map((date, index) => {
                    if (!date) {
                        return <div key={`empty-${index}`} className="aspect-square" />;
                    }

                    const dayColor = getDayColor(date);
                    const today = isToday(date);
                    const selected = isSelected(date);
                    const isFuture = date > new Date();

                    return (
                        <button
                            key={date.toISOString()}
                            onClick={() => !isFuture && onDateSelect(date)}
                            disabled={isFuture}
                            className={`
                                aspect-square rounded-xl flex items-center justify-center
                                text-sm font-bold transition-all
                                ${dayColor}
                                ${today ? 'ring-2 ring-pink-400 ring-offset-2' : ''}
                                ${selected ? 'ring-2 ring-purple-400 ring-offset-2 scale-105' : ''}
                                ${!isFuture ? 'cursor-pointer' : ''}
                            `}
                        >
                            {date.getDate()}
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-center gap-6 flex-wrap text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500"></div>
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Perfect (6/6)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Partial (1-5)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600"></div>
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Inactive (0)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
