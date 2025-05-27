
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Ensure GOOGLE_API_KEY is being read.
// In Next.js, server-side code should automatically load .env or .env.local.
const apiKey = process.env.GOOGLE_API_KEY;

let resolvedAi;

if (!apiKey) {
  console.warn(
    'WARNING: GOOGLE_API_KEY is not set in your environment variables. Genkit will be initialized without Google AI features. AI-powered functionalities like tag suggestion will not work.'
  );
  // Initialize Genkit without plugins if the API key is missing.
  // Operations requiring a model (like ai.generate or prompts) will likely fail at runtime if called.
  resolvedAi = genkit({
    // Consider adding flowStateStore and traceStore if you use Genkit UI locally,
    // even without model plugins. For now, this ensures `ai` is a defined object.
  });
} else {
  try {
    resolvedAi = genkit({
      plugins: [googleAI({apiKey: apiKey})], // Explicitly pass apiKey
      model: 'googleai/gemini-1.5-flash', // Ensure this is a valid and available model
    });
    console.log('Genkit initialized successfully with Google AI plugin.');
  } catch (error) {
    console.error('ERROR: Failed to initialize Genkit with Google AI plugin:', error);
    console.warn(
      'WARNING: Falling back to Genkit without Google AI features due to initialization error. AI-powered functionalities will not work.'
    );
    // Fallback to a basic Genkit instance if plugin initialization fails.
    resolvedAi = genkit({});
  }
}

export const ai = resolvedAi;
