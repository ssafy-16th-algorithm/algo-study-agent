import { NextResponse } from 'next/server';

type ReviewRequest = { problem?:{title?:string;externalUrl?:string|null}; member?:string; language?:string; code?:string };
type ReviewIssue = { kind:'삭제 후보'|'개선'|'오류 위험'|'알고리즘'; title:string; evidence:string; impact:string; suggestion:string; line:number };
type Review = {
  verdict:string;
  complexity:string;
  issues:ReviewIssue[];
  betterApproach:{title:string;steps:string[];complexity:string};
  testCase:string;
  highlightLines:number[];
};

const requestWindows = new Map<string,{count:number;resetAt:number}>();

function outputText(payload:Record<string,unknown>) {
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const message = choices[0] && typeof choices[0] === 'object'
    ? (choices[0] as {message?:{content?:unknown}}).message
    : undefined;
  return typeof message?.content === 'string' ? message.content : '';
}

function parseReviewText(text:string) {
  const normalized = text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  try { return JSON.parse(normalized) as unknown; }
  catch {
    const start=normalized.indexOf('{');
    const end=normalized.lastIndexOf('}');
    if(start<0 || end<=start) throw new Error('JSON object not found');
    return JSON.parse(normalized.slice(start,end+1)) as unknown;
  }
}

async function sha256(value:string) {
  const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((part)=>part.toString(16).padStart(2,'0')).join('');
}

function normalizeReview(value:unknown):Review|null {
  if (!value || typeof value !== 'object') return null;
  const container=value as Record<string,unknown>;
  const raw=(container.review && typeof container.review === 'object' ? container.review : container) as Record<string,unknown>;
  const allowedKinds=new Set<ReviewIssue['kind']>(['삭제 후보','개선','오류 위험','알고리즘']);
  const issues=(Array.isArray(raw.issues)?raw.issues:[]).flatMap((item):ReviewIssue[]=>{
    if (!item || typeof item !== 'object') return [];
    const issue=item as Record<string,unknown>;
    const title=typeof issue.title==='string'&&issue.title.trim()?issue.title.trim():'';
    const suggestion=typeof issue.suggestion==='string'&&issue.suggestion.trim()?issue.suggestion.trim():'';
    if (!title && !suggestion) return [];
    const rawKind=typeof issue.kind==='string'?issue.kind:'개선';
    const line=Math.max(1,Math.round(Number(issue.line)||1));
    return [{
      kind:allowedKinds.has(rawKind as ReviewIssue['kind'])?rawKind as ReviewIssue['kind']:'개선',
      title:title||'구현 개선',
      evidence:typeof issue.evidence==='string'&&issue.evidence.trim()?issue.evidence.trim():`${line}번 줄을 확인하세요.`,
      impact:typeof issue.impact==='string'&&issue.impact.trim()?issue.impact.trim():'가독성 또는 안정성에 영향을 줄 수 있습니다.',
      suggestion:suggestion||'해당 로직을 단순화하세요.',
      line,
    }];
  }).slice(0,3);
  if (!issues.length) return null;
  const rawApproach=raw.betterApproach&&typeof raw.betterApproach==='object' ? raw.betterApproach as Record<string,unknown> : {};
  const rawSteps=Array.isArray(rawApproach.steps)?rawApproach.steps.filter((step):step is string=>typeof step==='string'&&Boolean(step.trim())).map((step)=>step.trim()):[];
  const rawHighlights=Array.isArray(raw.highlightLines)?raw.highlightLines.map(Number).filter((line)=>Number.isFinite(line)&&line>0).map(Math.round):[];
  return {
    verdict:typeof raw.verdict==='string'&&raw.verdict.trim()?raw.verdict.trim():`${issues[0].title}: ${issues[0].suggestion}`,
    complexity:typeof raw.complexity==='string'&&raw.complexity.trim()?raw.complexity.trim():'코드 흐름 기준으로 복잡도를 다시 확인하세요.',
    issues,
    betterApproach:{
      title:typeof rawApproach.title==='string'&&rawApproach.title.trim()?rawApproach.title.trim():'핵심 개선 순서',
      steps:(rawSteps.length?rawSteps:issues.map((issue)=>issue.suggestion)).slice(0,3),
      complexity:typeof rawApproach.complexity==='string'&&rawApproach.complexity.trim()?rawApproach.complexity.trim():'불필요한 연산과 상태를 줄이는 방향입니다.',
    },
    testCase:typeof raw.testCase==='string'&&raw.testCase.trim()?raw.testCase.trim():'최소 입력과 경계값을 직접 검증하세요.',
    highlightLines:Array.from(new Set(rawHighlights.length?rawHighlights:issues.map((issue)=>issue.line))).slice(0,5),
  };
}

