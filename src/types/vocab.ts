export interface VocabSet {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface VocabCard {
  id: string;
  set_id: string;
  term: string;
  definition: string;
  image_url: string | null;
  position: number;
}

export type MasteryBox = 1 | 2 | 3 | 4 | 5;

export interface VocabProgress {
  id: string;
  user_id: string;
  card_id: string;
  box: MasteryBox;
  correct_count: number;
  wrong_count: number;
  last_seen_at: string;
}

export interface CardWithProgress extends VocabCard {
  progress: VocabProgress | null;
}

export type StudyMode = 'cards' | 'learn' | 'test' | 'match';

export type QuestionType = 'qcm' | 'written' | 'truefalse';

/**
 * Comme Quizlet : la question interroge parfois terme→définition,
 * parfois définition→terme (ex: montrer une image/phrase et demander
 * le mot, plutôt que l'inverse).
 */
export type QuestionDirection = 'term-to-def' | 'def-to-term';

export interface QcmQuestion {
  type: 'qcm';
  card: VocabCard;
  direction: QuestionDirection;
  choices: string[];
  correctIndex: number;
}

export interface WrittenQuestion {
  type: 'written';
  card: VocabCard;
  direction: QuestionDirection;
}

export interface TrueFalseQuestion {
  type: 'truefalse';
  card: VocabCard;
  direction: QuestionDirection;
  shownAnswer: string;
  isCorrect: boolean;
}

export type Question = QcmQuestion | WrittenQuestion | TrueFalseQuestion;
