'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import SiteHeader from './components/site-header';
import type { StudyProblem } from './lib/study';

type StudyResponse = {problems:StudyProblem[];syncedAt:string};

export default function Home() {
  const [data,setData] = useState<StudyResponse|null>(null);
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(true);
  const [selectedWeek,setSelectedWeek] = useState<number|null>(null);

  const sync = useCallback(async ()=>{
    await Promise.resolve();
    setLoading(true);
    setError('');
    try {
      const response=await fetch('/api/study',{cache:'no-store'});
      const body=await response.json() as StudyResponse & {error?:string};
      if (!response.ok) throw new Error(body.error || 'Notion 동기화에 실패했습니다.');
      setData(body);
      setSelectedWeek((current)=>current && body.problems.some((problem)=>problem.week===current)
        ? current
        : Math.max(...body.problems.map((problem)=>problem.week),1));
    } catch (reason) {
      setError(reason instanceof Error?reason.message:'Notion 동기화에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  },[]);

  useEffect(()=>{
    const frame=requestAnimationFrame(()=>void sync());
    return ()=>cancelAnimationFrame(frame);
  },[sync]);

  const weeks=useMemo(()=>Array.from(new Set((data?.problems ?? []).map((problem)=>problem.week))).sort((a,b)=>a-b),[data]);
  const visible=(data?.problems ?? []).filter((problem)=>problem.week===selectedWeek);

  return <div className="appShell">
    <SiteHeader/>
    <main className="homeMain">
      <section className="homeHero">
        <div>
          <p className="eyebrow"><span className="liveDot"/> NOTION LIVE SYNC</p>
          <h1>문제를 고르면,<br/>풀이 공간으로 이동합니다.</h1>
          <p>Notion 문제 템플릿과 멤버별 첫 번째 코드 블록을 실시간으로 읽습니다. 저장된 예제 코드 없이 현재 작성된 내용만 표시합니다.</p>
        </div>
        <aside className="sourcePanel">
          <div><Image src="/notion-mark.png" width={42} height={42} alt="Notion"/><span><strong>Notion 원본</strong><small>문제 · 멤버 · 첫 코드 블록</small></span></div>
          <div><Image src="/github-mark.png" width={42} height={42} alt="GitHub"/><span><strong>GitHub 대체</strong><small>Notion 코드가 없을 때만 조회</small></span></div>
        </aside>
      </section>

      <section className="problemBoard" aria-live="polite">
        <div className="boardHeader">
          <div><p className="eyebrow">PROBLEMS</p><h2>주차별 문제</h2></div>
          <button className="textButton" type="button" onClick={()=>void sync()} disabled={loading}>{loading?'동기화 중…':'지금 동기화'}</button>
        </div>

        {loading && !data ? <div className="loadingPanel"><span className="syncSpinner"/><strong>Notion에서 문제를 읽는 중입니다.</strong></div> : null}
        {error ? <div className="errorPanel"><strong>Notion 연결을 확인해 주세요.</strong><p>{error}</p><button type="button" onClick={()=>void sync()}>다시 시도</button></div> : null}

        {data ? <div className="problemBrowser">
          <aside className="weekRail">
            {weeks.map((week)=><button key={week} type="button" className={selectedWeek===week?'selected':''} onClick={()=>setSelectedWeek(week)}><strong>W{week}</strong><small>{data.problems.filter((problem)=>problem.week===week).length}문제</small></button>)}
          </aside>
          <div className="problemIndex">
            <div className="indexHeading"><div><small>WEEK {selectedWeek}</small><h3>{selectedWeek}주차</h3></div><span>{visible.length}개</span></div>
            {visible.map((problem,index)=><Link className="problemLink" href={`/problems/${problem.id}`} key={problem.id}>
              <span className="problemNumber">{String(index+1).padStart(2,'0')}</span>
              <span className="problemCopy"><small>{problem.date || '날짜 미정'}</small><strong>{problem.title}</strong><em>코드와 AI 리뷰 보기</em></span>
              <span className="rowArrow">→</span>
            </Link>)}
            {!visible.length?<div className="emptyList">이 주차에 등록된 문제가 없습니다.</div>:null}
          </div>
        </div>:null}
      </section>
    </main>
    <footer><span>Notion 실시간 읽기 · 공개 열람</span><a href="https://app.notion.com/p/3c5a717ec99e80e3b24df528768d2ce1" target="_blank" rel="noreferrer">원본 Notion ↗</a></footer>
  </div>;
}
