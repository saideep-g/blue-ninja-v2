import React, { useState } from 'react';
import { MCQTemplate } from '../../../../../components/templates/MCQTemplate';
import { MCQDataV1 } from './schema';

interface Props {
    data: MCQDataV1;
    onInteract?: (interaction: any) => void;
    onComplete?: (result: any) => void;
    readOnly?: boolean;
}

/**
 * V1 Adapter for Multiple Choice Questions.
 * Uses the legacy MCQTemplate under the hood.
 */
export const MCQComponentV1: React.FC<Props> = ({ data, onInteract, onComplete, readOnly }) => {

    // Need to maintain local state if we want to intercept interactions before completion?
    // MCQTemplate handles its own state generally.

    const handleAnswer = (result: any) => {
        // Adapter: Forward the result to the new QLMS callbacks
        if (onComplete) {
            onComplete({
                ...result,
                normalizedScore: result.isCorrect ? 1 : 0
            });
        }
    };

    return (
        <MCQTemplate
            question={data as any}
            onAnswer={handleAnswer}
            isSubmitting={false}
            readOnly={readOnly}
        />
    );
};
