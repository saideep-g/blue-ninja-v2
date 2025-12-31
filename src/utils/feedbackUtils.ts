export const GEN_Z_PRAISES = [
    "Slay! 🔥",
    "Periodt. 💅",
    "Main Character Energy ✨",
    "No crumbs left 🍪",
    "It's giving genius 🧠",
    "High key brilliant 🔑",
    "Big W 🏆",
    "Big brain moment 🤯",
    "ATE 🍽️",
    "Go off! 🚀",
    "Sheesh! 🥶",
    "Vibe check passed ✅",
    "Iconic behavior 🌟",
    "CEO of Math 💼",
    "Understood the assignment 📝",
    "Flex on 'em 💪",
    "Pure Gold 🥇",
    "Unmatched 🚫",
    "Straight Fire 🔥",
    "Zero Misses 🎯"
];

export const getRandomPraise = () => {
    return GEN_Z_PRAISES[Math.floor(Math.random() * GEN_Z_PRAISES.length)];
};
