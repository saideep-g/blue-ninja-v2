import React from 'react';
import { X } from 'lucide-react';
import { McqEraTemplate } from '../../../templates/McqEraTemplate';
import { Question } from '../../../../types/models';

interface EraQuizViewProps {
    questions: Question[];
    currentQuestionIndex: number;
    onAnswer: (result: any) => void;
    onClose: () => void;
}

export const EraQuizView: React.FC<EraQuizViewProps> = ({
    questions,
    currentQuestionIndex,
    onAnswer,
    onClose
}) => {
    const [seconds, setSeconds] = React.useState(0);

    React.useEffect(() => {
        const timer = setInterval(() => setSeconds(s => s + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (totalSeconds: number) => {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="max-w-2xl mx-auto py-2 animate-in fade-in zoom-in duration-500">
            <div className="flex justify-between items-center mb-8 px-4">
                <button
                    onClick={onClose}
                    className="p-3 bg-white/50 backdrop-blur-md rounded-full text-gray-500 hover:text-pink-500 hover:bg-white transition-all shadow-sm"
                >
                    <X size={24} />
                </button>

                {/* Gen Z Timer Pill */}
                <div className="px-6 py-2 bg-white/80 backdrop-blur-md rounded-full text-indigo-900 font-black tracking-widest text-lg shadow-sm border border-white/50 animate-pulse">
                    {formatTime(seconds)} ⏳
                </div>

                <div className="px-4 py-2 bg-white/50 backdrop-blur-md rounded-full shadow-sm text-xs font-black uppercase tracking-widest text-gray-600 border border-white/50">
                    Q{currentQuestionIndex + 1}/{questions.length}
                </div>
            </div>

            {questions[currentQuestionIndex] && (
                <McqEraTemplate
                    question={questions[currentQuestionIndex]}
                    isSubmitting={false}
                    onAnswer={onAnswer}
                />
            )}
        </div>
    );
};
