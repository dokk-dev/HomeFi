import { z } from "zod";

const RecurrenceRuleSchema = z.object({
  days: z
    .array(z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]))
    .min(1),
  recurrenceType: z.enum(["perpetual", "temporary", "raincheck"]),
  endsAt: z.string().nullable(),
});

export const CreateTaskSchema = z.object({
  pillar_id: z.string().min(1),
  title: z.string().trim().min(1, "Title is required").max(200),
  notes: z.string().max(5000).optional(),
  advisory_minutes: z.number().int().min(1).max(1440).optional(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "due_date must be YYYY-MM-DD")
    .optional(),
  recurrence_rule: RecurrenceRuleSchema.nullable().optional(),
});

export const UpdateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  notes: z.string().max(5000).nullable().optional(),
  is_complete: z.boolean().optional(),
  advisory_minutes: z.number().int().min(1).max(1440).nullable().optional(),
  position: z.number().int().min(0).optional(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  recurrence_rule: RecurrenceRuleSchema.nullable().optional(),
});

export const CreateStepSchema = z.object({
  task_id: z.string().min(1),
  title: z.string().trim().min(1, "Title is required").max(200),
});

export const CreatePillarSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color hex").default("#6366f1"),
  description: z.string().max(500).optional(),
  icon_key: z.string().max(50).optional(),
});

export const ChatBodySchema = z.object({
  pillarSlug: z.string().min(1).max(50),
  message: z.string().trim().min(1, "Message is required").max(8000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(10000),
      })
    )
    .max(50)
    .default([]),
  provider: z.enum(["ollama", "gemini"]).default("ollama"),
  model: z.string().max(100).optional(),
});
