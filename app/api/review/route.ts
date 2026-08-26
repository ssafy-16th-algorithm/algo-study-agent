import { NextResponse } from 'next/server';
import type { Review, ReviewIssue, ReviewRequest } from '../../lib/review';

const requestWindows = new Map<string,{count:number;resetAt:number}>();

function outputText(payload:Record<string,unknown>) {
  const ollamaMessage=payload.message && typeof payload.message==='object'
    ? payload.message as {content?:unknown}
    : undefined;
  if (typeof ollamaMessage?.content === 'string') return ollamaMessage.content;
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
  const allowedSeverities=new Set<ReviewIssue['severity']>(['반드시 수정','개선 권장','선택 사항']);
  const stringList=(value:unknown,limit:number)=>Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'&&Boolean(item.trim())).map((item)=>item.trim()).slice(0,limit):[];
  const issues=(Array.isArray(raw.issues)?raw.issues:[]).flatMap((item):ReviewIssue[]=>{
    if (!item || typeof item !== 'object') return [];
    const issue=item as Record<string,unknown>;
    const title=typeof issue.title==='string'&&issue.title.trim()?issue.title.trim():'';
    const suggestion=typeof issue.suggestion==='string'&&issue.suggestion.trim()?issue.suggestion.trim():'';
    if (!title && !suggestion) return [];
    const rawKind=typeof issue.kind==='string'?issue.kind:'개선';
    const rawSeverity=typeof issue.severity==='string'?issue.severity:'개선 권장';
    const line=Math.max(1,Math.round(Number(issue.line)||1));
    return [{
      kind:allowedKinds.has(rawKind as ReviewIssue['kind'])?rawKind as ReviewIssue['kind']:'개선',
      severity:allowedSeverities.has(rawSeverity as ReviewIssue['severity'])?rawSeverity as ReviewIssue['severity']:'개선 권장',
      title:title||'구현 개선',
      evidence:typeof issue.evidence==='string'&&issue.evidence.trim()?issue.evidence.trim():`${line}번 줄을 확인하세요.`,
      codeQuote:typeof issue.codeQuote==='string'&&issue.codeQuote.trim()?issue.codeQuote.trim().slice(0,300):undefined,
      impact:typeof issue.impact==='string'&&issue.impact.trim()?issue.impact.trim():'가독성 또는 안정성에 영향을 줄 수 있습니다.',
      suggestion:suggestion||'해당 로직을 단순화하세요.',
      codeExample:typeof issue.codeExample==='string'&&issue.codeExample.trim()?issue.codeExample.trim().slice(0,1500):undefined,
      line,
    }];
  }).slice(0,2);
  const rawApproach=raw.betterApproach&&typeof raw.betterApproach==='object' ? raw.betterApproach as Record<string,unknown> : {};
  const rawSteps=Array.isArray(rawApproach.steps)?rawApproach.steps.filter((step):step is string=>typeof step==='string'&&Boolean(step.trim())).map((step)=>step.trim()):[];
  const rawHighlights=Array.isArray(raw.highlightLines)?raw.highlightLines.map(Number).filter((line)=>Number.isFinite(line)&&line>0).map(Math.round):[];
  return {
    verdict:typeof raw.verdict==='string'&&raw.verdict.trim()?raw.verdict.trim():issues[0]?`${issues[0].title}: ${issues[0].suggestion}`:'✅ 정답성과 성능 측면에서 충분히 좋은 풀이입니다.',
    currentApproach:typeof raw.currentApproach==='string'&&raw.currentApproach.trim()?raw.currentApproach.trim():'코드의 실행 흐름을 기준으로 풀이 방식을 확인했습니다.',
    strengths:stringList(raw.strengths,3),
    complexity:typeof raw.complexity==='string'&&raw.complexity.trim()?raw.complexity.trim():'코드 흐름 기준으로 복잡도를 다시 확인하세요.',
    issues,
    betterApproach:{
      title:typeof rawApproach.title==='string'&&rawApproach.title.trim()?rawApproach.title.trim():'핵심 개선 순서',
      steps:(rawSteps.length?rawSteps:issues.length?issues.map((issue)=>issue.suggestion):['현재 접근과 구현을 그대로 유지해도 좋습니다.']).slice(0,3),
      complexity:typeof rawApproach.complexity==='string'&&rawApproach.complexity.trim()?rawApproach.complexity.trim():'불필요한 연산과 상태를 줄이는 방향입니다.',
    },
    testCase:typeof raw.testCase==='string'&&raw.testCase.trim()?raw.testCase.trim():'최소 입력과 경계값을 직접 검증하세요.',
    learningPoints:stringList(raw.learningPoints,3),
    highlightLines:Array.from(new Set(rawHighlights.length?rawHighlights:issues.map((issue)=>issue.line))).slice(0,5),
  };
}

