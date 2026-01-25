import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';

interface EraExpansionOverlayProps {
    isExpanding: boolean;
    expandingSubject: any;
    expansionRect: { top: number, left: number, width: number, height: number } | null;
}

export const EraExpansionOverlay: React.FC<EraExpansionOverlayProps> = ({ isExpanding, expandingSubject, expansionRect }) => {
    return (
        <AnimatePresence mode="wait">
            {expandingSubject && expansionRect && (
                <motion.div
                    key="expansion-overlay"
                    className="fixed z-[1000] pointer-events-none overflow-hidden"
                    initial={{
                        top: expansionRect.top,
                        left: expansionRect.left,
                        width: expansionRect.width,
                        height: expansionRect.height,
                        borderRadius: '3rem',
                    }}
                    animate={{
                        top: isExpanding ? 0 : expansionRect.top,
                        left: isExpanding ? 0 : expansionRect.left,
                        width: isExpanding ? '100vw' : expansionRect.width,
                        height: isExpanding ? '100vh' : expansionRect.height,
                        borderRadius: isExpanding ? '0rem' : '3rem',
                    }}
                    exit={{
                        opacity: 0,
                        scale: 1.05,
                        transition: { duration: 0.4 }
                    }}
                    transition={{
                        type: "spring",
                        stiffness: 120,
                        damping: 20,
                        mass: 0.8
                    }}
                >
                    {/* Background */}
                    <motion.div
                        className={`absolute inset-0 bg-gradient-to-br ${expandingSubject.color}`}
                    />

                    {/* WAVES / RIPPLES */}
                    <motion.div
                        className="absolute inset-0 flex items-center justify-center opacity-30"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.3 }}
                    >
                        <motion.div
                            className="w-[50vw] h-[50vw] border-4 border-white/20 rounded-full"
                            animate={{ scale: [0.8, 1.2], opacity: [0.5, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                        <motion.div
                            className="absolute w-[40vw] h-[40vw] border-4 border-white/30 rounded-full"
                            animate={{ scale: [0.8, 1.3], opacity: [0.6, 0] }}
                            transition={{ duration: 2, delay: 0.5, repeat: Infinity }}
                        />
                    </motion.div>

                    {/* Icon Scaling with Rotation */}
                    <motion.div
                        className="absolute inset-0 flex items-center justify-center"
                        initial={{ scale: 1, opacity: 1, rotate: 0 }}
                        animate={{
                            scale: isExpanding ? 4 : 1,
                            opacity: isExpanding ? 0.2 : 1,
                            rotate: isExpanding ? 360 : 0
                        }}
                        transition={{ duration: 1.2, ease: "anticipate" }}
                    >
                        <span className="text-6xl">{expandingSubject.icon}</span>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
