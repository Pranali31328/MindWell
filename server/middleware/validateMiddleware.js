const { z } = require('zod');

/**
 * Creates an Express middleware that validates req.body against a Zod schema.
 * On failure returns 400 with structured validation errors.
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({ error: 'Validation failed.', details: errors });
    }
    req.body = result.data; // Use parsed (sanitized) data
    next();
  };
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const onboardingSchema = z.object({
  profession: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  personality: z.enum(['analytical', 'emotional', 'creative', 'focused']).optional(),
  primaryStressors: z.array(z.string()).optional(),
  goals: z.array(z.string()).optional(),
});

const chatSendSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  text: z.string().min(1, 'Message text is required').max(4000),
  therapyMethod: z.enum(['warm', 'cbt', 'mindfulness']).optional(),
  personality: z.string().optional(),
});

const chatSessionSchema = z.object({
  therapyMethod: z.enum(['warm', 'cbt', 'mindfulness']).optional(),
});

const journalSchema = z.object({
  text: z.string().min(1, 'Journal text is required').max(10000),
  mood: z.string().max(50).optional(),
  tags: z.array(z.string().max(50)).optional(),
  analysis: z.any().optional(),
  copingTip: z.string().max(1000).optional(),
});

const goalSchema = z.object({
  title: z.string().min(1, 'Goal title is required').max(300),
  category: z.enum(['wellness', 'work', 'personal', 'fitness', 'mindfulness']).optional(),
});

const moodCheckInSchema = z.object({
  moodIndex: z.number().int().min(0).max(4),
  moodLabel: z.string().max(50).optional(),
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  onboardingSchema,
  chatSendSchema,
  chatSessionSchema,
  journalSchema,
  goalSchema,
  moodCheckInSchema,
};
