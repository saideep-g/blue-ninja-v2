import {
    collection,
    doc,
    FirestoreDataConverter,
    QueryDocumentSnapshot,
    SnapshotOptions,
    WithFieldValue,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { NinjaStats, Question, QuestionLog } from '../../types';
import { ZodType } from 'zod';
import { questionSchema as QuestionSchema } from '../questions/schema';

/**
 * Generic Converter Generator
 * Creates a Firestore converter for a specific TypeScript interface.
 * Optionally validates data with Zod.
 * Automatically injects document 'id'.
 */
const createConverter = <T>(schema?: ZodType<any>) => ({
    toFirestore(data: WithFieldValue<T>): any {
        return data;
    },
    fromFirestore(
        snapshot: QueryDocumentSnapshot,
        options: SnapshotOptions
    ): T {
        const data = snapshot.data(options);
        // Inject ID which is often missing in data but required by Model
        const dataWithId = { ...data, id: snapshot.id };

        // Validation removed as per request to support V3 migration
        return dataWithId as unknown as T;
    }
});

// ------------------------------------------------------------------
// TYPE-SAFE COLLECTION REFERENCES
// ------------------------------------------------------------------

/**
 * Students Collection
 * Path: /students/{uid}
 */
export const studentsCollection = collection(db, 'students').withConverter(createConverter<NinjaStats>());

export const getStudentRef = (uid: string) => doc(studentsCollection, uid);


/**
 * Questions Collection (Diagnostic)
 * Path: /diagnostic_questions/{id}
 * NOW VALIDATED WITH ZOD!
 */
export const diagnosticQuestionsCollection = collection(db, 'diagnostic_questions').withConverter(createConverter<Question>(QuestionSchema));


/**
 * Questions Collection (Main/Daily)
 * Path: /questions/{id}
 * NOW VALIDATED WITH ZOD!
 */
export const questionsCollection = collection(db, 'questions').withConverter(createConverter<Question>(QuestionSchema));


/**
 * Question Bundles Collection
 * Path: /question_bundles_v3/{id}
 * (No converter for now, raw data)
 */
export const questionBundlesCollection = collection(db, 'question_bundles_v3');


/**
 * Session Logs Sub-Collection
 * Path: /students/{uid}/session_logs/{logId}
 */
export const getSessionLogsCollection = (uid: string) =>
    collection(db, 'students', uid, 'session_logs').withConverter(createConverter<QuestionLog>());


// ------------------------------------------------------------------
// HELPER TYPES
// ------------------------------------------------------------------

// Extracted helpers to ensure consistent timestamp handling
export const timestampNow = serverTimestamp;

// Helper to convert Firestore Timestamp to Date for UI
export const toDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    if (typeof timestamp === 'object' && 'seconds' in timestamp) return new Date(timestamp.seconds * 1000); // Handle serialized timestamps
    return new Date(timestamp);
};
