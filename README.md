# ProfileForge

ProfileForge helps people shape a clearer LinkedIn profile for the work they want next. Paste profile text, choose a target role, and get a grounded review with practical edits. Profile text is sent to Groq for analysis, then the latest form and result are saved in this browser. Nothing is published to LinkedIn.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install` in this folder.
3. Paste your Groq API key into `server/.env` as the value of `GROQ_API_KEY`. The homepage does not ask for or send the API key.
4. Run `npm run dev`.
5. Open the Vite URL shown in the terminal and choose **Try a sample** to explore the experience.

The server defaults to `openai/gpt-oss-120b`; set `GROQ_MODEL` in `server/.env` to use another supported model. The key stays on the server and is never sent by the browser. If you access the server from a different web origin, add it to `CORS_ORIGINS` as a comma-separated list.

## What's included

- A role-based profile score with headline, About, experience, and skills breakdowns.
- Five skill gaps with learning searches, profile strengths, headline and About rewrites, and questions for missing evidence.
- A writable profile revision area with before-and-after re-scoring.
- Local storage for the latest review, baseline score, and form.
- Three sample profiles for the API: strong, vague, and non-technical.

`GET /api/health` checks the API. `npm run build` builds the frontend. With the API server running, `npm run test:profiles` sends each sample profile and prints its score or a setup error.

The review is a writing aid, not a prediction of a company's hiring decision. Check every suggestion and use only details that are true for you.
