import { NextResponse } from 'next/server';

type ReviewRequest = {
  problem?: { title?:string; platform?:string; tag?:string };
  member?: string;
  status?: string;
  code?: string;
};

type Review = {
  label:string;
  title:string;
  body:string;
  question:string;
  highlightLine:number;
};

const requestWindows = new Map<string,{ count:number; resetAt:number }>();

function getOutputText(payload:Record<string,unknown>) {
  if (typeof payload.output_text === 'string') return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const content = Array.isArray((item as {content?:unknown[]}).content) ? (item as {content:unknown[]}).content : [];
    for (const block of content) {
      if (block && typeof block === 'object' && (block as {type?:string}).type === 'output_text' && typeof (block as {text?:unknown}).text === 'string') {
        return (block as {text:string}).text;
      }
    }
  }
  return '';
}

async function sha256(value:string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest)).map((part)=>part.toString(16).padStart(2,'0')).join('');
}

function isReview(value:unknown): value is Review {
  if (!value || typeof value !== 'object') return false;
  const review = value as Partial<Review>;
  return typeof review.label === 'string'
    && typeof review.title === 'string'
    && typeof review.body === 'string'
    && typeof review.question === 'string'
    && Number.isInteger(review.highlightLine)
    && (review.highlightLine ?? 0) > 0;
}

export async function POST(request:Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error:'AI review is not configured' },{ status:503 });
  }

  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
  const now = Date.now();
  const window = requestWindows.get(forwarded);
  if (!window || window.resetAt < now) requestWindows.set(forwarded,{count:1,resetAt:now+60*60*1000});
  else {
    window.count += 1;
    if (window.count > 20) return NextResponse.json({error:'Too many review requests'},{status:429});
  }

  let input:ReviewRequest;
  try { input = await request.json() as ReviewRequest; }
  catch { return NextResponse.json({error:'Invalid JSON'},{status:400}); }

  const code = input.code?.trim() ?? '';
  if (!code || code.length > 40000 || !input.problem?.title) {
    return NextResponse.json({error:'Invalid review input'},{status:400});
  }

  const cacheKey = await sha256(JSON.stringify({
    version:2,
    problem:input.problem,
    member:input.member,
    status:input.status,
    code,
  }));
  const cacheUrl = new URL(`https://ai-review-cache.internal/${cacheKey}`);
  const workerCache = (globalThis.caches as CacheStorage & { default?:Cache }).default;
  const cached = workerCache ? await workerCache.match(cacheUrl) : undefined;
  if (cached) return cached;

  const response = await fetch('https://api.openai.com/v1/responses',{
    method:'POST',
    headers:{
      'Authorization':`Bearer ${apiKey}`,
      'Content-Type':'application/json',
    },
    body:JSON.stringify({
      model:process.env.OPENAI_REVIEW_MODEL || 'gpt-5',
      store:false,
      max_output_tokens:700,
      instructions:[
        '당신은 기업 코딩테스트와 삼성 SW 역량테스트에 정통한 시니어 알고리즘 멘토다.',
        '추상적인 칭찬 대신 코드의 객관적인 근거를 인용해 누구나 이해할 수 있는 한국어 리뷰를 작성한다.',
        '정답 가능성, 놓친 조건과 반례, 시간·공간 복잡도, 가장 쉬운 개선 순서만 검토한다.',
        '코드에 근거가 없으면 단정하지 말고 확인이 필요한 지점을 명시한다.',
        '제목과 본문은 짧고 구체적으로 쓴다. highlightLine은 가장 중요한 근거가 있는 실제 코드 줄 번호다.',
      ].join(' '),
      input:[
        `문제: ${input.problem.platform ?? ''} ${input.problem.title} (${input.problem.tag ?? ''})`,
        `작성자: ${input.member ?? '스터디원'} / 상태: ${input.status ?? 'unknown'}`,
        '코드:',
        code,
      ].join('\n'),
      text:{
        verbosity:'low',
        format:{
          type:'json_schema',
          name:'algorithm_code_review',
          strict:true,
          schema:{
            type:'object',
            additionalProperties:false,
            properties:{
              label:{type:'string',description:'정확성, 반례, 복잡도, 구조, 효율 중 가장 가까운 짧은 분류'},
              title:{type:'string',description:'핵심 결론 한 문장'},
              body:{type:'string',description:'코드 근거와 가장 쉬운 개선법을 2~3문장으로 설명'},
              question:{type:'string',description:'작성자가 스스로 검증할 수 있는 구체적인 후속 질문 한 문장'},
              highlightLine:{type:'integer',minimum:1},
            },
            required:['label','title','body','question','highlightLine'],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('OpenAI review failed',response.status,detail.slice(0,300));
    return NextResponse.json({error:'Review generation failed'},{status:502});
  }

  const payload = await response.json() as Record<string,unknown>;
  const outputText = getOutputText(payload);
  let review:unknown;
  try { review = JSON.parse(outputText); }
  catch { return NextResponse.json({error:'Invalid model output'},{status:502}); }
  if (!isReview(review)) return NextResponse.json({error:'Incomplete model output'},{status:502});

  const result = NextResponse.json({review});
  result.headers.set('Cache-Control','public, max-age=31536000, immutable');
  if (workerCache) await workerCache.put(cacheUrl,result.clone());
  return result;
}

