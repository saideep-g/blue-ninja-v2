import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import Confetti from 'react-confetti';

interface EraCelebrationProps {
    showCelebration: boolean;
    celebrationMessage: string;
}

export const EraCelebration: React.FC<EraCelebrationProps> = ({ showCelebration, celebrationMessage }) => {
    return (
        <AnimatePresence>
            {showCelebration && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-none"
                >
                    <Confetti
                        width={window.innerWidth}
                        height={window.innerHeight}
                        numberOfPieces={400}
                        recycle={false}
                        colors={['#A78BFA', '#F472B6', '#34D399', '#FBBF24']}
                    />
                    <motion.div
                        initial={{ scale: 0.5, y: 100 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 1.5, opacity: 0 }}
                        transition={{ type: "spring", bounce: 0.5 }}
                        className="bg-theme-card rounded-[3rem] p-12 text-center shadow-[0_0_100px_rgba(167,139,250,0.5)] border-4 border-white relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-100 via-pink-100 to-yellow-100 opacity-50" />
                        <div className="relative z-10">
                            <motion.div
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                                className="text-8xl mb-6"
                            >
                                👑
                            </motion.div>
                            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-4 tracking-tighter">
                                {celebrationMessage}
                            </h1>
                            <p className="text-xl font-bold text-color-text-secondary uppercase tracking-widest">
                                Era Conquered
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
