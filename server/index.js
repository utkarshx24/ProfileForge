import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { analysisSchema, groqAnalysisJsonSchema, requestSchema } from './schema.js';
import { buildPrompt } from './prompt.js';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.env') });

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map(origin => origin.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.includes(origin));
  },
}));
app.use(express.json({ limit: '64kb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/api/analyze', async (req, res) => {
  const parsedInput = requestSchema.safeParse(req.body);
  if (!parsedInput.success) {
    return res.status(400).json({ error: parsedInput.error.issues[0]?.message || 'Please check your input and try again.' });
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    return res.status(503).json({ error: 'Set a valid GROQ_API_KEY in server/.env to enable profile reviews.' });
  }

  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let responseText;
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: buildPrompt(parsedInput.data, lastError?.message) }],
          response_format: {
            type: 'json_schema',
            json_schema: { name: 'profile_analysis', strict: true, schema: groqAnalysisJsonSchema },
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Groq HTTP ${response.status}: ${errorBody}`);
      }

      const payload = await response.json();
      responseText = payload.choices?.[0]?.message?.content;
      if (typeof responseText !== 'string' || !responseText.trim()) {
        throw new Error('Groq API returned empty response content');
      }
    } catch (error) {
      console.error('Groq request failed:', error?.message);
      return res.status(502).json({ error: 'ProfileForge could not reach Groq. Check your API key and terminal logs.' });
    }

    try {
      const result = analysisSchema.parse(JSON.parse(responseText));
      return res.json(result);
    } catch (error) {
      lastError = error;
    }
  }

  console.error('Groq analysis failed after retry:', lastError?.message);
  return res.status(502).json({ error: 'ProfileForge received an incomplete analysis. Please try again in a moment.' });
});

app.use((_req, res) => res.status(404).json({ error: 'This ProfileForge endpoint does not exist.' }));
app.use((error, _req, res, _next) => {
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'That request is too large. Shorten the pasted text and try again.' });
  }
  if (error instanceof SyntaxError && error.status === 400) {
    return res.status(400).json({ error: 'Request body must be valid JSON.' });
  }
  console.error('Unhandled API error:', error?.message);
  return res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
});

const port = Number(process.env.PORT) || 5000;
app.listen(port, () => console.log(`ProfileForge API listening on http://localhost:${port}`));

// Keep your existing app.listen() code if you want it for local development, but add this:
export default app;