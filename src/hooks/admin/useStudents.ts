import { useState, useEffect } from 'react';
import { studentService } from '../../services/admin/studentService';
import type { StudentWithMetrics, StudentProfile, StudentMetrics } from '../../types/admin/student';

/**
 * Hook to fetch all students with their metrics
 */
export function useStudents() {
    const [students, setStudents] = useState<StudentWithMetrics[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await studentService.getAllStudents();
            setStudents(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch students');
            console.error('Error in useStudents:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    return {
        students,
        loading,
        error,
        refetch: fetchStudents
    };
}

/**
 * Hook to fetch a single student profile
 */
export function useStudentProfile(studentId: string | undefined) {
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = async () => {
        if (!studentId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await studentService.getStudentProfile(studentId);
            setProfile(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch profile');
            console.error('Error in useStudentProfile:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [studentId]);

    return {
        profile,
        loading,
        error,
        refetch: fetchProfile
    };
}

/**
 * Hook to fetch student metrics
 */
export function useStudentMetrics(studentId: string | undefined) {
    const [metrics, setMetrics] = useState<StudentMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMetrics = async () => {
        if (!studentId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await studentService.getStudentMetrics(studentId);
            setMetrics(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
            console.error('Error in useStudentMetrics:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
    }, [studentId]);

    return {
        metrics,
        loading,
        error,
        refetch: fetchMetrics
    };
}

/**
 * Hook to fetch student with metrics (combined)
 */
export function useStudentWithMetrics(studentId: string | undefined) {
    const [student, setStudent] = useState<StudentWithMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStudent = async () => {
        if (!studentId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await studentService.getStudentWithMetrics(studentId);
            setStudent(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch student');
            console.error('Error in useStudentWithMetrics:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudent();
    }, [studentId]);

    return {
        student,
        loading,
        error,
        refetch: fetchStudent
    };
}
