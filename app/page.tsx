'use client';

import { useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark';
type SubmissionStatus = 'done' | 'progress' | 'empty';
type MemberId = 'jonghyuck' | 'yeajeong' | 'taekgi' | 'minkyung';

type Problem = {
  id: string;
  week: number;
  platform: string;
  title: string;
  date: string;
  url: string;
  tag: string;
  notionUrl: string;
  statuses: Record<MemberId, SubmissionStatus>;
};

const members: Array<{
  id: MemberId;
  name: string;
  handle: string;
  sourceLabel: string;
  sourceUrl: string;
  tone: string;
}> = [
  { id: 'jonghyuck', name: '이종혁', handle: 'jonghyuck', sourceLabel: 'GitHub', sourceUrl: 'https://github.com/ssafy-16th-algorithm/jonghyuck', tone: 'blue' },
  { id: 'yeajeong', name: '강예정', handle: 'yeajeong', sourceLabel: 'GitHub', sourceUrl: 'https://github.com/ssafy-16th-algorithm/yeajeong', tone: 'purple' },
  { id: 'taekgi', name: '민택기', handle: 'taekki', sourceLabel: 'GitHub', sourceUrl: 'https://github.com/ssafy-16th-algorithm/taekki', tone: 'orange' },
  { id: 'minkyung', name: '주민경', handle: 'minkyung-', sourceLabel: 'GitHub', sourceUrl: 'https://github.com/ssafy-16th-algorithm/minkyung-', tone: 'green' },
];

const problems: Problem[] = [
  { id:'bridge', week:1, platform:'BOJ', title:'다리 만들기 2', date:'07.24–07.26', url:'https://mwzz6.tistory.com/entry/%EB%B0%B1%EC%A4%80-17472%EB%B2%88-%EB%8B%A4%EB%A6%AC-%EB%A7%8C%EB%93%A4%EA%B8%B0-2-Java', notionUrl:'https://app.notion.com/2bea717ec99e83eea899816a17658f28', tag:'그래프 · MST', statuses:{jonghyuck:'progress',yeajeong:'done',taekgi:'done',minkyung:'progress'} },
  { id:'processor', week:1, platform:'SWEA', title:'프로세서 연결하기', date:'07.24–07.26', url:'https://swexpertacademy.com/main/code/problem/problemDetail.do?contestProbId=AV4suNtaXFEDFAUf', notionUrl:'https://app.notion.com/7c1a717ec99e8297b4928154814c7a65', tag:'백트래킹', statuses:{jonghyuck:'done',yeajeong:'done',taekgi:'done',minkyung:'done'} },
  { id:'prerequisite', week:1, platform:'BOJ', title:'선수과목', date:'07.24–07.26', url:'https://tussle.tistory.com/1182', notionUrl:'https://app.notion.com/b49a717ec99e8309a6b981062ccbbe32', tag:'위상 정렬', statuses:{jonghyuck:'done',yeajeong:'empty',taekgi:'done',minkyung:'done'} },
  { id:'island', week:2, platform:'PGS', title:'섬 연결하기', date:'07.28', url:'https://school.programmers.co.kr/learn/courses/30/lessons/42861', notionUrl:'https://app.notion.com/0eba717ec99e831ca0c40177fdecf4dc', tag:'Kruskal', statuses:{jonghyuck:'done',yeajeong:'done',taekgi:'done',minkyung:'empty'} },
  { id:'redundant', week:2, platform:'LTC', title:'684. Redundant Connection', date:'07.29', url:'https://leetcode.com/problems/redundant-connection/description/', notionUrl:'https://app.notion.com/ec6a717ec99e8208ae8881425bd4db4b', tag:'Union-Find', statuses:{jonghyuck:'done',yeajeong:'done',taekgi:'done',minkyung:'empty'} },
  { id:'pirate', week:3, platform:'CDT', title:'해적선장 코디', date:'07.31', url:'https://www.codetree.ai/ko/frequent-problems/samsung-sw/problems/pirate-captain-coddy/description', notionUrl:'https://app.notion.com/0c8a717ec99e8309beae8188547a02f6', tag:'시뮬레이션', statuses:{jonghyuck:'empty',yeajeong:'empty',taekgi:'empty',minkyung:'empty'} },
  { id:'ricochet', week:3, platform:'PGS', title:'리코쳇 로봇', date:'08.03', url:'https://school.programmers.co.kr/learn/courses/30/lessons/169199', notionUrl:'https://app.notion.com/95da717ec99e8278bded815a0b9c67b8', tag:'BFS', statuses:{jonghyuck:'done',yeajeong:'done',taekgi:'done',minkyung:'empty'} },
  { id:'tree', week:3, platform:'SWEA', title:'나무높이', date:'08.05', url:'https://swexpertacademy.com/main/code/userProblem/userProblemDetail.do?contestProbId=AYFofW8qpXYDFAR4', notionUrl:'https://app.notion.com/a73a717ec99e829eade1013fc82c019a', tag:'그리디', statuses:{jonghyuck:'done',yeajeong:'empty',taekgi:'empty',minkyung:'empty'} },
  { id:'menu', week:4, platform:'PGS', title:'메뉴리뉴얼', date:'08.07', url:'https://school.programmers.co.kr/learn/courses/30/lessons/72411', notionUrl:'https://app.notion.com/938a717ec99e830d8b4c81ba28c55f4e', tag:'조합 · DFS', statuses:{jonghyuck:'done',yeajeong:'empty',taekgi:'done',minkyung:'empty'} },
  { id:'height', week:4, platform:'SWEA', title:'키 순서', date:'08.10', url:'https://swexpertacademy.com/main/code/problem/problemDetail.do?contestProbId=AWXQsLWKd5cDFAUo', notionUrl:'https://app.notion.com/27fa717ec99e83ffbfb0014c5b3088b1', tag:'그래프', statuses:{jonghyuck:'progress',yeajeong:'empty',taekgi:'done',minkyung:'empty'} },
  { id:'supply', week:4, platform:'SWEA', title:'보급로', date:'08.12', url:'https://swexpertacademy.com/main/code/problem/problemDetail.do?contestProbId=AV15QRX6APsCFAYD', notionUrl:'https://app.notion.com/738a717ec99e822994ba015ff6816a5b', tag:'Dijkstra', statuses:{jonghyuck:'done',yeajeong:'empty',taekgi:'done',minkyung:'empty'} },
  { id:'brick', week:5, platform:'SWEA', title:'벽돌깨기', date:'08.14–08.21', url:'https://swexpertacademy.com/main/code/problem/problemDetail.do?contestProbId=AWXRQm6qfL0DFAUo', notionUrl:'https://app.notion.com/0daa717ec99e83f0adee01d75d7b99e7', tag:'완전탐색', statuses:{jonghyuck:'progress',yeajeong:'empty',taekgi:'done',minkyung:'empty'} },
  { id:'block', week:5, platform:'SWEA', title:'블록제거게임', date:'08.14–08.21', url:'https://swexpertacademy.com/main/code/userProblem/userProblemDetail.do?contestProbId=AZwmCVWq3uLHBIT3', notionUrl:'https://app.notion.com/64ea717ec99e8238a92d011d192a7494', tag:'백트래킹', statuses:{jonghyuck:'done',yeajeong:'empty',taekgi:'done',minkyung:'empty'} },
];

const solutionUrls: Partial<Record<string,string>> = {
  'bridge:jonghyuck':'https://github.com/ssafy-16th-algorithm/jonghyuck/blob/main/src/week1/BOJ_17472.java',
  'bridge:yeajeong':'https://github.com/ssafy-16th-algorithm/yeajeong/blob/main/week1/BOJ_17472.%EB%8B%A4%EB%A6%AC%EB%A7%8C%EB%93%A4%EA%B8%B02.java',
  'bridge:taekgi':'https://github.com/ssafy-16th-algorithm/taekki/blob/main/week01/src/boj/boj_17472.java',
  'processor:taekgi':'https://github.com/ssafy-16th-algorithm/taekki/blob/main/week01/src/swea/swea_1167.java',
  'prerequisite:taekgi':'https://github.com/ssafy-16th-algorithm/taekki/blob/main/week01/src/boj/boj_14567.java',
  'island:taekgi':'https://github.com/ssafy-16th-algorithm/taekki/blob/main/week02/src/PGS_%EC%84%AC%EC%97%B0%EA%B2%B0%ED%95%98%EA%B8%B0.java',
  'redundant:taekgi':'https://github.com/ssafy-16th-algorithm/taekki/blob/main/week02/src/LTC_684.java',
  'ricochet:taekgi':'https://github.com/ssafy-16th-algorithm/taekki/blob/main/week03/src/PGS_%EB%A6%AC%EC%BD%94%EC%B3%87%EB%A1%9C%EB%B4%87.java',
  'menu:taekgi':'https://github.com/ssafy-16th-algorithm/taekki/blob/main/week04/src/PG_%EB%A9%94%EB%89%B4%EB%A6%AC%EB%89%B4%EC%96%BC.java',
  'height:taekgi':'https://github.com/ssafy-16th-algorithm/taekki/blob/main/week04/src/SWEA_5643.java',
  'supply:taekgi':'https://github.com/ssafy-16th-algorithm/taekki/blob/main/week04/src/SWEA_1249.java',
  'brick:taekgi':'https://github.com/ssafy-16th-algorithm/taekki/blob/main/week05/src/SWEA_5656.java',
  'block:taekgi':'https://github.com/ssafy-16th-algorithm/taekki/blob/main/week05/src/SWEA_26071.java',
};

const codePreviews: Partial<Record<string,string>> = {
  'bridge:jonghyuck':`static void makeBridge(int row, int col) {
    int startIsland = map[row][col];
    int bridgeLength = 0;

    while (true) {
        for (int direction = 0; direction < 4; direction++) {
            int nextRow = row + dr[direction];
            int nextCol = col + dc[direction];
            if (map[nextRow][nextCol] == 0) bridgeLength++;
        }
    }
}`,
  'bridge:yeajeong':`for (Edge edge : edges) {
    if (union(parent, edge.from, edge.to)) {
        total += edge.length;
        selected++;
    }
    if (selected == islandCount - 1) break;
}

System.out.println(selected == islandCount - 1 ? total : -1);`,
  'prerequisite:taekgi':`while (!queue.isEmpty()) {
    int current = queue.poll();

    for (int next : graph.get(current)) {
        indegree[next]--;
        semester[next] = Math.max(
            semester[next], semester[current] + 1
        );

        if (indegree[next] == 0) queue.offer(next);
    }
}`,
  'island:taekgi':`Arrays.sort(costs, Comparator.comparingInt(edge -> edge[2]));

for (int[] edge : costs) {
    int rootA = findParent(edge[0]);
    int rootB = findParent(edge[1]);
    if (rootA == rootB) continue;

    answer += edge[2];
    parent[rootB] = rootA;
    if (++selectedEdgeCount == n - 1) break;
}`,
  'brick:taekgi':`for (int column = 0; column < width; column++) {
    int[][] snapshot = copy(blocks);

    for (int row = 0; row < height; row++) {
        if (blocks[row][column] > 0) {
            destroy(row, column);
            break;
        }
    }

    fall();
    search(shotCount + 1);
    blocks = snapshot;
}`,
  'block:taekgi':`static void removeBlock(int score) {
    if (blocks.isEmpty()) {
        answer = Math.max(answer, score);
        return;
    }

    for (int index = 0; index < blocks.size(); index++) {
        int gained = calculateScore(index);
        int removed = blocks.remove(index);

        removeBlock(score + gained);
        blocks.add(index, removed);
    }
}`,
};

const reviews: Partial<Record<string,{label:string;title:string;body:string;question:string}>> = {
  'bridge:jonghyuck':{label:'누락 단계',title:'탐색 좌표가 다음 칸으로 이동하지 않습니다.',body:'방향을 고정한 뒤 row와 col을 갱신해야 직선 다리를 끝까지 탐색할 수 있습니다. 현재 구조는 같은 칸의 네 방향을 반복합니다.',question:'다리 후보 생성과 MST 단계를 어떤 자료구조로 연결할까요?'},
  'bridge:yeajeong':{label:'구조',title:'Kruskal의 종료 조건까지 선명합니다.',body:'간선을 비용 순서로 확인하고 union 성공 시에만 합산합니다. 선택 간선 수로 모든 섬의 연결 여부도 함께 검증했습니다.',question:'가장자리 육지만 탐색하면 간선 생성 비용이 얼마나 줄어들까요?'},
  'prerequisite:taekgi':{label:'정확성',title:'선수과목 수와 학기 전파가 자연스럽게 이어집니다.',body:'진입 차수가 0인 과목을 1학기로 시작하고, 다음 과목은 선행 경로 중 가장 늦은 학기를 기준으로 갱신합니다.',question:'LinkedList 대신 ArrayDeque를 쓰면 어떤 차이가 있을까요?'},
  'island:taekgi':{label:'효율',title:'최소 간선 선택 후 즉시 종료합니다.',body:'비용 오름차순 정렬, 사이클 검사, n-1개 선택 시 종료까지 Kruskal의 핵심 흐름이 잘 분리되어 있습니다.',question:'union by rank를 추가할 때 실제 입력 크기에서 체감 차이가 있을까요?'},
  'brick:taekgi':{label:'안정성',title:'상태 복사와 복구 경계가 명확합니다.',body:'열마다 보드를 복사한 뒤 연쇄 폭발과 중력을 처리하고 재귀가 끝나면 복구합니다. 서로 다른 선택 분기가 상태를 공유하지 않습니다.',question:'빈 열에서도 구슬 횟수를 소비하는 현재 흐름이 의도와 일치하는지 확인해 볼까요?'},
  'block:taekgi':{label:'구조',title:'선택 → 재귀 → 복구가 간결합니다.',body:'ArrayList에서 블록을 제거하고 같은 위치에 되돌려 모든 제거 순서를 빠짐없이 탐색합니다. 변경 가능한 상태를 다루는 백트래킹의 핵심이 잘 드러납니다.',question:'남은 블록 수가 1일 때의 점수 계산을 별도 함수로 옮기면 어떤 이점이 있을까요?'},
};

const statusText: Record<SubmissionStatus,string> = { done:'풀이 완료', progress:'작성 중', empty:'미제출' };

function getSource(problem: Problem, memberId: MemberId) {
  const member = members.find((item) => item.id === memberId)!;
  const solutionUrl = solutionUrls[`${problem.id}:${memberId}`];
  return { label:solutionUrl ? '원본 코드' : member.sourceLabel, url:solutionUrl ?? member.sourceUrl };
}

export default function Home() {
  const [theme,setTheme] = useState<Theme>('light');
  const [selectedWeek,setSelectedWeek] = useState(5);
  const [selectedProblemId,setSelectedProblemId] = useState('block');
  const [selectedMemberId,setSelectedMemberId] = useState<MemberId>('taekgi');

  const visibleProblems = useMemo(() => problems.filter((problem) => problem.week === selectedWeek), [selectedWeek]);
  const selectedProblem = problems.find((problem) => problem.id === selectedProblemId) ?? visibleProblems[0];
  const selectedMember = members.find((member) => member.id === selectedMemberId)!;
  const selectedStatus = selectedProblem.statuses[selectedMemberId];
  const detailKey = `${selectedProblem.id}:${selectedMemberId}`;
  const source = getSource(selectedProblem, selectedMemberId);
  const code = codePreviews[detailKey];
  const review = reviews[detailKey];
  const completedCount = members.filter((member) => selectedProblem.statuses[member.id] === 'done').length;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('algostudy-theme', next);
    setTheme(next);
  };

  const selectWeek = (week:number) => {
    const firstProblem = problems.find((problem) => problem.week === week)!;
    const firstMember = members.find((member) => firstProblem.statuses[member.id] !== 'empty')?.id ?? 'jonghyuck';
    setSelectedWeek(week);
    setSelectedProblemId(firstProblem.id);
    setSelectedMemberId(firstMember);
  };

  const selectProblem = (problem:Problem) => {
    const firstMember = members.find((member) => problem.statuses[member.id] === 'done')?.id
      ?? members.find((member) => problem.statuses[member.id] === 'progress')?.id
      ?? 'jonghyuck';
    setSelectedProblemId(problem.id);
    setSelectedMemberId(firstMember);
  };

  return (
    <div className="appShell" id="top">
      <a className="skipLink" href="#study-browser">문제 탐색으로 건너뛰기</a>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="AlgoStudy 홈"><span className="brandMark">A</span><span><strong>AlgoStudy</strong><small>SSAFY 16기</small></span></a>
        <nav className="nav" aria-label="주요 메뉴"><a className="active" href="#study-browser">문제</a><a href="#review-detail">코드 · AI 리뷰</a><a href="#members">멤버</a></nav>
        <div className="headerActions"><button className="utilityButton" type="button" onClick={toggleTheme} aria-label={`${theme === 'dark' ? '라이트' : '다크'} 모드로 전환`}>{theme === 'dark' ? '☀︎' : '◐'} <span>{theme === 'dark' ? '라이트' : '다크'}</span></button><a className="primaryButton small" href="https://github.com/ssafy-16th-algorithm" target="_blank" rel="noreferrer">GitHub ↗</a></div>
      </header>

      <main>
        <section className="intro">
          <div><p className="eyebrow"><span className="liveDot"/> NOTION SNAPSHOT · 2026.08.24</p><h1>이번 주 문제부터<br/>코드 리뷰까지, 한 번에.</h1><p className="introText">노션에 정리된 문제를 주차별로 탐색하고, 문제 하나를 선택해 멤버별 풀이와 AI 리뷰를 나란히 확인하세요.</p></div>
          <aside className="quickNote"><span className="noteIcon">N</span><div><strong>노션을 기준으로 동기화</strong><p>5개 주차 · 13개 문제 · 4명</p></div></aside>
        </section>

        <section className="studyBrowser" id="study-browser" aria-label="주차별 문제와 풀이 탐색">
          <aside className="weekSidebar">
            <div className="sidebarTitle"><span>주차</span><small>WEEK</small></div>
            <div className="weekButtons">{[1,2,3,4,5].map((week) => { const weekProblems = problems.filter((problem) => problem.week === week); return <button key={week} type="button" className={selectedWeek===week?'selected':''} onClick={()=>selectWeek(week)} aria-pressed={selectedWeek===week}><span>W{week}</span><small>{weekProblems.length}문제</small></button>; })}</div>
            <a className="notionLink" href="https://app.notion.com/p/3c5a717ec99e80e3b24df528768d2ce1" target="_blank" rel="noreferrer"><span className="miniIcon">N</span><span>스터디 Notion<small>원본 데이터 보기 ↗</small></span></a>
          </aside>

          <section className="problemColumn">
            <div className="columnHeader"><div><p className="eyebrow">WEEK {selectedWeek}</p><h2>{selectedWeek}주차 문제</h2></div><span className="countPill">{visibleProblems.length}개</span></div>
            <div className="problemList">
              {visibleProblems.map((problem,index) => { const done = members.filter((member) => problem.statuses[member.id] === 'done').length; return (
                <button key={problem.id} className={`problemRow ${selectedProblem.id===problem.id?'selected':''}`} type="button" onClick={()=>selectProblem(problem)} aria-pressed={selectedProblem.id===problem.id}>
                  <span className="problemIndex">{String(index+1).padStart(2,'0')}</span>
                  <span className="problemMain"><span className="problemMeta"><b>{problem.platform}</b>{problem.date}</span><strong>{problem.title}</strong><small>{problem.tag}</small></span>
                  <span className="submissionSummary" aria-label={`${members.length}명 중 ${done}명 풀이 완료`}><span className="memberDots">{members.map((member)=><i key={member.id} className={`${member.tone} ${problem.statuses[member.id]}`} title={`${member.name}: ${statusText[problem.statuses[member.id]]}`}/>)}</span><small>{done}/{members.length}</small></span>
                  <span className="rowArrow">›</span>
                </button>
              ); })}
            </div>
          </section>

          <section className="detailColumn" id="review-detail" aria-live="polite">
            <div className="detailHeader">
              <div className="detailBreadcrumb"><span>W{selectedProblem.week}</span><span>/</span><span>{selectedProblem.platform}</span></div>
              <div className="detailTitleRow"><div><h2>{selectedProblem.title}</h2><p>{selectedProblem.date} · {selectedProblem.tag}</p></div><a className="iconButton" href={selectedProblem.url} target="_blank" rel="noreferrer" aria-label="문제 원문 열기">↗</a></div>
              <div className="detailProgress"><span style={{width:`${completedCount/members.length*100}%`}}/><small>{members.length}명 중 {completedCount}명 풀이 완료</small></div>
            </div>

            <div className="memberTabs" role="tablist" aria-label="풀이 멤버 선택">{members.map((member) => { const status = selectedProblem.statuses[member.id]; return <button key={member.id} type="button" role="tab" aria-selected={selectedMemberId===member.id} className={selectedMemberId===member.id?'selected':''} onClick={()=>setSelectedMemberId(member.id)}><span className={`memberAvatar ${member.tone}`}>{member.name.slice(-1)}</span><span><b>{member.name}</b><small className={status}>{statusText[status]}</small></span></button>; })}</div>

            {selectedStatus === 'empty' ? (
              <div className="emptyState"><span className="emptyIcon">＋</span><h3>아직 등록된 풀이가 없습니다.</h3><p>{selectedMember.name}님의 풀이가 Notion 또는 GitHub에 추가되면 이 자리에 코드와 리뷰가 표시됩니다.</p><a href={selectedProblem.notionUrl} target="_blank" rel="noreferrer">Notion 문제 페이지 ↗</a></div>
            ) : (
              <div className="solutionStack">
                <article className="codeCard"><div className="cardBar"><div><span className={`statusDot ${selectedStatus}`}/><strong>{selectedMember.name}의 풀이</strong></div><a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a></div>{code ? <pre><code>{code}</code></pre> : <div className="codePending"><span>⌁</span><strong>코드 원문 연결됨</strong><p>원문은 확인할 수 있으며, 이 페이지의 코드 미리보기는 다음 동기화에서 생성됩니다.</p><a href={source.url} target="_blank" rel="noreferrer">원문에서 코드 보기 ↗</a></div>}</article>
                <aside className="reviewCard"><div className="reviewLabel"><span>AI</span><div><strong>코드 리뷰</strong><small>실행 흐름 · 정확성 · 개선점</small></div></div>{review ? <><span className="reviewTag">{review.label}</span><h3>{review.title}</h3><p>{review.body}</p><div className="reviewQuestion"><span>다음 질문</span><p>{review.question}</p></div></> : <><span className="reviewTag muted">분석 대기</span><h3>코드 미리보기 생성 후 리뷰합니다.</h3><p>원문 수집은 완료됐습니다. 정적 분석이 끝나면 실행 흐름과 개선 질문을 이 영역에 공개합니다.</p><div className="reviewQuestion"><span>현재 상태</span><p>{selectedStatus === 'progress' ? '작성 중인 풀이를 추적하고 있습니다.' : '다음 동기화 작업을 기다리고 있습니다.'}</p></div></>}</aside>
              </div>
            )}
          </section>
        </section>

        <section className="memberSection" id="members">
          <div className="sectionHeading"><p className="eyebrow">MEMBERS</p><h2>연결된 스터디 멤버</h2><p>현재 Notion에 참여 중인 네 명과 각자의 공개 저장소입니다.</p></div>
          <div className="memberGrid">{members.map((member) => { const submitted = problems.filter((problem) => problem.statuses[member.id] === 'done').length; return <a key={member.id} className="memberCard" href={member.sourceUrl} target="_blank" rel="noreferrer"><span className={`memberAvatar large ${member.tone}`}>{member.name.slice(-1)}</span><span className="memberCardText"><strong>{member.name}</strong><small>{member.handle}</small></span><span className="memberScore"><b>{submitted}</b><small>/ 13 완료</small></span><span className="rowArrow">↗</span></a>; })}</div>
        </section>
      </main>

      <footer><div className="brand"><span className="brandMark small">A</span><span><strong>AlgoStudy</strong><small>SSAFY 16기</small></span></div><p>Notion 기준 스냅샷 · 공개 읽기 전용</p><a href="#top">맨 위로 ↑</a></footer>
    </div>
  );
}
