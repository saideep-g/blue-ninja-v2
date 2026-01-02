import React from 'react';
import { Sparkles, Trophy } from 'lucide-react';

interface QuestResultsViewProps {
    score: number;
    onContinue: () => void;
}

export const QuestResultsView: React.FC<QuestResultsViewProps> = ({ score, onContinue }) => {
    return (
        <div className="fixed inset-0 bg-purple-600 z-[70] flex flex-col items-center justify-center p-8 text-white text-center animate-in zoom-in-95 duration-500">
            <div className="relative mb-8">
                <Sparkles className="w-28 h-28 text-yellow-300 animate-pulse" />
                <Trophy size={40} className="absolute inset-0 m-auto text-white" />
            </div>
            <h2 className="text-4xl font-black mb-3">Excellent Work!</h2>
            <p className="text-purple-100 text-lg mb-10 leading-snug max-w-xs mx-auto">
                You earned {score * 20} Power Points!
            </p>

            <button
                onClick={onContinue}
                className="w-full max-w-xs bg-white text-purple-700 py-6 rounded-[2.5rem] text-xl font-black shadow-2xl active:scale-95 transition-all"
            >
                Collect & Continue
            </button>
        </div>
    );
};
