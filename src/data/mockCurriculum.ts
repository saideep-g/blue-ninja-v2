import type { ModuleMetadata } from '../types/admin/modules';

/**
 * Mock curriculum data for demonstration
 * In production, this would come from Firestore or curriculum JSON files
 */

export const MOCK_CURRICULUM: { [subject: string]: { [grade: number]: ModuleMetadata[] } } = {
    math: {
        7: [
            { id: 'ch1_integers', name: 'Integers', subject: 'math', grade: 7, order: 1, description: 'Positive and negative numbers' },
            { id: 'ch2_fractions', name: 'Fractions & Decimals', subject: 'math', grade: 7, order: 2, description: 'Operations with fractions' },
            { id: 'ch3_data_handling', name: 'Data Handling', subject: 'math', grade: 7, order: 3, description: 'Statistics and graphs' },
            { id: 'ch4_equations', name: 'Simple Equations', subject: 'math', grade: 7, order: 4, description: 'Linear equations' },
            { id: 'ch5_angles', name: 'Lines & Angles', subject: 'math', grade: 7, order: 5, description: 'Geometry basics' },
            { id: 'ch6_triangles', name: 'Triangles', subject: 'math', grade: 7, order: 6, description: 'Triangle properties' },
            { id: 'ch7_ratio', name: 'Ratio & Proportion', subject: 'math', grade: 7, order: 7, description: 'Ratios and proportions' },
            { id: 'ch8_percentage', name: 'Percentage', subject: 'math', grade: 7, order: 8, description: 'Percentage calculations' }
        ]
    },
    science: {
        7: [
            { id: 'ch1_nutrition', name: 'Nutrition in Plants', subject: 'science', grade: 7, order: 1, description: 'Photosynthesis' },
            { id: 'ch2_animals', name: 'Nutrition in Animals', subject: 'science', grade: 7, order: 2, description: 'Digestive system' },
            { id: 'ch3_heat', name: 'Heat & Temperature', subject: 'science', grade: 7, order: 3, description: 'Thermal energy' },
            { id: 'ch4_acids', name: 'Acids & Bases', subject: 'science', grade: 7, order: 4, description: 'Chemical properties' },
            { id: 'ch5_weather', name: 'Weather & Climate', subject: 'science', grade: 7, order: 5, description: 'Atmospheric conditions' },
            { id: 'ch6_motion', name: 'Motion & Time', subject: 'science', grade: 7, order: 6, description: 'Speed and velocity' }
        ]
    },
    english: {
        7: [
            { id: 'ch1_grammar', name: 'Parts of Speech', subject: 'english', grade: 7, order: 1, description: 'Nouns, verbs, adjectives' },
            { id: 'ch2_tenses', name: 'Tenses', subject: 'english', grade: 7, order: 2, description: 'Past, present, future' },
            { id: 'ch3_voice', name: 'Active & Passive Voice', subject: 'english', grade: 7, order: 3, description: 'Voice transformation' },
            { id: 'ch4_comprehension', name: 'Reading Comprehension', subject: 'english', grade: 7, order: 4, description: 'Understanding passages' },
            { id: 'ch5_writing', name: 'Essay Writing', subject: 'english', grade: 7, order: 5, description: 'Composition skills' }
        ]
    },
    social: {
        7: [
            { id: 'ch1_medieval', name: 'Medieval India', subject: 'social', grade: 7, order: 1, description: 'History of medieval period' },
            { id: 'ch2_environment', name: 'Environment', subject: 'social', grade: 7, order: 2, description: 'Natural and human environment' },
            { id: 'ch3_government', name: 'Government', subject: 'social', grade: 7, order: 3, description: 'Democratic institutions' },
            { id: 'ch4_economy', name: 'Economic Systems', subject: 'social', grade: 7, order: 4, description: 'Markets and economy' }
        ]
    }
};

/**
 * Get modules for a subject and grade
 */
export function getModulesForSubject(subject: string, grade: number): ModuleMetadata[] {
    return MOCK_CURRICULUM[subject]?.[grade] || [];
}

/**
 * Get all subjects with available curriculum
 */
export function getAvailableSubjects(): string[] {
    return Object.keys(MOCK_CURRICULUM);
}
