import type {
  VocabCard,
  Question,
  QcmQuestion,
  WrittenQuestion,
  TrueFalseQuestion,
  QuestionType,
  QuestionDirection,
} from '@/types/vocab';

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Le côté de la carte qui sert de réponse pour cette direction. */
function answerSide(direction: QuestionDirection): 'term' | 'definition' {
  return direction === 'term-to-def' ? 'definition' : 'term';
}

export function randomDirection(): QuestionDirection {
  return Math.random() < 0.5 ? 'term-to-def' : 'def-to-term';
}

function pickDistinctValues(
  cards: VocabCard[],
  side: 'term' | 'definition',
  exclude: string,
  count: number
): string[] {
  const unique = Array.from(new Set(cards.map((c) => c[side]).filter((v) => v !== exclude)));
  return shuffle(unique).slice(0, count);
}

/**
 * Un set peut avoir plusieurs cartes partageant la même définition
 * (ex: 7 prépositions de "LIEU"). Un QCM n'est généré que s'il existe
 * assez de valeurs distinctes du côté réponse pour éviter plusieurs
 * bonnes réponses simultanées.
 */
export function tryGenerateQcm(
  allCards: VocabCard[],
  targetCard: VocabCard,
  direction: QuestionDirection,
  numChoices = 4
): QcmQuestion | null {
  const side = answerSide(direction);
  const correctAnswer = targetCard[side];
  const distractors = pickDistinctValues(allCards, side, correctAnswer, numChoices - 1);
  if (distractors.length < numChoices - 1) return null;

  const choices = shuffle([correctAnswer, ...distractors]);
  const correctIndex = choices.indexOf(correctAnswer);

  return { type: 'qcm', card: targetCard, direction, choices, correctIndex };
}

export function generateTrueFalse(
  allCards: VocabCard[],
  targetCard: VocabCard,
  direction: QuestionDirection
): TrueFalseQuestion {
  const side = answerSide(direction);
  const correctAnswer = targetCard[side];
  const showCorrect = Math.random() < 0.5;
  if (showCorrect) {
    return { type: 'truefalse', card: targetCard, direction, shownAnswer: correctAnswer, isCorrect: true };
  }

  const alternatives = allCards.filter((c) => c[side] !== correctAnswer);
  if (alternatives.length === 0) {
    return { type: 'truefalse', card: targetCard, direction, shownAnswer: correctAnswer, isCorrect: true };
  }
  const wrong = alternatives[Math.floor(Math.random() * alternatives.length)];
  return { type: 'truefalse', card: targetCard, direction, shownAnswer: wrong[side], isCorrect: false };
}

export function generateWritten(targetCard: VocabCard, direction: QuestionDirection): WrittenQuestion {
  return { type: 'written', card: targetCard, direction };
}

/**
 * Choisit le meilleur type de question pour cette carte dans ce set.
 * Priorité : QCM si possible, sinon vrai/faux, jamais de QCM ambigu.
 *
 * `preferWritten` reproduit le comportement Quizlet en mode Apprendre :
 * plus une carte est maîtrisée (box élevée), plus on demande à l'écrire
 * plutôt qu'à la reconnaître, pour tester le vrai rappel.
 *
 * La direction (terme→définition ou définition→terme) est tirée au
 * sort par défaut, comme le "Les deux" de Quizlet.
 */
export function generateQuestion(
  allCards: VocabCard[],
  targetCard: VocabCard,
  opts?: { preferWritten?: boolean; direction?: QuestionDirection }
): Question {
  const direction = opts?.direction ?? randomDirection();

  if (opts?.preferWritten) return generateWritten(targetCard, direction);

  const qcm = tryGenerateQcm(allCards, targetCard, direction);
  if (qcm) return qcm;

  const side = answerSide(direction);
  const uniqueCount = new Set(allCards.map((c) => c[side])).size;
  if (uniqueCount <= 1) return generateWritten(targetCard, direction);

  return generateTrueFalse(allCards, targetCard, direction);
}

/**
 * Génère une question en respectant les types autorisés (config du Test,
 * façon "Configurez votre test" de Quizlet). Retombe toujours sur un type
 * autorisé même si le premier choix n'est pas disponible pour cette carte.
 */
export function generateConfigurableQuestion(
  allCards: VocabCard[],
  targetCard: VocabCard,
  allowedTypes: Set<QuestionType>,
  direction: QuestionDirection = randomDirection()
): Question {
  if (allowedTypes.has('qcm')) {
    const qcm = tryGenerateQcm(allCards, targetCard, direction);
    if (qcm) return qcm;
  }
  if (allowedTypes.has('truefalse')) {
    return generateTrueFalse(allCards, targetCard, direction);
  }
  return generateWritten(targetCard, direction);
}

export function generateTestSession(
  allCards: VocabCard[],
  count: number,
  allowedTypes: Set<QuestionType> = new Set(['qcm', 'truefalse', 'written'])
): Question[] {
  if (allCards.length === 0) return [];
  const pool = shuffle(allCards);
  const questions: Question[] = [];
  for (let i = 0; i < count; i++) {
    const card = pool[i % pool.length];
    questions.push(generateConfigurableQuestion(allCards, card, allowedTypes));
  }
  return questions;
}

export function isAnswerCorrect(question: Question, answer: string | boolean): boolean {
  if (question.type === 'qcm') {
    const correctAnswer = question.card[answerSide(question.direction)];
    return question.choices[Number(answer)] === correctAnswer;
  }
  if (question.type === 'truefalse') {
    return Boolean(answer) === question.isCorrect;
  }
  const correctAnswer = question.card[answerSide(question.direction)];
  const normalized = (s: string) => s.trim().toLowerCase();
  return normalized(String(answer)) === normalized(correctAnswer);
}
