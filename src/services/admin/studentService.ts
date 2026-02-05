import {
    collection,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    serverTimestamp,
    query,
    orderBy,
    Timestamp
} from 'firebase/firestore';
import { db } from '../../services/db/firebase';
import type {
    StudentProfile,
    StudentMetrics,
    StudentWithMetrics,
    StudentProfileUpdateData
} from '../../types/admin/student';

/**
 * Student Service - Firestore operations for admin student management
 */
export const studentService = {
    /**
     * Get all students
     */
    getAllStudents: async (): Promise<StudentWithMetrics[]> => {
        try {
            const studentsRef = collection(db, 'students');
            const studentsQuery = query(studentsRef, orderBy('createdAt', 'desc'));
            const studentsSnap = await getDocs(studentsQuery);

            const students: StudentWithMetrics[] = [];

            for (const studentDoc of studentsSnap.docs) {
                const studentData = studentDoc.data() as StudentProfile;

                // Fetch metrics for each student
                const metricsRef = doc(db, `students/${studentDoc.id}/metrics/current`);
                const metricsSnap = await getDoc(metricsRef);
                const metrics = metricsSnap.exists() ? metricsSnap.data() as StudentMetrics : undefined;

                students.push({
                    ...studentData,
                    studentId: studentDoc.id,
                    metrics
                });
            }

            return students;
        } catch (error) {
            console.error('Error fetching students:', error);
            throw new Error('Failed to fetch students');
        }
    },

    /**
     * Get single student profile
     */
    getStudentProfile: async (studentId: string): Promise<StudentProfile | null> => {
        try {
            const studentRef = doc(db, 'students', studentId);
            const studentSnap = await getDoc(studentRef);

            if (!studentSnap.exists()) {
                return null;
            }

            return {
                ...studentSnap.data() as StudentProfile,
                studentId
            };
        } catch (error) {
            console.error('Error fetching student profile:', error);
            throw new Error('Failed to fetch student profile');
        }
    },

    /**
     * Get student metrics
     */
    getStudentMetrics: async (studentId: string): Promise<StudentMetrics | null> => {
        try {
            const metricsRef = doc(db, `students/${studentId}/metrics/current`);
            const metricsSnap = await getDoc(metricsRef);

            if (!metricsSnap.exists()) {
                return null;
            }

            return metricsSnap.data() as StudentMetrics;
        } catch (error) {
            console.error('Error fetching student metrics:', error);
            throw new Error('Failed to fetch student metrics');
        }
    },

    /**
     * Update student profile
     */
    updateStudentProfile: async (
        studentId: string,
        updates: StudentProfileUpdateData | any
    ): Promise<void> => {
        try {
            const studentRef = doc(db, 'students', studentId);

            // Filter out undefined values to prevent Firestore errors
            const cleanUpdates: any = {};
            Object.entries(updates).forEach(([key, value]) => {
                if (value !== undefined) {
                    cleanUpdates[key] = value;
                }
            });

            // Only update if there are valid fields
            if (Object.keys(cleanUpdates).length > 0) {
                await updateDoc(studentRef, {
                    ...cleanUpdates,
                    updatedAt: serverTimestamp()
                });

                console.log(`✅ Student ${studentId} profile updated`);
            } else {
                console.warn('No valid fields to update');
            }
        } catch (error) {
            console.error('Error updating student profile:', error);
            throw new Error('Failed to update student profile');
        }
    },

    /**
     * Get student with metrics (combined)
     */
    getStudentWithMetrics: async (studentId: string): Promise<StudentWithMetrics | null> => {
        try {
            const [profile, metrics] = await Promise.all([
                studentService.getStudentProfile(studentId),
                studentService.getStudentMetrics(studentId)
            ]);

            if (!profile) {
                return null;
            }

            return {
                ...profile,
                metrics: metrics || undefined
            };
        } catch (error) {
            console.error('Error fetching student with metrics:', error);
            throw new Error('Failed to fetch student data');
        }
    },

    /**
     * Initialize default student profile (called after user registration)
     */
    initializeStudentProfile: async (
        studentId: string,
        studentName: string,
        email: string
    ): Promise<void> => {
        try {
            const studentRef = doc(db, 'students', studentId);
            const studentSnap = await getDoc(studentRef);

            // Only initialize if profile doesn't exist
            if (!studentSnap.exists()) {
                const defaultProfile: Partial<StudentProfile> = {
                    studentId,
                    studentName,
                    email,
                    grade: 7,  // Default grade
                    curriculum: 'CBSE',
                    preferredLayout: 'study-era',
                    enrolledSubjects: ['math', 'science', 'english', 'social'],
                    dailyQuestionConfig: {
                        weekday: 20,
                        weekend: 25,
                        holiday: 30
                    },
                    createdAt: serverTimestamp() as Timestamp,
                    updatedAt: serverTimestamp() as Timestamp
                };

                await updateDoc(studentRef, defaultProfile);
                console.log(`✅ Initialized profile for student ${studentId}`);
            }
        } catch (error) {
            console.error('Error initializing student profile:', error);
            throw new Error('Failed to initialize student profile');
        }
    }
};
