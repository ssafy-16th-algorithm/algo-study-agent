import './register-typescript.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const { GET } = await import('../app/api/study/route.ts');

const problemId = '11111111111111111111111111111111';
const problem = {
  id: problemId,
  url: `https://www.notion.so/${problemId}`,
  properties: {
    '문제 이름': { type: 'title', title: [{ plain_text: '나무높이' }] },
    '주차': { multi_select: [{ name: 'WEEK8' }] },
    '출제날짜': { date: { start: '2026-09-07' } },
  },
};
const heading = (text) => ({ type: 'heading_3', heading_3: { rich_text: [{ plain_text: text }] } });
const code = (text) => ({ type: 'code', code: { rich_text: [{ plain_text: text }], language: 'java' } });
const solutionPage = (id, name) => ({
  id, url: `https://www.notion.so/${id}`,
  properties: { '이름': { type: 'title', title: [{ plain_text: name }] } },
});

function mockNotion(t, { missing = false, empty = false, week = 8 } = {}) {
  const weekProblem = { ...problem, properties: { ...problem.properties, '주차': { multi_select: [{ name: `WEEK${week}` }] } } };
  const originalToken = process.env.NOTION_TOKEN;
  process.env.NOTION_TOKEN = 'test-token';
  t.after(() => {
    if (originalToken === undefined) delete process.env.NOTION_TOKEN;
    else process.env.NOTION_TOKEN = originalToken;
  });
  t.mock.method(globalThis, 'fetch', async (input) => {
    const url = new URL(String(input));
    if (url.hostname === 'api.github.com') {
      return Response.json({ tree: [{ type: 'blob', path: '나무높이.java' }] });
    }
    if (url.hostname === 'raw.githubusercontent.com') return new Response('class ExistingSolution {}');
    assert.equal(url.hostname, 'api.notion.com');
    const path = url.pathname.replace('/v1', '');
    if (path === `/pages/${problemId}`) return Response.json(weekProblem);
    if (path === `/blocks/${problemId}/children`) {
      return Response.json({ results: [{ id: 'solutions-db', type: 'child_database' }] });
    }
    if (path === '/databases/solutions-db') return Response.json({ data_sources: [{ id: 'solutions-source' }] });
    if (path === '/data_sources/solutions-source/query') {
      return Response.json({ results: missing ? [] : [solutionPage('juyeon-page', '정주연'), solutionPage('jiwoo-page', '박지우')] });
    }
    if (path.startsWith('/data_sources/')) return Response.json({ results: [weekProblem] });
    if (path === '/blocks/juyeon-page/children' || path === '/blocks/jiwoo-page/children') {
      const author = path.includes('juyeon') ? 'Juyeon' : 'Jiwoo';
      return Response.json({ results: empty ? [] : [
        heading('풀이'), code(`class ${author}Solution {}`),
        heading('시도한 풀이'), code(`class ${author}Attempt {}`),
        heading('전략'), code(`${author} 전략`),
        heading('후기'), code(`${author} 후기`),
      ] });
    }
    throw new Error(`Unexpected request: ${path}`);
  });
}

async function readDetail() {
  const response = await GET(new Request(`http://localhost/api/study?problemId=${problemId}&refresh=1`));
  assert.equal(response.status, 200);
  return response.json();
}

test('includes both new members with their own Notion code, attempted code and notes', async (t) => {
  mockNotion(t);
  const detail = await readDetail();
  assert.equal(detail.solutions.length, 6);
  for (const [name, author] of [['정주연', 'Juyeon'], ['박지우', 'Jiwoo']]) {
    const solution = detail.solutions.find((item) => item.member.name === name);
    assert.ok(solution, `${name} must be selectable`);
    assert.equal(solution.code, `class ${author}Solution {}`);
    assert.equal(solution.attemptedCode, `class ${author}Attempt {}`);
    assert.equal(solution.strategy, `${author} 전략`);
    assert.equal(solution.retrospective, `${author} 후기`);
    assert.equal(solution.language, 'java');
    assert.equal(solution.source, 'notion');
    assert.equal(solution.sourceUrl, `https://www.notion.so/${author.toLowerCase()}-page`);
  }
  assert.equal(detail.solutions.find((item) => item.member.name === '이종혁').source, 'github');
});

for (const scenario of ['missing', 'empty']) {
  test(`keeps new members without ${scenario === 'missing' ? 'a Notion page' : 'code'} visible with a valid writing link`, async (t) => {
    mockNotion(t, { [scenario]: true });
    const detail = await readDetail();
    for (const [name, pageId] of [['정주연', 'juyeon-page'], ['박지우', 'jiwoo-page']]) {
      const solution = detail.solutions.find((item) => item.member.name === name);
      assert.ok(solution);
      assert.equal(solution.code, null);
      assert.equal(solution.source, null);
      assert.equal(solution.sourceUrl, scenario === 'missing' ? problem.url : `https://www.notion.so/${pageId}`);
    }
  });
}

test('counts both new members in weekly progress', async (t) => {
  mockNotion(t);
  const response = await GET(new Request('http://localhost/api/study?progressWeek=8&refresh=1'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.progress.length, 6);
  for (const name of ['정주연', '박지우']) {
    const progress = body.progress.find((item) => item.member.name === name);
    assert.ok(progress);
    assert.equal(progress.completed, 1);
    assert.equal(progress.total, 1);
    assert.equal(progress.percent, 100);
    assert.deepEqual(progress.urgentProblems, []);
  }
});

test('excludes members who have not joined from week 7 progress and reminders', async (t) => {
  mockNotion(t, { week: 7, missing: true });
  const response = await GET(new Request('http://localhost/api/study?progressWeek=7&refresh=1'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.progress.map((item) => item.member.name), ['이종혁', '강예정', '민택기', '주민경']);
  assert.ok(body.progress.every((item) => item.total === 1));
});

test('continues to include new members after their joining week', async (t) => {
  mockNotion(t, { week: 9 });
  const response = await GET(new Request('http://localhost/api/study?progressWeek=9&refresh=1'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.progress.map((item) => item.member.name), ['이종혁', '강예정', '민택기', '주민경', '정주연', '박지우']);
  assert.ok(body.progress.every((item) => item.total === 1));
});
