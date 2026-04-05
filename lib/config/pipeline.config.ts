/**
 * LUCID LABS — Pipeline Configuration
 * All constants from the dataset_creation_plan.md (Section 2: Matrice Combinatoire)
 */

export const STUDENT_LEVELS = [
    '6ème', '5ème', '4ème', '3ème',
    'Seconde', 'Première', 'Terminale'
] as const;

export const SUBJECTS = [
    'Mathématiques', 'Français', 'Histoire-Géographie',
    'Physique-Chimie', 'SVT', 'Anglais (LVA)',
    'Espagnol (LVB)', 'Allemand (LVB)', 'Italien (LVB)',
    'Technologie', 'Philosophie',
    'SES', 'NSI', 'Enseignement Scientifique',
    'HGGSP', 'HLP', 'LLCER', "Sciences de l'Ingénieur"
] as const;

// Subjects available per level (simplified mapping)
export const SUBJECTS_BY_LEVEL: Record<string, string[]> = {
    '6ème': ['Mathématiques', 'Français', 'Histoire-Géographie', 'SVT', 'Anglais (LVA)', 'Technologie'],
    '5ème': ['Mathématiques', 'Français', 'Histoire-Géographie', 'Physique-Chimie', 'SVT', 'Anglais (LVA)', 'Espagnol (LVB)', 'Allemand (LVB)', 'Italien (LVB)', 'Technologie'],
    '4ème': ['Mathématiques', 'Français', 'Histoire-Géographie', 'Physique-Chimie', 'SVT', 'Anglais (LVA)', 'Espagnol (LVB)', 'Allemand (LVB)', 'Italien (LVB)', 'Technologie'],
    '3ème': ['Mathématiques', 'Français', 'Histoire-Géographie', 'Physique-Chimie', 'SVT', 'Anglais (LVA)', 'Espagnol (LVB)', 'Allemand (LVB)', 'Italien (LVB)', 'Technologie'],
    'Seconde': ['Mathématiques', 'Français', 'Histoire-Géographie', 'Physique-Chimie', 'SVT', 'Anglais (LVA)', 'Espagnol (LVB)', 'Allemand (LVB)', 'Italien (LVB)', 'SES', 'Enseignement Scientifique'],
    'Première': ['Mathématiques', 'Français', 'Histoire-Géographie', 'Physique-Chimie', 'SVT', 'Anglais (LVA)', 'Espagnol (LVB)', 'Allemand (LVB)', 'Italien (LVB)', 'SES', 'NSI', 'Enseignement Scientifique', 'HGGSP', 'HLP', 'LLCER', "Sciences de l'Ingénieur"],
    'Terminale': ['Mathématiques', 'Français', 'Histoire-Géographie', 'Physique-Chimie', 'SVT', 'Anglais (LVA)', 'Espagnol (LVB)', 'Allemand (LVB)', 'Italien (LVB)', 'Philosophie', 'SES', 'NSI', 'Enseignement Scientifique', 'HGGSP', 'HLP', 'LLCER', "Sciences de l'Ingénieur"],
};

export const QUIZ_MODES = ['recall', 'single_subject', 'all_subjects'] as const;
export const FLASHCARD_MODES = ['standard', 'word_for_word', 'long_definition'] as const;
export const REVISION_LENGTHS = ['short', 'regular', 'long'] as const;
export const CONTEXT_STYLES = ['telegraphic', 'structured'] as const;

export const TASK_TYPES = ['quiz', 'homework', 'flashcards', 'revision', 'tutor'] as const;

// Dataset target distribution (~10,000 examples)
export const DATASET_TARGETS = {
    quiz: { count: 3000, percent: 30 },
    tutor: { count: 3000, percent: 30 },
    flashcards: { count: 1500, percent: 15 },
    revision: { count: 1500, percent: 15 },
    homework: { count: 1000, percent: 10 },
} as const;

export const TOTAL_TARGET = 10000;

// Judge
export const JUDGE_THRESHOLD = 9; // /10 — Gold Data minimum
export const JUDGE_MAX_SCORE = 10;

// Quiz
export const QUIZ_QUESTION_COUNT = 10;
export const FLASHCARD_COUNT = 12;

// Batch defaults
export const DEFAULT_BATCH_SIZE = 10;
export const DEFAULT_WORKER_COUNT = 2;
export const WORKER_DELAY_MS = 1500;

export type StudentLevel = typeof STUDENT_LEVELS[number];
export type Subject = typeof SUBJECTS[number];
export type QuizMode = typeof QUIZ_MODES[number];
export type FlashcardMode = typeof FLASHCARD_MODES[number];
export type RevisionLength = typeof REVISION_LENGTHS[number];
export type ContextStyle = typeof CONTEXT_STYLES[number];
export type TaskType = typeof TASK_TYPES[number];
