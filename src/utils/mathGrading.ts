/**
 * Semantic Math Grading Utility
 * Uses heuristic analysis to grade free-text math answers without LLMs.
 */
export const evaluateMathResponse = (userInput: string, expectedAnswer: string): { isCorrect: boolean, feedback?: string } => {
    if (!userInput || !expectedAnswer) return { isCorrect: false };

    const normalize = (s: string) => s.toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/−/g, '-') // Normalize minus sign
        .replace(/×/g, '*') // Normalize multiplication types
        .trim();

    const input = normalize(userInput);
    const expected = normalize(expectedAnswer);

    // 0. Strict Whitespace-Insensitive Match
    // Handles algebraic variations: "x=5" vs "x = 5"
    if (input.replace(/\s/g, '') === expected.replace(/\s/g, '')) {
        return { isCorrect: true };
    }

    // 1. Exact / Substring Match (The Basics)
    // We check if the 'core' of the answer is present.
    if (input === expected || input.includes(expected)) {
        return { isCorrect: true };
    }

    // 2. Numerical Equivalence Check
    // If the answer key defines a numeric outcome (e.g. "= 10"), 
    // strict text matching fails on "it is 10" or "ten".
    const extractNumbers = (text: string) => text.match(/-?\d+(\.\d+)?/g)?.map(Number) || [];
    const expectedNums = extractNumbers(expected);
    const inputNums = extractNumbers(userInput);

    // Logic: If the expected answer contains numbers, the user's answer MUST contain 
    // at least the 'final' number (usually the result) or the set of numbers involved.
    if (expectedNums.length > 0) {
        // A. Does input contain the Result Value? (The last number in the sequence)
        const finalResult = expectedNums[expectedNums.length - 1];
        const hasResult = inputNums.includes(finalResult);

        // B. Does input contain ANY of the key numbers from the equation?
        // E.g. expected: "x = 7". Input: "7". Valid.
        // E.g. expected: "7 + 3 = 10". Input: "10". Valid.
        if (hasResult) {
            // We consider it correct if they got the specific number right.
            // This assumes the question interaction prevents random guessing (which Error Analysis does).
            return { isCorrect: true };
        }
    }

    // 3. Keyword / Logic Check
    // If the expected answer is text-heavy: "Subtract 5 from both sides"
    // We look for overlap in meaningful words.
    const tokenizer = (s: string) => s.split(/[^a-z0-9]/).filter(t => t.length > 2 && isNaN(Number(t)));
    const expectedKeywords = tokenizer(expected);
    const inputKeywords = tokenizer(input);

    if (expectedKeywords.length > 0) {
        const matches = expectedKeywords.filter(k => inputKeywords.includes(k));
        const score = matches.length / expectedKeywords.length;

        // If > 60% of keywords match (e.g. "subtract", "both", "sides"), pass it.
        if (score > 0.6) return { isCorrect: true };
    }

    // Future Hook: Connect to LLM Service here
    // if (Flags.ENABLE_GEMINI) return await GeminiService.grade(userInput, expectedAnswer);

    return { isCorrect: false };
};
