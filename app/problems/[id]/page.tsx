'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import SiteHeader from '../../components/site-header';
import type { ProblemDetail, StudySolution } from '../../lib/study';

type ReviewIssue = {kind:'삭제 후보'|'개선'|'오류 위험'|'알고리즘';title:string;evidence:string;impact:string;suggestion:string;line:number};
type Review = {
  verdict:string;
  complexity:string;
  issues:ReviewIssue[];
  betterApproach:{title:string;steps:string[];complexity:string};
  testCase:string;
  highlightLines:number[];
};

const reviewCache=new Map<string,Review>();
const reviewRequests=new Map<string,Promise<Review>>();
const reviewAttempted=new Set<string>();
const reviewErrors=new Map<string,string>();
const REVIEW_CACHE_PREFIX='algorithm-review:v9:';
const JAVA_KEYWORDS=new Set(['abstract','assert','boolean','break','byte','case','catch','char','class','const','continue','default','do','double','else','enum','extends','final','finally','float','for','if','implements','import','instanceof','int','interface','long','native','new','package','private','protected','public','record','return','sealed','short','static','strictfp','super','switch','synchronized','this','throw','throws','transient','try','var','void','volatile','while','yield','permits','non-sealed']);
const JAVA_LITERALS=new Set(['true','false','null']);
const JAVA_TYPES=new Set(['String','Object','Integer','Long','Double','Float','Boolean','Character','Byte','Short','Math','System','Arrays','Collections','List','ArrayList','LinkedList','Map','HashMap','Set','HashSet','Queue','Deque','ArrayDeque','PriorityQueue','Stack','StringBuilder','Scanner','BufferedReader','InputStreamReader','StringTokenizer','IOException']);
type CodeToken={text:string;kind?:'keyword'|'literal'|'type'|'string'|'number'|'comment'|'annotation'|'operator'};

