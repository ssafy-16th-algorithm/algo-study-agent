import './register-typescript.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { review } from './fixtures/review.mjs';
const { normalizeReviewScore, nextScoreGoal } = await import('../app/lib/review-score.ts');

for (const [points, total, grade, goal] of [
  [[0,0,0,0], 0, 'D', { label:'C등급', remaining:60 }],
  [[23,20,10,6], 59, 'D', { label:'C등급', remaining:1 }],
  [[24,20,10,6], 60, 'C', { label:'B등급', remaining:10 }],
  [[28,23,12,6], 69, 'C', { label:'B등급', remaining:1 }],
  [[28,23,12,7], 70, 'B', { label:'A등급', remaining:10 }],
  [[32,25,15,7], 79, 'B', { label:'A등급', remaining:1 }],
  [[32,25,15,8], 80, 'A', { label:'S등급', remaining:10 }],
  [[36,27,18,8], 89, 'A', { label:'S등급', remaining:1 }],
  [[36,27,18,9], 90, 'S', { label:'100점', remaining:10 }],
  [[40,30,20,10], 100, 'S', null],
]) {
  test(`${total} points produces grade ${grade} and the correct next goal`, () => {
    const input = structuredClone(review.score);
    ['correctness','efficiency','stability','readability'].forEach((id, index) => { input.criteria[id].points = points[index]; });
    const actual = normalizeReviewScore(input);
    assert.equal(actual.total, total);
    assert.equal(actual.grade, grade);
    assert.deepEqual(nextScoreGoal(actual.total), goal);
  });
}

for (const [id, points] of [['efficiency',31], ['stability',21], ['readability',11], ['correctness',NaN], ['correctness',Infinity]]) {
  test(`rejects ${id} score ${points} rather than silently clamping it`, () => {
    const input = structuredClone(review.score);
    input.criteria[id].points = points;
    assert.equal(normalizeReviewScore(input), null);
  });
}
test('rejects missing categories', () => {
  const input = structuredClone(review.score);
  delete input.criteria.stability;
  assert.equal(normalizeReviewScore(input), null);
});
