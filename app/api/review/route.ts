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
  if (typeof payload.output_text === 'string') return payload.output_text;
  for (const item of Array.isArray(payload.output) ? payload.output : []) {
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
  const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((part)=>part.toString(16).padStart(2,'0')).join('');
}

function validReview(value:unknown):value is Review {
  if (!value || typeof value !== 'object') return false;
  const review = value as Partial<Review>;
  return typeof review.verdict === 'string' && typeof review.complexity === 'string'
    && Array.isArray(review.issues) && review.issues.length > 0
    && Boolean(review.betterApproach) && typeof review.testCase === 'string'
    && Array.isArray(review.highlightLines);
}

export async function POST(request:Request) {
  const apiKey = process.env.OPENAI_API_KEY;
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

  const key = await sha256(JSON.stringify({version:4,problem:input.problem,language:input.language,code}));
  const cacheUrl = new URL(`https://algorithm-review-cache.internal/${key}`);
  const workerCache = (globalThis.caches as CacheStorage & {default?:Cache}).default;
  const cached = workerCache ? await workerCache.match(cacheUrl) : undefined;
  if (cached) return cached;

  const response = await fetch('https://api.openai.com/v1/responses',{
    method:'POST',
    headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      model:process.env.OPENAI_REVIEW_MODEL || 'gpt-5',
      store:false,
      max_output_tokens:1800,
      instructions:[
        '당신은 기업 코딩테스트와 삼성 SW 역량테스트를 10년 이상 지도한 알고리즘 멘토다.',
        '칭찬과 추상적 총평은 최소화하고, 삭제 가능한 불필요한 코드, 중복 상태·분기·자료구조, 개선 가능한 구현, 더 적절한 알고리즘을 우선 제시한다.',
        '모든 지적은 실제 줄 번호와 코드 근거를 포함한다. 근거가 없으면 문제라고 단정하지 않는다.',
        '각 항목에 현재 영향과 바로 적용할 구체적인 수정 방법을 쓴다.',
        '더 나은 알고리즘이 없다면 억지로 제안하지 말고 같은 알고리즘 안에서 단순화·복잡도·안전성을 개선한다.',
        '초보자도 이해하도록 한국어로 설명하되 시간·공간 복잡도는 정확히 표기한다.',
        '최소 2개, 최대 5개의 핵심 개선 항목만 선정한다.',
      ].join(' '),
      input:[
        `문제: ${input.problem.title}`,
        `문제 링크: ${input.problem.externalUrl ?? '없음'}`,
        `작성자: ${input.member ?? '스터디원'} / 언어: ${input.language ?? 'unknown'}`,
        '코드:',
        code,
      ].join('\n'),
      text:{
        verbosity:'medium',
        format:{
          type:'json_schema',
          name:'algorithm_improvement_review',
          strict:true,
          schema:{
            type:'object',
            additionalProperties:false,
            properties:{
              verdict:{type:'string'},
              complexity:{type:'string'},
              issues:{
                type:'array',minItems:2,maxItems:5,
                items:{
                  type:'object',additionalProperties:false,
                  properties:{
                    kind:{type:'string',enum:['삭제 후보','개선','오류 위험','알고리즘']},
                    title:{type:'string'},evidence:{type:'string'},impact:{type:'string'},suggestion:{type:'string'},
                    line:{type:'integer',minimum:1},
                  },
                  required:['kind','title','evidence','impact','suggestion','line'],
                },
              },
              betterApproach:{
                type:'object',additionalProperties:false,
                properties:{title:{type:'string'},steps:{type:'array',minItems:2,maxItems:5,items:{type:'string'}},complexity:{type:'string'}},
                required:['title','steps','complexity'],
              },
              testCase:{type:'string'},
              highlightLines:{type:'array',minItems:1,maxItems:5,items:{type:'integer',minimum:1}},
            },
            required:['verdict','complexity','issues','betterApproach','testCase','highlightLines'],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('OpenAI review failed',response.status,detail.slice(0,300));
    return NextResponse.json({error:'AI 리뷰 생성에 실패했습니다.'},{status:502});
  }

  const payload = await response.json() as Record<string,unknown>;
  let review:unknown;
  try { review = JSON.parse(outputText(payload)); }
  catch { return NextResponse.json({error:'AI 응답을 읽지 못했습니다.'},{status:502}); }
  if (!validReview(review)) return NextResponse.json({error:'AI 리뷰 형식이 올바르지 않습니다.'},{status:502});

  const result = NextResponse.json({review});
  result.headers.set('Cache-Control','public, max-age=31536000, immutable');
  if (workerCache) await workerCache.put(cacheUrl,result.clone());
  return result;
}

