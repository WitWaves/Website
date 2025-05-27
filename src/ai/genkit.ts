import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Ensure you have GOOGLE_API_KEY set in your .env file for this plugin to work.
// The googleAI() plugin will automatically try to use Application Default Credentials
// or pick up the GOOGLE_API_KEY from process.env.
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-flash', // Updated model name
});
