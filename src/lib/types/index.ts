export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompetencyArea {
  name: string;
  description: string;
  weight: number;
  target_skills: string[];
}

export interface Pillar {
  id: string;
  user_id: string;
  slug: string;
  label: string;
  description: string | null;
  color: string;
  icon_key: string;
  position: number;
  mastery: number;
  competency_areas: CompetencyArea[];
  created_at: string;
  task_count?: number;
  completed_count?: number;
  streak?: number;
}

export interface QuizResult {
  id: string;
  user_id: string;
  pillar_id: string;
  competency_name: string;
  score: number;
  max_score: number;
  questions: unknown;
  taken_at: string;
}

export interface RecurrenceRule {
  days: string[];
  recurrenceType: "perpetual" | "temporary" | "raincheck";
  endsAt: string | null;
}

export interface Task {
  id: string;
  pillar_id: string;
  user_id: string;
  title: string;
  notes: string | null;
  is_complete: boolean;
  advisory_minutes: number | null;
  position: number;
  completed_at: string | null;
  due_date: string | null;
  recurrence_rule: RecurrenceRule | null;
  created_at: string;
  updated_at: string;
  steps?: Step[];
}

export interface Step {
  id: string;
  task_id: string;
  user_id: string;
  title: string;
  is_complete: boolean;
  position: number;
  created_at: string;
}

export interface CreateTaskInput {
  pillar_id: string;
  title: string;
  notes?: string;
  advisory_minutes?: number;
  due_date?: string;
  recurrence_rule?: RecurrenceRule | null;
}

export interface UpdateTaskInput {
  title?: string;
  notes?: string;
  is_complete?: boolean;
  advisory_minutes?: number;
  position?: number;
  due_date?: string;
  recurrence_rule?: RecurrenceRule | null;
}

export interface CreateStepInput {
  task_id: string;
  title: string;
}

export interface UpdateStepInput {
  title?: string;
  is_complete?: boolean;
  position?: number;
}