export async function POST(request:Request) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return NextResponse.json({error:'AI 리뷰 API 키가 연결되지 않았습니다.',code:'AI_NOT_CONFIGURED'},{status:503});

  const clientId = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
  const now = Date.now();
  const window = requestWindows.get(clientId);
  if (!window || window.resetAt < now) requestWindows.set(clientId,{count:1,resetAt:now+60*60*1000});
  else if (++window.count > 20) return NextResponse.json({error:'잠시 후 다시 시도해 주세요.'},{status:429});

  let input:ReviewRequest;
  try { input = await request.json() as ReviewRequest; }
  catch { return NextResponse.json({error:'잘못된 요청입니다.'},{status:400}); }

  const code = input.code?.trim() ?? '';
  if (!input.problem?.title || !code || code.length > 50000) {
    return NextResponse.json({error:'리뷰할 코드가 없거나 너무 깁니다.'},{status:400});
  }

  const key = await sha256(JSON.stringify({version:9,problem:input.problem,language:input.language,code}));
  const cacheUrl = new URL(`https://algorithm-review-cache.internal/${key}`);
  const workerCache = typeof globalThis.caches === 'undefined'
    ? undefined
    : (globalThis.caches as CacheStorage & {default?:Cache}).default;
  const cached = workerCache ? await workerCache.match(cacheUrl) : undefined;
  if (cached) return new NextResponse(cached.body,{
    status:cached.status,
    statusText:cached.statusText,
    headers:new Headers(cached.headers),
  });

  const apiBaseUrl = (process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/,'');
  const reviewRequest = {
      model:process.env.LLM_REVIEW_MODEL || 'groq/compound',
      max_completion_tokens:1000,
      tool_choice:'none',
      citation_options:'disabled',
      messages:[{
        role:'system',
        content:[
          '코딩테스트 코드 리뷰어다. 한국어로 짧고 구체적으로 답한다.',
          '칭찬·서론·반복은 쓰지 않는다. 실제 코드 근거가 있는 핵심 문제 2~3개만 고른다.',
          '우선순위는 오류 위험, 복잡도, 불필요한 코드, 구현 단순화 순이다.',
          '각 문장은 80자 이내로 쓰고 전체 응답은 간결하게 유지한다.',
        ].join(' '),
      },{
        role:'user',
        content:[
        `문제: ${input.problem.title}`,
        `문제 링크: ${input.problem.externalUrl ?? '없음'}`,
        `작성자: ${input.member ?? '스터디원'} / 언어: ${input.language ?? 'unknown'}`,
        '코드:',
        code,
          'JSON만 출력:',
          '{"verdict":"최우선 수정 1문장","complexity":"현재 시간/공간 복잡도","issues":[{"kind":"삭제 후보|개선|오류 위험|알고리즘","title":"짧은 제목","evidence":"코드 근거","impact":"영향","suggestion":"수정법","line":1}],"betterApproach":{"title":"접근 이름","steps":["단계1","단계2"],"complexity":"개선 복잡도"},"testCase":"반례 1개","highlightLines":[1]}',
          '위 JSON의 문구는 구조 설명용이다. 모든 값은 제공된 코드를 실제 분석해 작성하고 예시 문구를 그대로 복사하지 않는다.',
          'issues는 2~3개, steps는 2~3개로 제한한다.',
        ].join('\n'),
      }],
      response_format:{type:'json_object'},
    };
  const callGroq = (body:Record<string,unknown>) => fetch(`${apiBaseUrl}/chat/completions`,{
    method:'POST',
    headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
    body:JSON.stringify(body),
  });
  let response:Response;
  try {
    response = await callGroq(reviewRequest);
    if (response.status === 413 && reviewRequest.model === 'groq/compound') {
      console.warn('Groq Compound request too large; retrying with direct model');
      const fallbackRequest={...reviewRequest,model:'openai/gpt-oss-20b',max_completion_tokens:1200,reasoning_effort:'low'};
      response = await callGroq(fallbackRequest);
      if (response.status === 400) {
        console.warn('Groq JSON mode rejected; retrying with prompt-only JSON');
        response = await callGroq({...fallbackRequest,response_format:undefined});
      }
    }
  } catch (error) {
    console.error('AI review request failed',error);
    return NextResponse.json({error:'코드 리뷰 서버에 연결하지 못했습니다.'},{status:502});
  }

  if (!response.ok) {
    const detail = await response.text();
    console.error('AI review failed',response.status,detail.slice(0,300));
    if (response.status === 429) return NextResponse.json({error:'AI 사용량 제한입니다. 잠시 후 다시 시도해 주세요.'},{status:429});
    if (response.status === 413) return NextResponse.json({error:'리뷰 요청이 너무 큽니다. 더 짧은 코드로 다시 시도해 주세요.'},{status:413});
    return NextResponse.json({error:'코드 리뷰 생성에 실패했습니다.'},{status:502});
  }

  const payload = await response.json() as Record<string,unknown>;
  let parsed:unknown;
  try { parsed = parseReviewText(outputText(payload)); }
  catch { return NextResponse.json({error:'AI 응답을 읽지 못했습니다.'},{status:502}); }
  const review=normalizeReview(parsed);
  if (!review) return NextResponse.json({error:'AI 리뷰 내용을 생성하지 못했습니다. 다시 시도해 주세요.'},{status:502});
  if (review.verdict === '최우선 수정 1문장') review.verdict = `${review.issues[0].title}: ${review.issues[0].suggestion}`;
  if (review.betterApproach.title === '접근 이름') review.betterApproach.title = '핵심 개선 순서';
  if (review.betterApproach.steps.some((step)=>/^단계\d+$/.test(step))) {
    review.betterApproach.steps = review.issues.map((issue)=>issue.suggestion).slice(0,3);
  }

  const result = NextResponse.json({review});
  result.headers.set('Cache-Control','public, max-age=31536000, immutable');
  if (workerCache) await workerCache.put(cacheUrl,result.clone());
  return result;
}