function alignReviewLines(review:Review,code:string) {
  const lines=code.replace(/\r\n/g,'\n').split('\n');
  for (const issue of review.issues) {
    const quote=issue.codeQuote?.replace(/^`+|`+$/g,'').trim()
      || issue.evidence.match(/`([^`\n]+)`/)?.[1]?.trim();
    if (quote) {
      const exact=lines.findIndex((line)=>line.trim()===quote);
      const containing=exact<0 ? lines.findIndex((line)=>line.includes(quote)) : exact;
      if (containing>=0) issue.line=containing+1;
    }
    issue.line=Math.min(lines.length,Math.max(1,issue.line));
  }
  review.highlightLines=Array.from(new Set(review.issues.map((issue)=>issue.line))).slice(0,5);
  return review;
}

export async function POST(request:Request) {
  const ollamaApiKey=process.env.OLLAMA_API_KEY?.trim();
  const groqApiKey=process.env.LLM_API_KEY?.trim();
  const ollamaModel=process.env.OLLAMA_REVIEW_MODEL?.trim();
  const groqModel=process.env.LLM_REVIEW_MODEL?.trim();
  const ollamaConfigured=Boolean(ollamaApiKey && ollamaModel);
  const groqConfigured=Boolean(groqApiKey && groqModel);
  if (!ollamaConfigured && !groqConfigured) return NextResponse.json({error:'AI 리뷰 API 키와 모델 설정이 필요합니다.',code:'AI_NOT_CONFIGURED'},{status:503});

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

  const key = await sha256(JSON.stringify({version:13,problem:input.problem,language:input.language,code}));
  const cacheUrl = new URL(`https://algorithm-review-cache.internal/${key}`);
  const workerCache = typeof globalThis.caches === 'undefined'
    ? undefined
    : (globalThis.caches as CacheStorage & {default?:Cache}).default;
  const cached = !input.refresh && workerCache ? await workerCache.match(cacheUrl) : undefined;
  if (cached) return new NextResponse(cached.body,{
    status:cached.status,
    statusText:cached.statusText,
    headers:new Headers(cached.headers),
  });

  const apiBaseUrl = (process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/,'');
  const groqRequest = {
      model:groqModel!,
      max_completion_tokens:700,
      tool_choice:'none',
      citation_options:'disabled',
      messages:[{
        role:'system',
        content:[
          'Java 코딩테스트 초보자의 친절한 코드 리뷰 선생님이다.',
          '먼저 문제 요구사항, 일반 입력, 예외 케이스, 시간·메모리 제한을 기준으로 정답 가능성을 판단한다. 확실하지 않으면 오류라고 단정하지 않는다.',
          'verdict는 ✅ 정상, ⚠️ 특정 케이스 위험, ❌ 오답 가능성, ⏱️ 시간 초과 위험 중 하나로 시작한다.',
          '사용자의 현재 알고리즘과 의도를 먼저 설명하고, 접근이 적절하면 유지한다. 실제로 의미 있는 잘한 점을 1~2개 찾되 억지로 칭찬하지 않는다.',
          '정답성 > 시간복잡도 > 구현 구조 > 스타일 순서로 검토한다. 취향 차이는 선택 사항으로 구분하고 성능 차이가 없는 표현을 오류처럼 말하지 않는다.',
          '문제는 왜 발생하는지 실행 흐름과 작은 반례로 설명한다. DFS·백트래킹은 return, 재귀 복귀, 상태 복구 순서를 특히 쉽게 설명한다.',
          '개선은 현재 코드 최소 수정, 같은 알고리즘의 단순화, 더 나은 알고리즘 순서로 제안한다. 현재 풀이가 충분하면 변경이 불필요하다고 명시한다.',
          '시간복잡도는 Big-O와 쉬운 뜻을 함께 쓴다. 어려운 용어는 바로 풀어서 설명한다.',
          'codeExample은 이해에 꼭 필요할 때만 전체 리뷰에서 1개, Java 12줄 이하로 작성하고 변경 이유가 보이게 한다.',
          '각 issue의 codeQuote에는 문제를 확인한 실제 코드 한 줄을 원문 그대로 복사한다. line은 코드 첫 줄을 1로 센 정확한 줄 번호다.',
          '핵심 이슈는 최대 2개, 학습 포인트는 최대 3개로 간결하게 작성한다.',
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
          '{"verdict":"✅|⚠️|❌|⏱️로 시작하는 한 줄 판정","currentApproach":"현재 풀이 의도와 알고리즘","strengths":["의미 있는 잘한 점"],"complexity":"시간·공간 복잡도와 입력 제한상 판단","issues":[{"severity":"반드시 수정|개선 권장|선택 사항","kind":"삭제 후보|개선|오류 위험|알고리즘","title":"쉬운 제목","evidence":"코드 근거와 실행 흐름","codeQuote":"실제 코드에서 그대로 복사한 한 줄","impact":"실패 상황 또는 영향","suggestion":"원본을 유지한 수정법","codeExample":"필요할 때만 Java 코드, 아니면 빈 문자열","line":1}],"betterApproach":{"title":"현재 접근 유지 또는 추천 접근","steps":["최소 수정 단계","필요할 때 다음 단계"],"complexity":"현재 방식과 개선 방식 비교"},"testCase":"반례가 있으면 입력·예상 결과·실패 이유, 없으면 검증할 경계값","learningPoints":["다음 문제에 적용할 개념"],"highlightLines":[1]}',
          '위 JSON의 문구는 구조 설명용이다. 모든 값은 제공된 코드를 실제 분석해 작성하고 예시 문구를 그대로 복사하지 않는다.',
          '문제가 없으면 issues는 빈 배열로 둔다. issues는 최대 2개, strengths와 steps는 1~2개로 제한한다.',
        ].join('\n'),
      }],
      response_format:{type:'json_object'},
    };
  const callGroq = (body:Record<string,unknown>) => fetch(`${apiBaseUrl}/chat/completions`,{
    method:'POST',
    headers:{Authorization:`Bearer ${groqApiKey}`,'Content-Type':'application/json'},
    body:JSON.stringify(body),
  });
  const callOllama = () => fetch('https://ollama.com/api/chat',{
    method:'POST',
    headers:{Authorization:`Bearer ${ollamaApiKey}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      model:ollamaModel!,
      messages:groqRequest.messages,
      stream:false,
      think:false,
      options:{temperature:0,num_predict:900},
    }),
  });
  let parsed:unknown;
  let provider:'ollama'|'groq'='ollama';
  let usedModel='';
  let lastStatus=502;

  if (ollamaConfigured) {
    let response:Response|undefined;
    try { response=await callOllama(); }
    catch (error) { console.warn('Ollama request failed; falling back to Groq',error); }
    if (response) {
      lastStatus=response.status;
      if (!response.ok) {
        const detail=await response.text();
        console.warn('Ollama review unavailable; falling back to Groq',response.status,detail.slice(0,160));
      } else {
        const payload=await response.json() as Record<string,unknown>;
        try { parsed=parseReviewText(outputText(payload)); usedModel=ollamaModel!; }
        catch { console.warn('Ollama returned invalid review JSON; falling back to Groq',ollamaModel); }
      }
    }
  }

  if (parsed===undefined && groqConfigured) {
    provider='groq';
    let response:Response;
    try { response=await callGroq(groqRequest); }
    catch { return NextResponse.json({error:'코드 리뷰 서버에 연결하지 못했습니다.'},{status:502}); }
    lastStatus=response.status;
    if (!response.ok) {
      const detail=await response.text();
      console.error('Groq fallback failed',response.status,detail.slice(0,300));
      return NextResponse.json({error:response.status===429?'모든 AI 모델의 사용량 제한에 도달했습니다. 잠시 후 다시 시도해 주세요.':'코드 리뷰 생성에 실패했습니다.'},{status:response.status===429?429:502});
    }
    const payload=await response.json() as Record<string,unknown>;
    try { parsed=parseReviewText(outputText(payload)); usedModel=groqModel!; }
    catch { return NextResponse.json({error:'AI 응답을 읽지 못했습니다.'},{status:502}); }
  }

  if (parsed===undefined) return NextResponse.json({error:lastStatus===429?'AI 사용량 제한에 도달했습니다. 잠시 후 다시 시도해 주세요.':'코드 리뷰 생성에 실패했습니다.'},{status:lastStatus===429?429:502});
  const normalizedReview=normalizeReview(parsed);
  const review=normalizedReview ? alignReviewLines(normalizedReview,code) : null;
  if (!review) return NextResponse.json({error:'AI 리뷰 내용을 생성하지 못했습니다. 다시 시도해 주세요.'},{status:502});
  if (review.verdict === '최우선 수정 1문장' && review.issues[0]) review.verdict = `${review.issues[0].title}: ${review.issues[0].suggestion}`;
  if (review.betterApproach.title === '접근 이름') review.betterApproach.title = '핵심 개선 순서';
  if (review.betterApproach.steps.some((step)=>/^단계\d+$/.test(step))) {
    review.betterApproach.steps = review.issues.map((issue)=>issue.suggestion).slice(0,3);
  }

  const result = NextResponse.json({review});
  result.headers.set('Cache-Control','public, max-age=31536000, immutable');
  result.headers.set('X-Review-Provider',provider);
  result.headers.set('X-Review-Model',usedModel);
  if (workerCache) await workerCache.put(cacheUrl,result.clone());
  return result;
}

