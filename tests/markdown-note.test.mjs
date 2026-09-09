import './register-typescript.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const { default: MarkdownNote } = await import('../app/components/markdown-note.tsx');
const render = (content) => renderToStaticMarkup(createElement(MarkdownNote, {content,empty:'내용 없음'}));

test('keeps the supplied multiline strategy inside one ordered list with five items', () => {
  const html = render(`1. 시도한 풀이는 전체 나무의 높이차를 기준으로, 건너뛰거나 특수한 케이스를 고려하지 못함.
   예를들어, 높이차가 [1,1]일때, 잘못된 풀이 기준으로는 2일이 걸리지만, 문제 고려사항을
   반영한다면 총 3일이 소요되게된다.(이틀차는 물을 주지못함. 높이 2가 자라므로)
2. 이를 해결하려면, 각 높이차 배열에서 2와 1의 개수가 얼마나 필요한지 구해야한다.
3. 그리고 oneCount와 twoCount를 최대한 비슷하게 만들어야 최소날짜가 될것이다.
4. 차이를 1이하로 만들었다면, oneCount가 twoCount보다 많다면, 첫번째에서 물 주고
   끝나므로 2를 곱하고 1을 뺀다
5. 아니라면, 그냥 2를 곱해서 답을 구한다.`);
  assert.equal((html.match(/<ol(?:\s|>)/g) ?? []).length,1);
  assert.equal((html.match(/<li>/g) ?? []).length,5);
  assert.match(html, /<li>시도한 풀이는[\s\S]*높이 2가 자라므로\)<\/li>/);
  assert.match(html, /<li>차이를 1이하로[\s\S]*끝나므로 2를 곱하고 1을 뺀다<\/li>/);
});

test('preserves the first number of a list starting after a paragraph', () => {
  const html = render('설명입니다.\n\n4. 네 번째\n5. 다섯 번째');
  assert.match(html, /<p>설명입니다\.<\/p><ol start="4"><li>네 번째<\/li><li>다섯 번째<\/li><\/ol>/);
});

test('keeps unindented continuation text in its list item', () => {
  assert.equal(render('1. 첫 항목\n이어서 설명\n2. 다음 항목'), '<div class="markdownNote"><ol start="1"><li>첫 항목\n이어서 설명</li><li>다음 항목</li></ol></div>');
});

test('retains bullet lists, inline formatting and a following paragraph', () => {
  const html = render('- **중요**한 항목\n  `oneCount` 사용\n- 다음 항목\n\n별도 문단');
  assert.match(html, /<ul><li><strong>중요<\/strong>한 항목\n<code>oneCount<\/code> 사용<\/li><li>다음 항목<\/li><\/ul><p>별도 문단<\/p>/);
});
