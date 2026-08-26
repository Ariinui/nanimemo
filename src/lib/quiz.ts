import type {
  VocabCard,
  Question,
  QcmQuestion,
  WrittenQuestion,
  TrueFalseQuestion,
  QuestionType,
} from '@/types/vocab';

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickDistinctDefinitions(
  cards: VocabCard[],
  excludeDefinition: string,
  count: number
): string[] {
  const uniqueDefs = Array.from(
    new Set(
      cards
        .map((c) => c.definition)
        .filter((def) => def !== excludeDefinition)
    )
  );
  return shuffle(uniqueDefs).slice(0, count);
}

/**
 * Un set peut avoir plusieurs cartes partageant la même définition
 * (ex: 7 prépositions de "LIEU"). Un QCM n'est généré que s'il existe
 * assez de définitions distinctes pour éviter plusieurs bonnes réponses.
 */
export function tryGenerateQcm(
  allCards: VocabCard[],
  targetCard: VocabCard,
  numChoices = 4
): QcmQuestion | null {
  const distractors = pickDistinctDefinitions(allCards, targetCard.definition, numChoices - 1);
  if (distractors.length < numChoices - 1) return null;

  const choices = shuffle([targetCard.definition, ...distractors]);
  const correctIndex = choices.indexOf(targetCard.definition);

  return { type: 'qcm', card: targetCard, choices, correctIndex };
}

export function generateTrueFalse(
  allCards: VocabCard[],
  targetCard: VocabCard
): TrueFalseQuestion {
  const showCorrect = Math.random() < 0.5;
  if (showCorrect) {
    return { type: 'truefalse', card: targetCard, shownDefinition: targetCard.definition, isCorrect: true };
  }

  const alternatives = allCards.filter((c) => c.definition !== targetCard.definition);
  if (alternatives.length === 0) {
    return { type: 'truefalse', card: targetCard, shownDefinition: targetCard.definition, isCorrect: true };
  }
  const wrong = alternatives[Math.floor(Math.random() * alternatives.length)];
  return { type: 'truefalse', card: targetCard, shownDefinition: wrong.definition, isCorrect: false };
}

export function generateWritten(targetCard: VocabCard): WrittenQuestion {
  return { type: 'written', card: targetCard };
}

/**
 * Choisit le meilleur type de question pour cette carte dans ce set.
 * Priorité : QCM si possible, sinon vrai/faux, jamais de QCM ambigu.
 *
 * `preferWritten` reproduit le comportement Quizlet en mode Apprendre :
 * plus une carte est maîtrisée (box élevée), plus on demande à l'écrire
 * plutôt qu'à la reconnaître, pour tester le vrai rappel.
 */
export function generateQuestion(
  allCards: VocabCard[],
  targetCard: VocabCard,
  opts?: { preferWritten?: boolean }
): Question {
  if (opts?.preferWritten) return generateWritten(targetCard);

  const qcm = tryGenerateQcm(allCards, targetCard);
  if (qcm) return qcm;

  const uniqueDefCount = new Set(allCards.map((c) => c.definition)).size;
  if (uniqueDefCount <= 1) return generateWritten(targetCard);

  return generateTrueFalse(allCards, targetCard);
}

/**
 * Génère une question en respectant les types autorisés (config du Test,
 * façon "Configurez votre test" de Quizlet). Retombe toujours sur un type
 * autorisé même si le premier choix n'est pas disponible pour cette carte.
 */
export function generateConfigurableQuestion(
  allCards: VocabCard[],
  targetCard: VocabCard,
  allowedTypes: Set<QuestionType>
): Question {
  if (allowedTypes.has('qcm')) {
    const qcm = tryGenerateQcm(allCards, targetCard);
    if (qcm) return qcm;
  }
  if (allowedTypes.has('truefalse')) {
    return generateTrueFalse(allCards, targetCard);
  }
  return generateWritten(targetCard);
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
    return question.choices[Number(answer)] === question.card.definition;
  }
  if (question.type === 'truefalse') {
    return Boolean(answer) === question.isCorrect;
  }
  const normalized = (s: string) => s.trim().toLowerCase();
  return normalized(String(answer)) === normalized(question.card.definition);
}