function highlightJava(code:string) {
  let inBlockComment=false;
  return code.replace(/\r\n/g,'\n').split('\n').map((line)=>{
    const tokens:CodeToken[]=[];
    let index=0;
    const push=(text:string,kind?:CodeToken['kind'])=>tokens.push({text,kind});
    while(index<line.length) {
      if(inBlockComment) {
        const end=line.indexOf('*/',index);
        if(end<0) { push(line.slice(index),'comment'); break; }
        push(line.slice(index,end+2),'comment'); index=end+2; inBlockComment=false; continue;
      }
      if(line.startsWith('//',index)) { push(line.slice(index),'comment'); break; }
      if(line.startsWith('/*',index)) {
        const end=line.indexOf('*/',index+2);
        if(end<0) { push(line.slice(index),'comment'); inBlockComment=true; break; }
        push(line.slice(index,end+2),'comment'); index=end+2; continue;
      }
      const char=line[index];
      if(char==='"' || char==="'") {
        const quote=char; let end=index+1;
        while(end<line.length) {
          if(line[end]==='\\') { end+=2; continue; }
          const current=line[end++];
          if(current===quote) break;
        }
        push(line.slice(index,end),'string'); index=end; continue;
      }
      const rest=line.slice(index);
      const annotation=rest.match(/^@[A-Za-z_$][\w$]*/)?.[0];
      if(annotation) { push(annotation,'annotation'); index+=annotation.length; continue; }
      const number=rest.match(/^(?:0[xX][\dA-Fa-f_]+|0[bB][01_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d[\d_]*)?)[fFdDlL]?/)?.[0];
      if(number) { push(number,'number'); index+=number.length; continue; }
      const operator=rest.match(/^(?:->|::|>>>?=?|<<=?|==|!=|<=|>=|&&|\|\||\+\+|--|[+\-*%=&|^!<>?:~]=?)/)?.[0];
      if(operator) { push(operator,'operator'); index+=operator.length; continue; }
      const word=rest.match(/^[A-Za-z_$][\w$]*/)?.[0];
      if(word) {
        const kind=JAVA_KEYWORDS.has(word)?'keyword':JAVA_LITERALS.has(word)?'literal':JAVA_TYPES.has(word)||/^[A-Z]/.test(word)?'type':undefined;
        push(word,kind); index+=word.length; continue;
      }
      const plain=rest.match(/^[^A-Za-z_$@'"/\d]+/)?.[0] ?? char;
      push(plain); index+=plain.length;
    }
    return tokens;
  });
}

function shortHash(value:string) {
  let hash=2166136261;
  for (let index=0;index<value.length;index++) hash=Math.imul(hash^value.charCodeAt(index),16777619);
  return (hash>>>0).toString(36);
}

function storedReview(key:string) {
  try {
    const value=window.localStorage.getItem(REVIEW_CACHE_PREFIX+key);
    return value?JSON.parse(value) as Review:null;
  } catch { return null; }
}

function storeReview(key:string,review:Review) {
  try { window.localStorage.setItem(REVIEW_CACHE_PREFIX+key,JSON.stringify(review)); }
  catch { /* 메모리 캐시는 계속 사용한다. */ }
}

function CodeViewer({solution,highlights,issues}:{solution:StudySolution;highlights:number[];issues:ReviewIssue[]}) {
  const lines=highlightJava(solution.code ?? '');
  const marked=new Set(highlights);
  const [activeLine,setActiveLine]=useState<number|null>(null);
  const issuesByLine=new Map<number,ReviewIssue[]>();
  issues.forEach((issue)=>issuesByLine.set(issue.line,[...(issuesByLine.get(issue.line) ?? []),issue]));
  useEffect(()=>{
    if(activeLine===null) return;
    const closeOnOutside=(event:PointerEvent)=>{
      if(event.target instanceof Element && !event.target.closest('.lineReviewAnchor')) setActiveLine(null);
    };
    const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==='Escape') setActiveLine(null);};
    document.addEventListener('pointerdown',closeOnOutside);
    document.addEventListener('keydown',closeOnEscape);
    return ()=>{
      document.removeEventListener('pointerdown',closeOnOutside);
      document.removeEventListener('keydown',closeOnEscape);
    };
  },[activeLine]);
  return <pre className="wideCode" tabIndex={0} aria-label="전체 풀이 코드">
    <code>{lines.map((line,index)=>{
      const lineNumber=index+1;
      const lineIssues=issuesByLine.get(lineNumber) ?? [];
      const isOpen=activeLine===lineNumber;
      return <span className={`codeLine ${marked.has(lineNumber)?'reviewed':''} ${isOpen?'reviewOpen':''}`} key={index}>
        <span className="lineNumber">{lineNumber}</span><span className="lineText">{line.length?line.map((token,tokenIndex)=><span className={token.kind?`tok-${token.kind}`:undefined} key={tokenIndex}>{token.text}</span>):' '}</span>
        {lineIssues.length?<span className="lineReviewAnchor">
          <button className="lineReviewMark" type="button" aria-expanded={isOpen} aria-label={`${lineNumber}번 줄 리뷰 보기`} onClick={()=>setActiveLine(isOpen?null:lineNumber)}><span>✦</span> 리뷰</button>
          {isOpen?<span className="lineReviewBubble" role="note">
            {lineIssues.map((issue,issueIndex)=><span className="bubbleIssue" key={`${issue.title}-${issueIndex}`}>
              <span className="bubbleMeta"><em>{issue.kind}</em><small>LINE {issue.line}</small></span>
              <strong>{issue.title}</strong>
              <span>{issue.suggestion}</span>
            </span>)}
          </span>:null}
        </span>:null}
      </span>;
    })}</code>
  </pre>;
}

