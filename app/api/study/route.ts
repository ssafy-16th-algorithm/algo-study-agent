import { NextResponse } from 'next/server';
import { members, membersForWeek, type Member, type ProblemDetail, type StudyProblem, type StudySolution } from '../../lib/study';

const NOTION_VERSION = '2025-09-03';
const DEFAULT_PROBLEM_SOURCE = '2dca717ec99e82a2ae1687ec3d44366a';
const githubTreeCache = new Map<string,Promise<string[]>>();
const STUDY_CACHE_TTL_MS = 60_000;
const studyCache = new Map<string,{expiresAt:number;value:unknown}>();
const studyRequests = new Map<string,Promise<unknown>>();

function koreaDate() {
  return new Intl.DateTimeFormat('en-CA',{
    timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',
  }).format(new Date());
}

function studyDueDate(problemDate:string) {
  const dateValue=problemDate.slice(0,10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  const date=new Date(`${dateValue}T00:00:00Z`);
  const addDays=date.getUTCDay()===1?2:date.getUTCDay()===3?2:date.getUTCDay()===5?3:0;
  if (!addDays) return null;
  date.setUTCDate(date.getUTCDate()+addDays);
  return date.toISOString().slice(0,10);
}

async function cachedStudy<T>(key:string,loader:()=>Promise<T>,refresh=false):Promise<T> {
  const cached = studyCache.get(key);
  if (!refresh && cached && cached.expiresAt > Date.now()) return cached.value as T;
  const pending = studyRequests.get(key);
  if (pending) return pending as Promise<T>;
  const request = loader().then((value)=>{
    studyCache.set(key,{value,expiresAt:Date.now()+STUDY_CACHE_TTL_MS});
    return value;
  }).finally(()=>studyRequests.delete(key));
  studyRequests.set(key,request);
  return request;
}

type RichText = { plain_text?:string };
type NotionProperty = {
  type?:string;
  title?:RichText[];
  url?:string|null;
  multi_select?:Array<{name?:string}>;
  date?:{start?:string|null;end?:string|null}|null;
};
type NotionPage = {
  id:string;
  url?:string;
  properties?:Record<string,NotionProperty>;
};
type NotionBlock = {
  id:string;
  type:string;
  has_children?:boolean;
  code?:{rich_text?:RichText[];language?:string};
  [key:string]:unknown;
};

function notionHeaders(token:string) {
  return {
    Authorization:`Bearer ${token}`,
    'Content-Type':'application/json',
    'Notion-Version':NOTION_VERSION,
  };
}

async function notionRequest<T>(path:string,token:string,init?:RequestInit):Promise<T> {
  const response = await fetch(`https://api.notion.com/v1${path}`,{
    ...init,
    cache:'no-store',
    headers:{...notionHeaders(token),...(init?.headers ?? {})},
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Notion API ${response.status}: ${detail.slice(0,240)}`);
  }
  return response.json() as Promise<T>;
}

async function queryDataSource(dataSourceId:string,token:string) {
  const pages:NotionPage[] = [];
  let startCursor:string|undefined;
  do {
    const data = await notionRequest<{results?:NotionPage[];has_more?:boolean;next_cursor?:string|null}>(
      `/data_sources/${dataSourceId}/query`,
      token,
      {method:'POST',body:JSON.stringify({page_size:100,...(startCursor?{start_cursor:startCursor}:{})})},
    );
    pages.push(...(data.results ?? []));
    startCursor = data.has_more && data.next_cursor ? data.next_cursor : undefined;
  } while (startCursor);
  return pages;
}

async function getBlockChildren(blockId:string,token:string) {
  const blocks:NotionBlock[] = [];
  let cursor:string|undefined;
  do {
    const query = new URLSearchParams({page_size:'100'});
    if (cursor) query.set('start_cursor',cursor);
    const data = await notionRequest<{results?:NotionBlock[];has_more?:boolean;next_cursor?:string|null}>(
      `/blocks/${blockId}/children?${query}`,
      token,
    );
    blocks.push(...(data.results ?? []));
    cursor = data.has_more && data.next_cursor ? data.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

function blockText(block:NotionBlock) {
  const value=block[block.type] as {rich_text?:RichText[]} | undefined;
  return (value?.rich_text ?? []).map((item)=>item.plain_text ?? '').join('').trim();
}

type SolutionSection=''|'solution'|'attempted'|'strategy'|'retrospective';

async function flattenNotionBlocks(blockId:string,token:string,depth=0):Promise<NotionBlock[]> {
  if (depth > 8) return [];
  const blocks=await getBlockChildren(blockId,token);
  const flattened:NotionBlock[]=[];
  for (const block of blocks) {
    flattened.push(block);
    if (block.has_children) flattened.push(...await flattenNotionBlocks(block.id,token,depth+1));
  }
  return flattened;
}

function sectionFromLabel(block:NotionBlock,text:string):Exclude<SolutionSection,''>|null {
  if (block.type==='code') return null;
  const name=text.normalize('NFKC').replace(/[^\p{L}\p{N}]/gu,'').replace(/^\d+/,'');
  const structural=/^heading_[123]$/.test(block.type) || block.type==='toggle' || block.type==='callout';
  const labelLike=structural || name.length<=32;
  if (!labelLike) return null;
  if (name.includes('시도한풀이') || name.includes('실패한풀이')) return 'attempted';
  if (name.includes('전략') || name.includes('접근방법')) return 'strategy';
  if (name.includes('후기') || name.includes('회고') || name.includes('느낀점')) return 'retrospective';
  if (name==='풀이' || name.includes('풀이코드') || name.includes('정답코드')) return 'solution';
  return null;
}

async function readSolutionContent(blockId:string,token:string):Promise<{code:string;language:string;attemptedCode:string;attemptedLanguage:string;strategy:string;retrospective:string}> {
  const result={code:'',language:'java',attemptedCode:'',attemptedLanguage:'java',strategy:'',retrospective:''};
  const blocks=await flattenNotionBlocks(blockId,token);
  let section:SolutionSection='';
  const sectionOrder:Record<SolutionSection,number>={'':0,solution:1,attempted:2,strategy:3,retrospective:4};
  for (const block of blocks) {
    const text=blockText(block);
    const detectedSection=sectionFromLabel(block,text);
    if (detectedSection && sectionOrder[detectedSection]>=sectionOrder[section]) { section=detectedSection; continue; }
    if (block.type === 'code') {
      const code=(block.code?.rich_text ?? []).map((item)=>item.plain_text ?? '').join('').trim();
      if (code && (section==='strategy' || section==='retrospective')) {
        result[section]+=`${result[section]?'\n':''}${code}`;
      } else if (code && section==='attempted' && !result.attemptedCode) {
        result.attemptedCode=code;
        result.attemptedLanguage=block.code?.language || 'java';
      } else if (code && !result.code) {
        result.code=code;
        result.language=block.code?.language || 'java';
      }
    } else if ((section==='strategy' || section==='retrospective') && text) {
      const prefix=block.type==='bulleted_list_item'?'- ':block.type==='numbered_list_item'?'1. ':'';
      const content=prefix?text.replace(/\r\n/g,'\n').replace(/\n/g,`\n${' '.repeat(prefix.length)}`):text;
      result[section]+=`${result[section]?'\n':''}${prefix}${content}`;
    }
  }
  return result;
}

function propertyText(property?:NotionProperty) {
  return (property?.title ?? []).map((item)=>item.plain_text ?? '').join('').trim();
}

function readProblem(page:NotionPage):StudyProblem {
  const properties = page.properties ?? {};
  const title = propertyText(properties['문제 이름']) || '제목 없는 문제';
  const weekName = properties['주차']?.multi_select?.[0]?.name ?? '';
  const week = Number(weekName.match(/\d+/)?.[0] ?? 0);
  const start = properties['출제날짜']?.date?.start ?? '';
  const end = properties['출제날짜']?.date?.end ?? '';
  const date = end ? `${start}–${end}` : start;
  const id = page.id.replace(/-/g,'');
  return {
    id,
    title,
    week,
    date,
    externalUrl:properties['URL']?.url ?? null,
    notionUrl:page.url ?? `https://app.notion.com/p/${id}`,
  };
}

function normalize(value:string) {
  return decodeURIComponent(value).toLocaleLowerCase().replace(/(프로그래머스|백준|leetcode|codetree|swea|boj|pgs|ltc)/g,'').replace(/[^0-9a-z가-힣]/g,'');
}

async function githubTree(member:Member) {
  if (!githubTreeCache.has(member.id)) {
    githubTreeCache.set(member.id,fetch(`https://api.github.com/repos/ssafy-16th-algorithm/${member.handle}/git/trees/main?recursive=1`,{cache:'no-store'})
      .then((response)=> {
        if (!response.ok) throw new Error(`GitHub tree ${response.status}`);
        return response.json() as Promise<{tree?:Array<{path:string;type:string}>}>;
      })
      .then((data)=>(data.tree ?? [])
        .filter((item)=>item.type === 'blob' && /\.(java|kt|py|cpp|cc|c|js|ts)$/i.test(item.path))
        .map((item)=>item.path)));
  }
  return githubTreeCache.get(member.id)!;
}

async function findGithubFallback(problem:StudyProblem,member:Member) {
  if (!member.handle || !member.repositoryUrl) return null;
  try {
    const paths = await githubTree(member);
    const titleToken = normalize(problem.title);
    const numericTokens = (problem.externalUrl?.match(/\d{4,}/g) ?? []).filter((token)=>token !== '2026');
    const path = paths
      .map((candidate)=>{
        const normalized = normalize(candidate);
        let score = numericTokens.some((token)=>normalized.includes(token)) ? 10 : 0;
        if (titleToken.length >= 3 && normalized.includes(titleToken)) score += 8;
        const titleParts = problem.title.split(/\s+/).map(normalize).filter((part)=>part.length >= 2);
        score += titleParts.filter((part)=>normalized.includes(part)).length;
        return {candidate,score};
      })
      .sort((a,b)=>b.score-a.score)[0];
    if (!path || path.score < 2) return null;
    const encodedPath = path.candidate.split('/').map(encodeURIComponent).join('/');
    const rawUrl = `https://raw.githubusercontent.com/ssafy-16th-algorithm/${member.handle}/main/${encodedPath}`;
    const response = await fetch(rawUrl,{cache:'no-store'});
    if (!response.ok) return null;
    const code = (await response.text()).trim();
    if (!code) return null;
    return {
      code,
      language:path.candidate.split('.').pop()?.toLowerCase() || 'text',
      sourceUrl:`https://github.com/ssafy-16th-algorithm/${member.handle}/blob/main/${encodedPath}`,
    };
  } catch {
    return null;
  }
}

async function getProblemDetail(problemId:string,token:string):Promise<ProblemDetail> {
  const page = await notionRequest<NotionPage>(`/pages/${problemId}`,token);
  const problem = readProblem(page);
  const blocks = await getBlockChildren(problemId,token);
  const solutionDatabase = blocks.find((block)=>block.type === 'child_database');
  if (!solutionDatabase) throw new Error('문제 페이지 안에서 문제풀이 데이터베이스를 찾지 못했습니다.');

  const database = await notionRequest<{data_sources?:Array<{id:string}>}>(`/databases/${solutionDatabase.id}`,token);
  const dataSourceId = database.data_sources?.[0]?.id;
  if (!dataSourceId) throw new Error('문제풀이 데이터 소스를 찾지 못했습니다.');

  const solutionPages = await queryDataSource(dataSourceId,token);
  const pageByName = new Map(solutionPages.map((solutionPage)=>{
    const titleProperty = Object.values(solutionPage.properties ?? {}).find((property)=>property.type === 'title');
    return [propertyText(titleProperty).replace(/\s/g,''),solutionPage] as const;
  }));

  const solutions:StudySolution[] = await Promise.all(members.map(async (member)=>{
    const solutionPage = pageByName.get(member.name.replace(/\s/g,''));
    if (solutionPage) {
      const notionContent = await readSolutionContent(solutionPage.id,token);
      if (notionContent.code) {
        return {
          member,
          code:notionContent.code,
          attemptedCode:notionContent.attemptedCode || null,
          attemptedLanguage:notionContent.attemptedLanguage,
          strategy:notionContent.strategy,
          retrospective:notionContent.retrospective,
          language:notionContent.language,
          source:'notion' as const,
          sourceUrl:solutionPage.url ?? `https://app.notion.com/p/${solutionPage.id.replace(/-/g,'')}`,
        };
      }
    }

    const githubCode = await findGithubFallback(problem,member);
    if (githubCode) {
      return {
        member,
        code:githubCode.code,
        attemptedCode:null,
        attemptedLanguage:'java',
        strategy:'',
        retrospective:'',
        language:githubCode.language,
        source:'github' as const,
        sourceUrl:githubCode.sourceUrl,
      };
    }

    return {
      member,
      code:null,
      attemptedCode:null,
      attemptedLanguage:'java',
      strategy:'',
      retrospective:'',
      language:'text',
      source:null,
      sourceUrl:solutionPage?.url ?? (solutionPage ? `https://app.notion.com/p/${solutionPage.id.replace(/-/g,'')}` : member.repositoryUrl ?? problem.notionUrl),
    };
  }));

  return {problem,solutions,syncedAt:new Date().toISOString()};
}

async function getProblems(sourceId:string,token:string,refresh=false) {
  return cachedStudy(`problems:${sourceId}`,async ()=>{
    const pages = await queryDataSource(sourceId,token);
    const problems = pages.map(readProblem)
      .filter((problem)=>problem.week > 0)
      .sort((a,b)=>a.week-b.week || a.date.localeCompare(b.date) || a.title.localeCompare(b.title,'ko'));
    return {problems,syncedAt:new Date().toISOString()};
  },refresh);
}

export async function GET(request:Request) {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return NextResponse.json(
      {error:'Notion 실시간 동기화를 위한 NOTION_TOKEN이 필요합니다.',code:'NOTION_NOT_CONFIGURED'},
      {status:503,headers:{'Cache-Control':'no-store'}},
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const problemId = searchParams.get('problemId')?.replace(/-/g,'').toLowerCase();
  const progressWeek = Number(searchParams.get('progressWeek') ?? 0);
  const refresh = searchParams.get('refresh') === '1';
  const cacheHeaders = {'Cache-Control':'private, max-age=30, stale-while-revalidate=60'};
  try {
    if (problemId) {
      if (!/^[0-9a-f]{32}$/.test(problemId)) return NextResponse.json({error:'잘못된 문제 ID입니다.'},{status:400});
      const detail = await cachedStudy(`problem:${problemId}`,()=>getProblemDetail(problemId,token),refresh);
      return NextResponse.json(detail,{headers:cacheHeaders});
    }

    const sourceId = (process.env.NOTION_PROBLEMS_DATA_SOURCE_ID || DEFAULT_PROBLEM_SOURCE).replace(/-/g,'');
    const data = await getProblems(sourceId,token,refresh);
    if (Number.isInteger(progressWeek) && progressWeek > 0) {
      const weekProblems=data.problems.filter((problem)=>problem.week===progressWeek);
      const details=await Promise.all(weekProblems.map((problem)=>cachedStudy(
        `problem:${problem.id}`,
        ()=>getProblemDetail(problem.id,token),
        refresh,
      )));
      const today=koreaDate();
      const progress=membersForWeek(progressWeek).map((member)=>{
        const completed=details.filter((detail)=>detail.solutions.some((solution)=>solution.member.id===member.id && Boolean(solution.code))).length;
        const urgentProblems=details.flatMap((detail)=>{
          const solved=detail.solutions.some((solution)=>solution.member.id===member.id && Boolean(solution.code));
          const dueDate=studyDueDate(detail.problem.date);
          return !solved && dueDate && dueDate<=today
            ? [{id:detail.problem.id,title:detail.problem.title,dueDate,overdue:dueDate<today}]
            : [];
        }).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||a.title.localeCompare(b.title,'ko'));
        return {member,completed,total:weekProblems.length,percent:weekProblems.length?Math.round(completed/weekProblems.length*100):0,urgentProblems};
      });
      return NextResponse.json({week:progressWeek,progress,syncedAt:new Date().toISOString()},{headers:cacheHeaders});
    }
    return NextResponse.json(data,{headers:cacheHeaders});
  } catch (error) {
    console.error('Study sync failed',error);
    return NextResponse.json(
      {error:error instanceof Error ? error.message : 'Notion 동기화에 실패했습니다.'},
      {status:502,headers:{'Cache-Control':'no-store'}},
    );
  }
}

