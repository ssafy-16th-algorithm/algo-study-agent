'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import CodeViewer from '../../components/code-viewer';
import MarkdownNote from '../../components/markdown-note';
import ReviewScoreCard from '../../components/review-score-card';
import SiteHeader from '../../components/site-header';
import { useCodeReview } from '../../hooks/use-code-review';
import type { ProblemDetail } from '../../lib/study';

export default function ProblemPage() {
  const {id:problemId}=useParams<{id:string}>();
  const [detail,setDetail]=useState<ProblemDetail|null>(null);
  const [selectedMemberId,setSelectedMemberId]=useState('');
  const [loading,setLoading]=useState(true);
  const [syncError,setSyncError]=useState('');

  const sync=useCallback(async (silent=false,refresh=false)=>{
    if (!silent) setLoading(true);
    try {
      const query=new URLSearchParams({problemId});
      if (refresh) query.set('refresh','1');
      const response=await fetch(`/api/study?${query}`,{cache:refresh?'no-store':'default'});
      const body=await response.json() as ProblemDetail & {error?:string};
      if (!response.ok) throw new Error(body.error || '문제 동기화에 실패했습니다.');
      setDetail(body); setSyncError('');
      setSelectedMemberId((current)=>body.solutions.some((solution)=>solution.member.id===current) ? current : body.solutions.find((solution)=>solution.code)?.member.id ?? body.solutions[0]?.member.id ?? '');
    } catch (reason) { setSyncError(reason instanceof Error?reason.message:'문제 동기화에 실패했습니다.'); }
    finally { if (!silent) setLoading(false); }
  },[problemId]);

  useEffect(()=>{
    const frame=requestAnimationFrame(()=>void sync());
    const timer=window.setInterval(()=>{ if (document.visibilityState==='visible') void sync(true); },60_000);
    return ()=>{cancelAnimationFrame(frame);window.clearInterval(timer);};
  },[sync]);

  const selected=detail?.solutions.find((solution)=>solution.member.id===selectedMemberId) ?? null;
  const completed=useMemo(()=>detail?.solutions.filter((solution)=>solution.code).length ?? 0,[detail]);
  const {review,status:reviewStatus,error:reviewError,request:requestReview,retry,remainingSeconds,disabled:reviewDisabled}=useCodeReview(detail?.problem ?? null,selected);
  const reviewButtonLabel=remainingSeconds>0?`${remainingSeconds}초 후 ${retry?'자동 재시도':'재요청 가능'}`:reviewStatus==='loading'?'분석 중…':review?'AI 리뷰 다시 받기':'AI 리뷰 받기';

  return <div className="appShell"><SiteHeader/><main className="detailMain">
    <div className="detailTopline"><Link href="/">← 문제 목록</Link><button type="button" className="textButton" onClick={()=>void sync(false,true)} disabled={loading}>{loading?'동기화 중…':'지금 동기화'}</button></div>
    {loading && !detail?<div className="loadingPanel"><span className="syncSpinner"/><strong>Notion 문제 템플릿을 읽는 중입니다.</strong></div>:null}
    {syncError?<div className="errorPanel"><strong>실시간 동기화에 실패했습니다.</strong><p>{syncError}</p><button type="button" onClick={()=>void sync(false,true)}>다시 시도</button></div>:null}

    {detail?<>
      <header className="problemHero">
        <div><p className="eyebrow">WEEK {detail.problem.week}</p><h1>{detail.problem.title}</h1><p>{detail.problem.date || '날짜 미정'} · {completed}/{detail.solutions.length}명 코드 연결</p></div>
        <div className="problemActions"><a href={detail.problem.notionUrl} target="_blank" rel="noreferrer">Notion ↗</a>{detail.problem.externalUrl?<a className="primaryButton" href={detail.problem.externalUrl} target="_blank" rel="noreferrer">문제 원문 ↗</a>:null}</div>
      </header>

      <nav className="memberTabs" aria-label="멤버 코드 선택">{detail.solutions.map((solution)=><button key={solution.member.id} type="button" className={selectedMemberId===solution.member.id?'selected':''} onClick={()=>setSelectedMemberId(solution.member.id)}>
        <span className={`memberAvatar ${solution.member.tone}`}>{solution.member.name.slice(-1)}</span><span><strong>{solution.member.name}</strong><small className={solution.code?'done':'empty'}>{solution.code?(solution.source==='notion'?'Notion 코드':'GitHub 코드'):'코드 없음'}</small></span>
      </button>)}</nav>

      {selected?.code?<section className="workspace">
        <div className="codePanel"><div className="codeWindow">
          <div className="panelBar"><div className="windowIdentity"><span className="codeWindowDots" aria-hidden="true"><i/><i/><i/></span><strong>{selected.member.name}</strong><span className="sourceBadge">{selected.source==='notion'?'Notion 풀이 코드':'GitHub 최신'}</span></div><div className="panelActions"><button className="reviewTrigger dark" type="button" disabled={reviewDisabled} onClick={()=>void requestReview(Boolean(review))}>{reviewButtonLabel}</button><a href={selected.sourceUrl} target="_blank" rel="noreferrer">원문 ↗</a></div></div>
          <CodeViewer key={`${selected.member.id}:${selected.code}`} code={selected.code} highlights={review?.highlightLines ?? []} issues={review?.issues ?? []}/>
        </div>{selected.attemptedCode?<div className="codeWindow attemptedCodeWindow">
          <div className="panelBar"><div className="windowIdentity"><span className="codeWindowDots muted" aria-hidden="true"><i/><i/><i/></span><strong>시도한 풀이</strong><span className="sourceBadge">{selected.attemptedLanguage || 'java'}</span></div><a href={selected.sourceUrl} target="_blank" rel="noreferrer">Notion 원문 ↗</a></div>
          <CodeViewer key={`${selected.member.id}:attempted:${selected.attemptedCode}`} code={selected.attemptedCode} highlights={[]} issues={[]}/>
        </div>:null}</div>

        <section className="solutionNotes" aria-label="풀이 기록">
          <article><span>01</span><div><h2>전략</h2><MarkdownNote content={selected.strategy} empty="아직 작성된 전략이 없습니다."/></div></article>
          <article><span>02</span><div><h2>후기</h2><MarkdownNote content={selected.retrospective} empty="아직 작성된 후기가 없습니다."/></div></article>
        </section>

        <div className="reviewCallout"><div><strong>이 풀이를 한 번 더 점검해 볼까요?</strong><span>버튼을 누르면 AI 리뷰를 요청합니다.</span></div><button className="reviewTrigger" type="button" disabled={reviewDisabled} onClick={()=>void requestReview(Boolean(review))}>{reviewButtonLabel} <span>→</span></button></div>

        <section className="aiReview">
          <div className="reviewHeading"><div><span className="aiMark">AI</span><span><strong>코드 리뷰</strong><small>불필요한 코드 · 구현 개선 · 더 나은 알고리즘</small></span></div></div>
          {review?<div className="reviewBody"><ReviewScoreCard score={review.score}/><div className="reviewSummary"><span>한 줄 평가</span><h2>{review.verdict}</h2><p><strong>복잡도</strong> {review.complexity}</p></div>
            <div className="reviewContext"><article><span>현재 풀이 방식</span><p>{review.currentApproach}</p></article>{review.strengths?.length?<article><span>잘한 점</span><ul>{review.strengths.map((strength)=><li key={strength}>{strength}</li>)}</ul></article>:null}</div>
            {review.issues.length?<div className="issueList">{review.issues.map((issue,index)=><article className="issueCard" key={issue.line+'-'+index}><div className="issueMeta"><span className="issueLabels"><em className={`severity severity${issue.severity==='반드시 수정'?'Must':issue.severity==='선택 사항'?'Optional':'Improve'}`}>{issue.severity}</em><span className={`issueKind kind${index%4}`}>{issue.kind}</span></span><small>LINE {issue.line}</small></div><h3>{issue.title}</h3>{issue.codeQuote?<p className="issueCodeQuote"><strong>코드</strong><code>{issue.codeQuote}</code></p>:null}<p><strong>근거</strong>{issue.evidence}</p><p><strong>영향</strong>{issue.impact}</p><p className="suggestion"><strong>수정</strong>{issue.suggestion}</p>{issue.codeExample?<div className="reviewCode"><div className="reviewCodeHeader"><span>JAVA</span><strong>수정 예시</strong></div><pre tabIndex={0}><code>{issue.codeExample}</code></pre></div>:null}</article>)}</div>:<div className="reviewNoIssues"><strong>현재 풀이에서 반드시 고쳐야 할 문제는 찾지 못했습니다.</strong><p>정답성과 성능이 충분하다면 다른 알고리즘으로 억지로 바꿀 필요가 없습니다.</p></div>}
            <article className="approachCard"><span>개선 방향</span><h3>{review.betterApproach.title}</h3><ol>{review.betterApproach.steps.map((step)=><li key={step}>{step}</li>)}</ol><p>{review.betterApproach.complexity}</p></article><div className="testCase"><strong>반례와 검증</strong><p>{review.testCase}</p></div>{review.learningPoints?.length?<article className="learningCard"><span>핵심 학습 포인트</span><ol>{review.learningPoints.map((point)=><li key={point}>{point}</li>)}</ol></article>:null}
          </div>:null}
          {reviewStatus==='loading'?<p className="reviewRecovery" role="status">{retry?`${remainingSeconds}초 후 자동으로 다시 요청합니다. (재시도 ${retry.attempt-1}/2)`:'AI가 코드를 분석하고 있습니다.'}{review?' 기존 리뷰도 계속 확인할 수 있습니다.':''}</p>:null}
          {reviewStatus==='error'?<div className="reviewFallback" role="alert"><strong>AI 리뷰를 완료하지 못했습니다.</strong><p>{reviewError}</p>{remainingSeconds>0?<p>{remainingSeconds}초 후 다시 요청할 수 있습니다.</p>:null}<button className="primaryButton" type="button" disabled={reviewDisabled} onClick={()=>void requestReview(true)}>다시 요청하기</button></div>:null}
          {reviewStatus==='loading'&&!review?<div className="reviewSkeleton" role="status" aria-live="polite"><span className="visuallyHidden">AI 코드 리뷰를 생성하고 있습니다.</span><div className="skeletonSummary"><i className="skLabel"/><i className="skTitle"/><i className="skText medium"/></div><div className="skeletonContext"><div><i className="skLabel"/><i className="skText"/><i className="skText short"/></div><div><i className="skLabel"/><i className="skText medium"/><i className="skText short"/></div></div><div className="skeletonIssues"><div><span><i className="skBadge"/><i className="skBadge pale"/></span><i className="skText medium"/><i className="skText"/><i className="skText short"/></div><div><span><i className="skBadge"/><i className="skBadge pale"/></span><i className="skText short"/><i className="skText"/><i className="skText medium"/></div></div><div className="skeletonApproach"><i className="skLabel"/><i className="skText medium"/><i className="skText"/><i className="skText short"/></div></div>:null}
          {reviewStatus==='idle'?<div className="reviewFallback"><strong>아직 AI 리뷰를 요청하지 않았습니다.</strong><p>위 버튼을 누르면 현재 코드를 기준으로 AI 리뷰를 요청합니다.</p></div>:null}
        </section>
      </section>:<div className="emptyCode"><strong>{selected?.member.name}님의 첫 번째 코드 블록이 아직 없습니다.</strong><p>Notion 멤버 페이지에 코드를 추가하면 이 페이지가 30초 안에 자동으로 다시 확인합니다.</p><a href={selected?.sourceUrl} target="_blank" rel="noreferrer">작성 페이지 열기 ↗</a></div>}
    </>:null}
  </main></div>;
}
