import { Timestamp } from 'firebase/firestore';

/**
 * Module (Chapter) configuration for a subject
 */
export interface ModuleConfig {
    enabled: boolean;
    enabledDate: string;        // YYYY-MM-DD
    scheduledDate?: string;     // YYYY-MM-DD (future auto-enable)
}

/**
 * Enabled modules structure
 * Firestore: students/{studentId}.enabledModules
 */
export interface EnabledModules {
    [subject: string]: {
        [moduleId: string]: ModuleConfig;
    };
}

/**
 * Boost Period configuration
 */
export interface BoostPeriod {
    id: string;
    name: string;
    startDate: string;          // YYYY-MM-DD
    endDate: string;            // YYYY-MM-DD
    subjectBoosts: {
        [subject: string]: number;  // Extra questions per subject
    };
    active: boolean;
    createdAt?: Timestamp;
}

/**
 * Module/Chapter metadata from curriculum
 */
export interface ModuleMetadata {
    id: string;
    name: string;
    subject: string;
    grade: number;
    order: number;              // Display order
    description?: string;
    estimatedDuration?: number; // Minutes
}

/**
 * Student Profile with Phase 2 fields
 */
export interface StudentProfilePhase2 {
    // ... Phase 1 fields

    // Module Configuration
    enabledModules: EnabledModules;

    // Boost Periods
    boostPeriods: BoostPeriod[];
}

/**
 * Form data for module updates
 */
export interface ModuleUpdateData {
    subject: string;
    moduleId: string;
    enabled: boolean;
    enabledDate?: string;
    scheduledDate?: string;
}

/**
 * Bulk schedule data
 */
export interface BulkScheduleData {
    subject: string;
    modules: Array<{
        moduleId: string;
        scheduledDate: string;
    }>;
}

/**
 * Helper to check if module is recent (enabled in last 15 days)
 */
export function isRecentModule(enabledDate: string): boolean {
    const enabled = new Date(enabledDate);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - enabled.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 15;
}

/**
 * Helper to check if boost period is active
 */
export function isBoostPeriodActive(period: BoostPeriod): boolean {
    if (!period.active) return false;

    const now = new Date().toISOString().split('T')[0];
    return now >= period.startDate && now <= period.endDate;
}

/**
 * Get active boost for a subject
 */
export function getActiveBoostForSubject(
    boostPeriods: BoostPeriod[],
    subject: string
): number {
    const activeBoosts = boostPeriods.filter(period =>
        isBoostPeriodActive(period) &&
        period.subjectBoosts[subject] !== undefined
    );

    // Sum all active boosts for this subject
    return activeBoosts.reduce((total, period) =>
        total + (period.subjectBoosts[subject] || 0), 0
    );
}