export default function ProblemPage() {
  const params=useParams<{id:string}>();
  const problemId=params.id;
  const [detail,setDetail]=useState<ProblemDetail|null>(null);
  const [selectedMemberId,setSelectedMemberId]=useState('');
  const [loading,setLoading]=useState(true);
  const [syncError,setSyncError]=useState('');
  const [review,setReview]=useState<Review|null>(null);
  const [reviewStatus,setReviewStatus]=useState<'idle'|'loading'|'ready'|'error'>('idle');
  const [reviewError,setReviewError]=useState('');

  const sync=useCallback(async (silent=false,refresh=false)=>{
    await Promise.resolve();
    if (!silent) setLoading(true);
    try {
      const query=new URLSearchParams({problemId});
      if (refresh) query.set('refresh','1');
      const response=await fetch(`/api/study?${query}`,{cache:refresh?'no-store':'default'});
      const body=await response.json() as ProblemDetail & {error?:string};
      if (!response.ok) throw new Error(body.error || '문제 동기화에 실패했습니다.');
      setDetail(body);
      setSyncError('');
      setSelectedMemberId((current)=>body.solutions.some((solution)=>solution.member.id===current)
        ? current
        : body.solutions.find((solution)=>solution.code)?.member.id ?? body.solutions[0]?.member.id ?? '');
    } catch (reason) {
      setSyncError(reason instanceof Error?reason.message:'문제 동기화에 실패했습니다.');
    } finally {
      if (!silent) setLoading(false);
    }
  },[problemId]);

  useEffect(()=>{
    const frame=requestAnimationFrame(()=>void sync());
    const timer=window.setInterval(()=>{
      if (document.visibilityState==='visible') void sync(true);
    },60000);
    return ()=>{cancelAnimationFrame(frame);window.clearInterval(timer);};
  },[sync]);

  const selected=detail?.solutions.find((solution)=>solution.member.id===selectedMemberId) ?? null;
  const reviewKey=selected?.code ? shortHash(`${detail?.problem.id}:${selected.member.id}:${selected.code}`) : '';

  const requestReview=useCallback(async (solution:StudySolution,cacheKey:string)=>{
    setReviewStatus('loading');
    setReviewError('');
    try {
      const cached=reviewCache.get(cacheKey) ?? storedReview(cacheKey);
      if (cached) {
        setReview(cached);
        setReviewStatus('ready');
        return;
      }
      let pending=reviewRequests.get(cacheKey);
      if (!pending) {
        pending=(async ()=>{
          const response=await fetch('/api/review',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
              problem:{title:detail?.problem.title,externalUrl:detail?.problem.externalUrl},
              member:solution.member.name,
              language:solution.language,
              code:solution.code,
            }),
          });
          const responseText=await response.text();
          let body:{review?:Review;error?:string}={};
          if(responseText) {
            try { body=JSON.parse(responseText) as {review?:Review;error?:string}; }
            catch { body={error:`코드 리뷰 서버가 올바르지 않은 응답을 반환했습니다. (${response.status})`}; }
          }
          if (!response.ok || !body.review) throw new Error(body.error || 'AI 리뷰 생성에 실패했습니다.');
          reviewCache.set(cacheKey,body.review);
          storeReview(cacheKey,body.review);
          return body.review;
        })().finally(()=>reviewRequests.delete(cacheKey));
        reviewRequests.set(cacheKey,pending);
      }
      setReview(await pending);
      reviewErrors.delete(cacheKey);
      setReviewStatus('ready');
    } catch (reason) {
      const message=reason instanceof Error?reason.message:'AI 리뷰 생성에 실패했습니다.';
      reviewErrors.set(cacheKey,message);
      setReviewStatus('error');
      setReviewError(message);
    }
  },[detail]);

  useEffect(()=>{
    let cancelled=false;
    const autoReview=async ()=>{
      await Promise.resolve();
      if (cancelled) return;
      if (!selected?.code || !reviewKey) {
        setReview(null);
        setReviewStatus('idle');
        setReviewError('');
        return;
      }
      if (reviewAttempted.has(reviewKey)) {
        const cached=reviewCache.get(reviewKey) ?? storedReview(reviewKey);
        setReview(cached);
        setReviewStatus(cached?'ready':'error');
        setReviewError(cached?'':reviewErrors.get(reviewKey) ?? '자동 리뷰를 다시 요청하지 않았습니다.');
        return;
      }
      reviewAttempted.add(reviewKey);
      setReview(null);
      await requestReview(selected,reviewKey);
    };
    void autoReview();
    return ()=>{cancelled=true;};
  },[requestReview,reviewKey,selected]);

  const completed=useMemo(()=>detail?.solutions.filter((solution)=>solution.code).length ?? 0,[detail]);

  return <div className="appShell">
    <SiteHeader/>
    <main className="detailMain">
      <div className="detailTopline"><Link href="/">← 문제 목록</Link><button type="button" className="textButton" onClick={()=>void sync(false,true)} disabled={loading}>{loading?'동기화 중…':'지금 동기화'}</button></div>

      {loading && !detail?<div className="loadingPanel"><span className="syncSpinner"/><strong>Notion 문제 템플릿을 읽는 중입니다.</strong></div>:null}
      {syncError?<div className="errorPanel"><strong>실시간 동기화에 실패했습니다.</strong><p>{syncError}</p><button type="button" onClick={()=>void sync(false,true)}>다시 시도</button></div>:null}

      {detail?<>
        <header className="problemHero">
          <div><p className="eyebrow">WEEK {detail.problem.week}</p><h1>{detail.problem.title}</h1><p>{detail.problem.date || '날짜 미정'} · {completed}/4명 코드 연결</p></div>
          <div className="problemActions">
            <a href={detail.problem.notionUrl} target="_blank" rel="noreferrer">Notion ↗</a>
            {detail.problem.externalUrl?<a className="primaryButton" href={detail.problem.externalUrl} target="_blank" rel="noreferrer">문제 원문 ↗</a>:null}
          </div>
        </header>

        <nav className="memberTabs" aria-label="멤버 코드 선택">
          {detail.solutions.map((solution)=><button key={solution.member.id} type="button" className={selectedMemberId===solution.member.id?'selected':''} onClick={()=>setSelectedMemberId(solution.member.id)}>
            <span className={`memberAvatar ${solution.member.tone}`}>{solution.member.name.slice(-1)}</span>
            <span><strong>{solution.member.name}</strong><small className={solution.code?'done':'empty'}>{solution.code?(solution.source==='notion'?'Notion 코드':'GitHub 코드'):'코드 없음'}</small></span>
          </button>)}
        </nav>

        {selected?.code?<section className="workspace">
          <div className="codePanel">
            <div className="codeWindow">
              <div className="panelBar"><div className="windowIdentity"><span className="codeWindowDots" aria-hidden="true"><i/><i/><i/></span><strong>{selected.member.name}</strong><span className="sourceBadge">{selected.source==='notion'?'Notion 첫 코드 블록':'GitHub 최신'}</span></div><a href={selected.sourceUrl} target="_blank" rel="noreferrer">원문 ↗</a></div>
              <CodeViewer solution={selected} highlights={review?.highlightLines ?? []} issues={review?.issues ?? []}/>
            </div>
          </div>

          <section className="aiReview">
            <div className="reviewHeading"><div><span className="aiMark">AI</span><span><strong>코드 리뷰</strong><small>불필요한 코드 · 구현 개선 · 더 나은 알고리즘</small></span></div>{reviewStatus==='loading'?<span className="reviewLoading"><i className="syncSpinner"/> 분석 중</span>:null}</div>

            {review?<div className="reviewBody">
              <div className="reviewSummary"><span>우선순위</span><h2>{review.verdict}</h2><p><strong>복잡도</strong> {review.complexity}</p></div>
              <div className="issueList">{review.issues.map((issue,index)=><article className="issueCard" key={issue.line+'-'+index}>
                <div><span className={`issueKind kind${index%4}`}>{issue.kind}</span><small>LINE {issue.line}</small></div>
                <h3>{issue.title}</h3><p><strong>근거</strong>{issue.evidence}</p><p><strong>영향</strong>{issue.impact}</p><p className="suggestion"><strong>수정</strong>{issue.suggestion}</p>
              </article>)}</div>
              <article className="approachCard"><span>더 나은 접근</span><h3>{review.betterApproach.title}</h3><ol>{review.betterApproach.steps.map((step)=><li key={step}>{step}</li>)}</ol><p>{review.betterApproach.complexity}</p></article>
              <div className="testCase"><strong>검증할 반례</strong><p>{review.testCase}</p></div>
            </div>:null}

            {reviewStatus==='error'?<div className="reviewFallback"><strong>자동 리뷰를 완료하지 못했습니다.</strong><p>{reviewError}</p><button className="primaryButton" type="button" onClick={()=>selected.code&&void requestReview(selected,reviewKey)}>AI 리뷰 받기</button></div>:null}
            {reviewStatus==='idle'?<div className="reviewFallback"><strong>리뷰할 코드가 없습니다.</strong></div>:null}
          </section>
        </section>:<div className="emptyCode"><strong>{selected?.member.name}님의 첫 번째 코드 블록이 아직 없습니다.</strong><p>Notion 멤버 페이지에 코드를 추가하면 이 페이지가 30초 안에 자동으로 다시 확인합니다.</p><a href={selected?.sourceUrl} target="_blank" rel="noreferrer">작성 페이지 열기 ↗</a></div>}
      </>:null}
    </main>
  </div>;
}
