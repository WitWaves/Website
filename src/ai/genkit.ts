
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

let resolvedAi;

// Ensure GOOGLE_API_KEY is being read, Next.js should load .env automatically for server-side code.
const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.warn(
    'WARNING: GOOGLE_API_KEY is not set in your environment variables. Genkit will be initialized without Google AI features. AI-powered functionalities like tag suggestion will not work.'
  );
  // Initialize Genkit without plugins if the API key is missing.
  // Operations requiring a model (like ai.generate or prompts) will likely fail at runtime.
  resolvedAi = genkit({
    // Adding a flowStateStore and traceStore can be useful even without plugins
    // but let's keep it minimal to ensure `ai` is defined.
    // You might need to add flowStateStore and traceStore for Genkit UI to work locally if you use `genkit start`.
    // For now, this ensures `ai` is an object.
  });
} else {
  try {
    resolvedAi = genkit({
      plugins: [googleAI({apiKey: apiKey})], // Explicitly pass apiKey if preferred, though it should pick from env
      model: 'googleai/gemini-1.5-flash',
    });
    console.log('Genkit initialized successfully with Google AI plugin.');
  } catch (error) {
    console.error('ERROR: Failed to initialize Genkit with Google AI plugin:', error);
    console.warn(
      'WARNING: Falling back to Genkit without Google AI features due to initialization error. AI-powered functionalities will not work.'
    );
    // Fallback to a basic Genkit instance.
    resolvedAi = genkit({});
  }
}

export const ai = resolvedAi;
