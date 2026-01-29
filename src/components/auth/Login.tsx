import React, { useState } from 'react';
import { auth } from "../../services/db/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

/**
 * Login: The Dojo Entrance
 * Styled for the Blue Ninja theme. 
 * Allows students to enter their personal "Summer Sky" dashboard.
 */
function Login() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            if (isSignUp) {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                if (username) {
                    await updateProfile(cred.user, { displayName: username });
                }
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err: any) {
            setError(err.message.replace('Firebase:', ''));
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50 dark:bg-slate-900 transition-colors duration-500 overflow-hidden relative">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/50 dark:bg-blue-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-200/50 dark:bg-indigo-900/20 rounded-full blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle, #1e40af 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
            </div>

            <div className="w-full max-w-md px-4 relative z-10">
                <div className="ninja-card backdrop-blur-xl bg-white/80 dark:bg-slate-800/80 border-white/50 dark:border-slate-700/50 shadow-[0_20px_50px_rgba(30,64,175,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                    <div className="text-center mb-8">
                        <div className="inline-block p-4 bg-blue-50 dark:bg-blue-900/30 rounded-3xl mb-4 animate-bounce duration-3000">
                            <span className="text-5xl block">🌊</span>
                        </div>
                        <h2 className="text-4xl font-black text-blue-800 dark:text-blue-300 italic uppercase tracking-tighter mb-1">
                            Blue Ninja
                        </h2>
                        <div className="flex items-center justify-center gap-2">
                            <div className="h-1 w-8 bg-blue-500 rounded-full" />
                            <p className="text-blue-500 dark:text-blue-400 font-bold text-sm uppercase tracking-widest">
                                {isSignUp ? 'Begin your journey' : 'Welcome back, Ninja!'}
                            </p>
                            <div className="h-1 w-8 bg-blue-500 rounded-full" />
                        </div>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-5">
                        {isSignUp && (
                            <div className="space-y-1">
                                <label className="text-xs font-black text-blue-400 dark:text-blue-500 uppercase tracking-widest ml-1">Ninja Alias</label>
                                <input
                                    type="text"
                                    placeholder="e.g. ShadowCaster"
                                    className="input-field bg-white/50 dark:bg-slate-900/50"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                        )}
                        <div className="space-y-1">
                            <label className="text-xs font-black text-blue-400 dark:text-blue-500 uppercase tracking-widest ml-1">Guardian's Email</label>
                            <input
                                type="email"
                                placeholder="ninja@dojo.com"
                                className="input-field bg-white/50 dark:bg-slate-900/50"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-black text-blue-400 dark:text-blue-500 uppercase tracking-widest ml-1">Ninja Secret Code</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="input-field bg-white/50 dark:bg-slate-900/50"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-3 rounded-xl flex gap-3 items-center">
                                <span className="text-xl">⚠️</span>
                                <p className="text-red-500 dark:text-red-400 text-sm font-bold">{error}</p>
                            </div>
                        )}

                        <button type="submit" className="btn-primary w-full py-4 text-lg shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 transform active:scale-95 transition-all">
                            {isSignUp ? 'Create My Dojo' : 'Enter Dojo'}
                        </button>
                    </form>

                    <div className="mt-8 text-center border-t border-blue-50 dark:border-slate-700 pt-6">
                        <button
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-blue-600 dark:text-blue-400 font-black text-sm hover:underline flex items-center justify-center gap-2 mx-auto group"
                        >
                            {isSignUp ? 'Already a Ninja? Sign In' : 'New here? Start your Quest'}
                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </button>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <p className="text-xs text-blue-400 dark:text-blue-600 font-bold uppercase tracking-[0.2em] leading-loose italic">
                        "When I fly towards you, <br /> the whole world turns Blue."
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;