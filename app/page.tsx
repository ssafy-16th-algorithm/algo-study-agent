'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import SiteHeader from './components/site-header';
import { membersForWeek, type Member, type StudyProblem } from './lib/study';

type StudyResponse = {problems:StudyProblem[];syncedAt:string};
type UrgentProblem={id:string;title:string;dueDate:string;overdue:boolean};
type MemberProgress={member:Member;completed:number;total:number;percent:number;urgentProblems:UrgentProblem[]};
type ProgressResponse={week:number;progress:MemberProgress[];syncedAt:string};

function vocative(name:string) {
  const shortName=name.length>2?name.slice(1):name;
  const last=shortName.charCodeAt(shortName.length-1);
  const hasFinalConsonant=last>=0xac00&&last<=0xd7a3&&(last-0xac00)%28!==0;
  return `${shortName}${hasFinalConsonant?'아':'야'}`;
}

export default function Home() {
  const [data,setData] = useState<StudyResponse|null>(null);
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(true);
  const [selectedWeek,setSelectedWeek] = useState<number|null>(null);
  const [progressData,setProgressData] = useState<Pick<ProgressResponse,'week'|'progress'>|null>(null);
  const [progressLoading,setProgressLoading] = useState(false);

  const sync = useCallback(async (refresh=false)=>{
    await Promise.resolve();
    setLoading(true);
    setError('');
    try {
      const response=await fetch(refresh?'/api/study?refresh=1':'/api/study',{cache:refresh?'no-store':'default'});
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

  useEffect(()=>{
    if (!selectedWeek) return;
    const controller=new AbortController();
    const loadProgress=async ()=>{
      await Promise.resolve();
      if (controller.signal.aborted) return;
      setProgressLoading(true);
      try {
        const response=await fetch(`/api/study?progressWeek=${selectedWeek}`,{signal:controller.signal});
        const body=await response.json() as ProgressResponse & {error?:string};
        if (!response.ok) throw new Error(body.error || '진행도를 불러오지 못했습니다.');
        if (!controller.signal.aborted) setProgressData(body);
      } catch (reason) {
        if (!controller.signal.aborted && !(reason instanceof DOMException && reason.name==='AbortError')) setProgressData({week:selectedWeek,progress:[]});
      } finally {
        if (!controller.signal.aborted) setProgressLoading(false);
      }
    };
    void loadProgress();
    return ()=>controller.abort();
  },[selectedWeek]);

  const weeks=useMemo(()=>Array.from(new Set((data?.problems ?? []).map((problem)=>problem.week))).sort((a,b)=>a-b),[data]);
  const visible=(data?.problems ?? []).filter((problem)=>problem.week===selectedWeek);
  const activeMembers=membersForWeek(selectedWeek ?? 0);
  const progress=progressData?.week===selectedWeek
    ? progressData.progress.filter((item)=>activeMembers.some((member)=>member.id===item.member.id))
    : [];
  const progressPending=selectedWeek!==null && (progressLoading || progressData?.week!==selectedWeek);

  return <div className="appShell">
    <SiteHeader/>
    <main className="homeMain">
      <section className="homeHero">
        <div>
          <p className="eyebrow"><span className="liveDot"/> LIVE SYNC</p>
          <h1>문제를 선택해주세요.<br/>워크스페이스로 이동합니다.</h1>
        </div>
        <aside className="sourcePanel">
          <div><a className="sourceIconLink" href="https://app.notion.com/p/3c5a717ec99e80e3b24df528768d2ce1" target="_blank" rel="noreferrer" aria-label="SSAFY ALGO Notion 열기"><Image src="/notion-mark.png" width={42} height={42} alt=""/></a><span><strong>Notion</strong><small>문제 · 멤버 · 코드 블록</small></span></div>
          <div><a className="sourceIconLink" href="https://github.com/ssafy-16th-algorithm" target="_blank" rel="noreferrer" aria-label="SSAFY ALGO GitHub 열기"><Image src="/github-mark.png" width={42} height={42} alt=""/></a><span><strong>GitHub</strong><small>Notion 코드가 없을 때 조회</small></span></div>
        </aside>
      </section>

      <section className="problemBoard" aria-live="polite">
        <div className="boardHeader">
          <div><p className="eyebrow">PROBLEMS</p><h2>주차별 문제</h2></div>
          <button className="textButton" type="button" onClick={()=>void sync(true)} disabled={loading}>{loading?'동기화 중…':'문제 동기화'}</button>
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

      <section className="crewProgress" aria-labelledby="crew-progress-title">
        <div className="crewHeading"><div><p className="eyebrow">WEEK {selectedWeek} · PROGRESS</p><h2 id="crew-progress-title">스터디원</h2></div><span>{progressPending?'집계 중…':`${progress.filter((item)=>item.percent===100).length}명 완료`}</span></div>
        <div className="crewGrid">{progress.map((item)=>{const urgent=item.urgentProblems?.[0];return <article className={`memberProgressCard ${urgent?'hasUrgent':''}`} key={item.member.id}>
          <div className="memberProgressTop"><span className={`memberAvatar ${item.member.tone}`}>{item.member.name.slice(-1)}</span><span><strong>{item.member.name}</strong><small>{item.member.handle?`@${item.member.handle}`:'Notion'}</small></span><em>{item.percent}%</em></div>
          {urgent?<div className="urgentNotice" role="status"><span className="siren" aria-hidden="true">🚨</span><p><strong>{vocative(item.member.name)},</strong> {item.urgentProblems.map((problem)=>problem.title).join(', ')} 빨리 풀자!!!</p></div>:null}
          <div className="progressTrack" aria-label={`${item.member.name} ${item.completed}/${item.total}문제 완료`}><i style={{width:`${item.percent}%`}}/></div>
          <div className="progressMeta"><span>{item.completed}문제 완료</span><span>{item.total-item.completed}문제 남음</span></div>
        </article>})}</div>
        {progressPending&&!progress.length?<div className="crewSkeleton">{activeMembers.map((member)=><i key={member.id}/>)}</div>:null}
      </section>
    </main>
    <footer><span>SSAFY 16TH ALGORITHM STUDY 2026</span><a href="https://app.notion.com/p/3c5a717ec99e80e3b24df528768d2ce1" target="_blank" rel="noreferrer">원본 Notion ↗</a></footer>
  </div>;
}
