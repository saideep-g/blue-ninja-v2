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
    return (
        <div className="max-w-2xl mx-auto py-12 animate-in fade-in zoom-in duration-500">
            <div className="flex justify-between items-center mb-12">
                <button onClick={onClose} className="p-3 bg-white rounded-full text-gray-400 hover:text-pink-500 transition-colors shadow-sm">
                    <X size={20} />
                </button>
                <div className="flex gap-2">
                    {[...Array(questions.length)].map((_, i) => (
                        <div key={i} className={`w-3 h-3 rounded-full transition-colors ${i === currentQuestionIndex ? 'bg-pink-500 scale-125' : i < currentQuestionIndex ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                    ))}
                </div>
                <div className="px-4 py-2 bg-white rounded-full shadow-sm text-xs font-black uppercase tracking-widest text-[#1A1A1A]">
                    Q{currentQuestionIndex + 1}
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
