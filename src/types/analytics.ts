export interface SelectionRationale {
    strategy: 'SRS' | 'MISCONCEPTION' | 'PREREQUISITE' | 'NEW_CONTENT' | 'RANDOM' | 'ZPD' | 'FALLBACK';
    trigger?: string;      // Detail on why triggers match (e.g. "Hurdle: SIGN_IGNORANCE")
    weight?: number;       // Priority score used for selection
    srsState?: {
        interval: number;
        nextDueDate: number;
        isOverdue: boolean;
    };
    targetedHurdles?: string[];
}

export interface SRSAtomState {
    atomId: string;
    interval: number;           // Days
    easeFactor: number;         // Multiplier
    nextDueDate: number;        // Timestamp
    reviewCount: number;
    lastReviewDate: number;
    quality: number;            // Last response quality (0-5)
}
