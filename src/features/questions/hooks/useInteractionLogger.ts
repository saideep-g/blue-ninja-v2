import { useState, useEffect, useRef, useCallback } from 'react';
import { RawInteractionLog } from '../domain';

export function useInteractionLogger() {
    const [logs, setLogs] = useState<RawInteractionLog[]>([]);
    const logsRef = useRef<RawInteractionLog[]>([]);

    // Helper to add log safely
    const log = useCallback((type: RawInteractionLog['type'], payload?: any) => {
        const entry: RawInteractionLog = {
            type,
            payload,
            timestamp: Date.now()
        };
        logsRef.current.push(entry);
        setLogs(prev => [...prev, entry]);
    }, []);

    // Standard Lifecycle Listeners
    useEffect(() => {
        log('mount');

        const handleFocus = () => log('focus');
        const handleBlur = () => log('blur');
        const handleVisibilityChange = () => {
            if (document.hidden) log('blur', { reason: 'visibility_hidden' });
            else log('focus', { reason: 'visibility_visible' });
        };

        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [log]);

    return {
        logs: logsRef.current, // Use ref for immediate access in callbacks
        logInteraction: log
    };
}
