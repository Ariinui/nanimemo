import { describe, it, expect } from 'vitest';
import { generateQuestion, generateTestSession } from './quiz';
import type { VocabCard } from '@/types/vocab';

function makeCard(id: string, term: string, definition: string): VocabCard {
  return { id, set_id: 'set-1', term, definition, image_url: null, position: 0 };
}

// Reproduit le set réel "prépositions" : 7 cartes partagent "LIEU (où ?)".
const PREPOSITIONS: VocabCard[] = [
  makeCard('1', 'selon', 'MANIÈRE (comment ?)'),
  makeCard('2', 'devant', 'LIEU (où ?)'),
  makeCard('3', 'pendant', 'TEMPS (quand ?)'),
  makeCard('4', 'contre', 'OPPOSITION / EXCEPTION'),
  makeCard('5', 'dans', 'LIEU (où ?)'),
  makeCard('6', 'avec', 'MANIÈRE (comment ?)'),
  makeCard('7', 'avant', 'TEMPS (quand ?)'),
  makeCard('8', 'sous', 'LIEU (où ?)'),
  makeCard('9', 'malgré', 'OPPOSITION / EXCEPTION'),
  makeCard('10', 'sur', 'LIEU (où ?)'),
  makeCard('11', 'entre', 'LIEU (où ?)'),
  makeCard('12', 'derrière', 'LIEU (où ?)'),
  makeCard('13', 'chez', 'LIEU (où ?)'),
];

function correctAnswerFor(question: { direction: 'term-to-def' | 'def-to-term'; card: VocabCard }): string {
  return question.direction === 'term-to-def' ? question.card.definition : question.card.term;
}

describe('quiz generation avoids ambiguous QCM', () => {
  it('never produces a QCM with two identical choices, in either direction', () => {
    for (let i = 0; i < 200; i++) {
      for (const card of PREPOSITIONS) {
        const question = generateQuestion(PREPOSITIONS, card);
        if (question.type === 'qcm') {
          const unique = new Set(question.choices);
          expect(unique.size).toBe(question.choices.length);
        }
      }
    }
  });

  it('generates a full test session with only unambiguous QCMs', () => {
    const session = generateTestSession(PREPOSITIONS, 30);
    for (const question of session) {
      if (question.type === 'qcm') {
        const unique = new Set(question.choices);
        expect(unique.size).toBe(question.choices.length);
        expect(question.choices[question.correctIndex]).toBe(correctAnswerFor(question));
      }
    }
  });

  it('falls back to written when the answer side has only one distinct value (term→def)', () => {
    const sameDef = [makeCard('a', 'un', 'X'), makeCard('b', 'deux', 'X'), makeCard('c', 'trois', 'X')];
    const question = generateQuestion(sameDef, sameDef[0], { direction: 'term-to-def' });
    expect(question.type).toBe('written');
  });

  it('falls back to written when the answer side has only one distinct value (def→term)', () => {
    const sameTerm = [makeCard('a', 'X', 'un'), makeCard('b', 'X', 'deux'), makeCard('c', 'X', 'trois')];
    const question = generateQuestion(sameTerm, sameTerm[0], { direction: 'def-to-term' });
    expect(question.type).toBe('written');
  });

  it('forces written questions once a card is well mastered (Quizlet-like progression)', () => {
    const question = generateQuestion(PREPOSITIONS, PREPOSITIONS[0], { preferWritten: true });
    expect(question.type).toBe('written');
  });

  it('respects an explicit direction instead of picking randomly', () => {
    const q1 = generateQuestion(PREPOSITIONS, PREPOSITIONS[0], { direction: 'term-to-def' });
    const q2 = generateQuestion(PREPOSITIONS, PREPOSITIONS[0], { direction: 'def-to-term' });
    expect(q1.direction).toBe('term-to-def');
    expect(q2.direction).toBe('def-to-term');
  });
});
