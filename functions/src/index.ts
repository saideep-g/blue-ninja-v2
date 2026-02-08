import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { defineSecret } from 'firebase-functions/params';

// Initialize Firebase Admin
admin.initializeApp();

// Define secret parameter
const geminiApiKey = defineSecret('GEMINI_API_KEY');

/**
 * Cloud Function: evaluateShortAnswer (2nd Gen)
 * 
 * Uses the new @google/genai SDK (v0.1.0+)
 * Evaluates a student's short answer using Gemini 2.5 Flash API
 */
export const evaluateShortAnswer = onCall(
    {
        timeoutSeconds: 60,
        memory: '512MiB',
        maxInstances: 10,
        secrets: [geminiApiKey]
    },
    async (request) => {
        const startTime = Date.now();

        // Get API key from secret
        const apiKey = geminiApiKey.value();
        if (!apiKey) {
            throw new HttpsError(
                'failed-precondition',
                'GEMINI_API_KEY secret not configured'
            );
        }

        // Import the new SDK dynamically
        let GoogleGenAI;
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const genaiModule = require('@google/genai');
            GoogleGenAI = genaiModule.GoogleGenAI || genaiModule.default;
        } catch (e: any) {
            console.error("Failed to load @google/genai SDK:", e);
            throw new HttpsError('internal', 'AI SDK initialization failed: ' + e.message);
        }

        // Initialize Client
        let aiClient;
        try {
            aiClient = new GoogleGenAI({ apiKey: apiKey });
        } catch (e: any) {
            throw new HttpsError('internal', 'AI Client initialization failed: ' + e.message);
        }

        // Security: Verify authenticated user
        if (!request.auth) {
            throw new HttpsError(
                'unauthenticated',
                'User must be authenticated to use AI evaluation'
            );
        }

        // Validate input
        const { question, student_answer, evaluation_criteria, max_points = 3 } = request.data;

        if (!question || !student_answer || !evaluation_criteria || !Array.isArray(evaluation_criteria)) {
            throw new HttpsError(
                'invalid-argument',
                'Missing required fields: question, student_answer, evaluation_criteria'
            );
        }

        try {
            // Build Prompt
            const systemPrompt = `
You are a supportive, encouraging peer tutor helping a student understand a concept. Your goal is to evaluate their answer against a specific rubric while maintaining a warm, positive tone.

CRITICAL INSTRUCTIONS:
1. **Persona**: Speak as a helpful study partner, not a robot or strict professor. Use phrases like "You nailed this part!" or "Great start!".
2. **Perspective**: ALWAYS address the student directly as "**You**". Never use "The student" or third-person language.
3. **The Feedback Sandwich**:
   - **Start with functionality**: Acknowledge what **you** got right first.
   - **Identify the Gap**: Clearly explain what key concept was missing based on the rubric.
   - **Provide a Hint**: Offer a constructive nudge towards the correct answer without just giving it away.
4. **Accuracy**: Be encouraging but scientifically accurate. Do not award points if the core concept is missing.
5. **Format**: Return ONLY valid JSON matching the schema below.

Input Data:
- Question: "${question}"
- Student Answer: "${student_answer}"
- Max Points: ${max_points}
- Evaluation Criteria (Rubric):
${JSON.stringify(evaluation_criteria, null, 2)}

Output JSON Schema:
{
  "score": <number between 0 and ${max_points}>,
  "results": [
    {
      "criterion": "<criterion text from rubric>",
      "passed": <true or false>,
      "feedback": "Identify the specific phrase in the student's answer that met this criterion. If failed, explain what key concept was missing. Do NOT just say 'Great explanation'."
    }
  ],
  "summary": "Brief overall assessment in 1-2 sentences. Use warm, encouraging language."
}`;

            const userPrompt = `Question: ${question}

Student's Answer: "${student_answer}"

Evaluation Criteria (each worth 1 point):
${evaluation_criteria.map((criterion: string, idx: number) => `${idx + 1}. ${criterion}`).join('\n')}

Maximum Points: ${max_points}

Evaluate the student's answer and respond with this EXACT JSON structure:
{
  "score": <number between 0 and ${max_points}>,
  "results": [
    {
      "criterion": "<criterion text>",
      "passed": <true or false>,
      "feedback": "Identify the specific phrase in the student's answer that met this criterion. If failed, explain what key concept was missing. Do NOT just say 'Great explanation'."
    }
  ],
  "summary": "Brief overall assessment in 1-2 sentences. Use warm, encouraging language."
}`;

            const modelName = 'gemini-2.5-flash';

            // NEW SDK Call Pattern
            // Syntax: client.models.generateContent({ model: ..., contents: ..., config: ... })
            const response = await aiClient.models.generateContent({
                model: modelName,
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: systemPrompt + "\n\n" + userPrompt }
                        ]
                    }
                ],
                config: {
                    responseMimeType: 'application/json',
                    temperature: 0.3, // Slightly higher for more natural tone, but still low for consistency
                }
            });

            // Handle Response (New SDK format)
            // It might return .text() function or direct .text property
            let responseText = "";

            if (response && typeof response.text === 'function') {
                responseText = response.text();
            } else if (response && response.text) {
                // If text is a string property
                responseText = response.text;
            } else if (response && response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts && response.candidates[0].content.parts[0]) {
                // Deep access fallback
                responseText = response.candidates[0].content.parts[0].text;
            } else {
                // Fallback for debugging
                responseText = JSON.stringify(response);
            }

            // Parse JSON
            let evaluation;
            try {
                // Clean up any markdown code blocks if present
                const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                evaluation = JSON.parse(cleaned);
            } catch (parseError) {
                console.error('Failed to parse Gemini response:', responseText);
                throw new HttpsError(
                    'internal',
                    'AI returned invalid response format: ' + responseText.substring(0, 100)
                );
            }

            // Validate structure
            if (evaluation.score === undefined && evaluation.evaluation) {
                // Try to resolve generic wrapping
                evaluation = evaluation.evaluation;
            }

            if (!evaluation.results) {
                // Attempt to recover if it returns just the array
                if (Array.isArray(evaluation)) {
                    evaluation = { score: 0, results: evaluation, summary: "Evaluated." };
                } else {
                    throw new HttpsError('internal', 'AI response missing results');
                }
            }

            // Calculate latency
            const latency = Date.now() - startTime;

            // Extract Usage Metadata (or fallback to approximation)
            const usageMetadata = (response as any).usageMetadata || {};
            const inputTokens = usageMetadata.promptTokenCount || Math.ceil((systemPrompt.length + userPrompt.length) / 4);
            const outputTokens = usageMetadata.candidatesTokenCount || Math.ceil(responseText.length / 4);
            const thoughtsTokens = usageMetadata.thoughtsTokenCount || 0;
            const totalTokens = usageMetadata.totalTokenCount || (inputTokens + outputTokens + thoughtsTokens);

            // Perform Server-Side Logging
            const now = new Date();

            // Construct full response object
            const finalResponse = {
                evaluation,
                usage: {
                    input_tokens: inputTokens,
                    output_tokens: outputTokens,
                    thoughts_tokens: thoughtsTokens,
                    total_tokens: totalTokens
                },
                metadata: {
                    latency,
                    model: modelName,
                    timestamp: now.toISOString()
                }
            };

            // Server-side logging removed per user request to capture true client-side latency.
            return finalResponse;

        } catch (error: any) {
            console.error('Gemini API Error:', error);

            // Server-side logging removed per user request. Failure logging is handled by client.

            throw new HttpsError(
                'internal',
                error.message || 'Failed to evaluate answer with AI'
            );
        }
    }
);
