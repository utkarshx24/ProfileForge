import { z } from 'zod';

export const requestSchema = z.object({
  profileText: z.string().trim().min(40, 'Add at least 40 characters of profile text so the analysis has something to work with.').max(12000, 'Profile text must be 12,000 characters or fewer.'),
  targetRole: z.string().trim().min(2, 'Enter a target role.').max(120, 'Target role must be 120 characters or fewer.'),
  company: z.string().trim().max(120, 'Company must be 120 characters or fewer.').optional().default(''),
  jobDescription: z.string().trim().max(8000, 'Job description must be 8,000 characters or fewer.').optional().default(''),
});

export const analysisSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  sectionScores: z.object({
    headline: z.number().int().min(0).max(100),
    about: z.number().int().min(0).max(100),
    experience: z.number().int().min(0).max(100),
    skills: z.number().int().min(0).max(100),
  }),
  strengths: z.array(z.string()).max(6),
  gaps: z.array(z.object({
    skill: z.string(),
    priority: z.enum(['high', 'med', 'low']),
    why: z.string(),
    searchQuery: z.string(),
  })).length(5),
  rewrite: z.object({ headline: z.string().max(220), about: z.string() }),
  questionsForUser: z.array(z.string()).max(10),
  confidenceNotes: z.string(),
}).strict().superRefine((result, context) => {
  const { headline, about, experience, skills } = result.sectionScores;
  const expected = Math.round((headline + about + experience + skills) / 4);
  if (result.overallScore !== expected) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['overallScore'], message: `Overall score must equal the section average (${expected}).` });
  }
});

export const groqAnalysisJsonSchema = {
  type: 'object',
  properties: {
    overallScore: { type: 'integer' },
    sectionScores: {
      type: 'object',
      properties: {
        headline: { type: 'integer' },
        about: { type: 'integer' },
        experience: { type: 'integer' },
        skills: { type: 'integer' },
      },
      required: ['headline', 'about', 'experience', 'skills'],
      additionalProperties: false,
    },
    strengths: {
      type: 'array',
      items: { type: 'string' },
    },
    gaps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          skill: { type: 'string' },
          priority: { type: 'string', enum: ['high', 'med', 'low'] },
          why: { type: 'string' },
          searchQuery: { type: 'string' },
        },
        required: ['skill', 'priority', 'why', 'searchQuery'],
        additionalProperties: false,
      },
    },
    rewrite: {
      type: 'object',
      properties: {
        headline: { type: 'string' },
        about: { type: 'string' },
      },
      required: ['headline', 'about'],
      additionalProperties: false,
    },
    questionsForUser: {
      type: 'array',
      items: { type: 'string' },
    },
    confidenceNotes: { type: 'string' },
  },
  required: ['overallScore', 'sectionScores', 'strengths', 'gaps', 'rewrite', 'questionsForUser', 'confidenceNotes'],
  additionalProperties: false,
};