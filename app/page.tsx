'use client';

import { useMemo, useState } from 'react';

type Status = 'done' | 'progress' | 'empty' | 'unlinked';

const members = [
  { name: '이종혁', handle: 'jonghyuck', score: '12 / 16', tone: 'violet', ratio: 75 },
  { name: '강예정', handle: 'yeajeong', score: '4 / 16', tone: 'blue', ratio: 25 },
  { name: '민택기', handle: '저장소 연결 필요', score: '0 / 16', tone: 'gray', ratio: 0 },
  { name: '주민경', handle: 'minkyung-', score: '3 / 16', tone: 'rose', ratio: 19 },
  { name: '전홍선', handle: 'hongph', score: '1 / 16', tone: 'amber', ratio: 6 },
];

const problems: Array<{week:number; platform:string; title:string; date:string; url:string; statuses:Status[]; tag:string}> = [
  { week:1, platform:'BOJ', title:'다리 만들기2', date:'07.24 — 07.26', url:'https://www.acmicpc.net/problem/17472', statuses:['progress','done','unlinked','progress','progress'], tag:'그래프 · MST' },
  { week:1, platform:'SWEA', title:'프로세서 연결하기', date:'07.24 — 07.26', url:'https://swexpertacademy.com/main/code/problem/problemDetail.do?contestProbId=AV4suNtaXFEDFAUf', statuses:['done','done','unlinked','done','empty'], tag:'백트래킹' },
  { week:1, platform:'BOJ', title:'선수과목', date:'07.24 — 07.26', url:'https://www.acmicpc.net/problem/14567', statuses:['done','empty','unlinked','done','empty'], tag:'위상 정렬' },
  { week:2, platform:'PGS', title:'섬 연결하기', date:'07.28', url:'https://school.programmers.co.kr/learn/courses/30/lessons/42861', statuses:['done','done','unlinked','empty','empty'], tag:'Kruskal' },
  { week:2, platform:'LTC', title:'684. Redundant Connection', date:'07.29', url:'https://leetcode.com/problems/redundant-connection/description/', statuses:['done','empty','unlinked','empty','empty'], tag:'Union-Find' },
  { week:3, platform:'CDT', title:'해적선장 코디', date:'07.31', url:'https://www.codetree.ai/ko/frequent-problems/samsung-sw/problems/pirate-captain-coddy/description', statuses:['empty','empty','unlinked','empty','empty'], tag:'시뮬레이션' },
  { week:3, platform:'PGS', title:'리코쳇 로봇', date:'08.03', url:'https://school.programmers.co.kr/learn/courses/30/lessons/169199', statuses:['done','done','unlinked','empty','empty'], tag:'BFS' },
  { week:3, platform:'SWEA', title:'나무높이', date:'08.05', url:'https://swexpertacademy.com/main/code/userProblem/userProblemDetail.do?contestProbId=AYFofW8qpXYDFAR4', statuses:['done','empty','unlinked','empty','empty'], tag:'그리디' },
  { week:4, platform:'PGS', title:'메뉴리뉴얼', date:'08.07', url:'https://school.programmers.co.kr/learn/courses/30/lessons/72411', statuses:['done','empty','unlinked','empty','empty'], tag:'조합' },
  { week:4, platform:'SWEA', title:'키 순서', date:'08.10', url:'https://swexpertacademy.com/main/code/problem/problemDetail.do?contestProbId=AWXQsLWKd5cDFAUo', statuses:['progress','empty','unlinked','empty','empty'], tag:'그래프' },
  { week:4, platform:'SWEA', title:'보급로', date:'08.12', url:'https://swexpertacademy.com/main/code/problem/problemDetail.do?contestProbId=AV15QRX6APsCFAYD', statuses:['done','empty','unlinked','empty','empty'], tag:'Dijkstra' },
  { week:5, platform:'SWEA', title:'벽돌깨기', date:'08.14 — 08.21', url:'https://swexpertacademy.com/main/code/problem/problemDetail.do?contestProbId=AWXRQm6qfL0DFAUo', statuses:['progress','empty','unlinked','empty','empty'], tag:'완전탐색' },
  { week:5, platform:'SWEA', title:'블록제거게임', date:'08.14 — 08.21', url:'https://swexpertacademy.com/main/code/userProblem/userProblemDetail.do?contestProbId=AZwmCVWq3uLHBIT3', statuses:['done','empty','unlinked','empty','empty'], tag:'시뮬레이션' },
];

const statusLabel: Record<Status,string> = { done:'제출', progress:'풀이 중', empty:'미제출', unlinked:'연결 전' };

const codeSamples = [
  { name:'이종혁', lang:'Java', status:'미완성', tone:'violet', url:'https://github.com/ssafy-16th-algorithm/jonghyuck/blob/main/src/week1/BOJ_17472.java', code:`static void makeBridge(int row, int col) {
    int startIsland = map[row][col];
    int bridgeLength = 0;
    while (true) {
        for (int i = 0; i < 4; i++) {
            int nextRow = row + dx[i];
            int nextCol = col + dy[i];
            if (map[nextRow][nextCol] == 0) {
                bridgeLength++;
            }
        }
    }
}` },
  { name:'강예정', lang:'Java', status:'해결', tone:'blue', url:'https://github.com/ssafy-16th-algorithm/yeajeong/blob/main/week1/BOJ_17472.%EB%8B%A4%EB%A6%AC%EB%A7%8C%EB%93%A4%EA%B8%B02.java', code:`for (Edge edge : edges) {
    if (union(parent, edge.from, edge.to)) {
        total += edge.length;
        selected++;
    }
    if (selected == count - 1) break;
}

System.out.println(
    selected == count - 1 ? total : -1
);` },
  { name:'전홍선', lang:'C++', status:'진행 중', tone:'amber', url:'https://github.com/ssafy-16th-algorithm/hongph/blob/main/17472.cpp', code:`vector<vector<int>> dist_board(
    cnt + 1,
    vector<int>(cnt + 1, INT_MAX)
);

for (int i = 1; i <= cnt; i++) {
    for (int j = 1; j <= cnt; j++) {
        if (dist_board[i][j] != INT_MAX)
            cout << i << " " << j << " "
                 << dist_board[i][j] << "\\n";
    }
}` },
];

export default function Home() {
  const [selectedWeek,setSelectedWeek] = useState(5);
  const [codeIndex,setCodeIndex] = useState(0);
  const visibleProblems = useMemo(() => problems.filter((problem) => problem.week === selectedWeek), [selectedWeek]);
  const currentCode = codeSamples[codeIndex];

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="AlgoStudy 홈"><span className="brandMark">A</span><span><strong>AlgoStudy</strong><small>SSAFY 16th</small></span></a>
        <nav className="nav" aria-label="주요 메뉴"><a className="active" href="#dashboard">대시보드</a><a href="#problems">문제</a><a href="#compare">코드 비교</a><a href="#members">멤버</a></nav>
        <a className="githubButton" href="https://github.com/ssafy-16th-algorithm" target="_blank" rel="noreferrer">GitHub 조직 ↗</a>
      </header>

      <div className="page" id="top">
        <section className="hero" id="dashboard">
          <div><div className="eyebrow"><span /> WEEK 5 · DATA SNAPSHOT</div><h1>이번 주도, 풀이의 흐름을<br />놓치지 않도록.</h1><p>노션의 문제와 4개 개인 저장소를 한 화면에서 확인합니다.<br className="desktopOnly" /> 실제 스터디 데이터를 정규화한 첫 번째 공유 대시보드입니다.</p></div>
          <div className="syncCard">
            <div className="syncTop"><span className="pulse" /><span>데이터 연결 상태</span><strong>정상</strong></div>
            <div className="sourceRow"><div><span className="sourceIcon notion">N</span><p><strong>Notion</strong><small>13개 활성 문제 · 5주차</small></p></div><span className="check">✓</span></div>
            <div className="sourceRow"><div><span className="sourceIcon github">G</span><p><strong>GitHub</strong><small>4개 저장소 · 20+ 커밋</small></p></div><span className="check">✓</span></div>
            <p className="snapshotTime">스냅샷 · 2026.08.24 00:28 KST</p>
          </div>
        </section>

        <section className="metrics" aria-label="스터디 현황 요약">
          <article><span>이번 주 문제</span><strong>2</strong><small>WEEK 5</small></article><article><span>활성 문제</span><strong>13</strong><small>보류 3개 제외</small></article><article><span>연결된 저장소</span><strong>4</strong><small>5명 중 4명</small></article><article><span>최근 활동</span><strong>08.21</strong><small>이종혁 · 벽돌깨기</small></article>
        </section>

        <section className="section" id="problems">
          <div className="sectionHead">
            <div><span className="kicker">STUDY TIMELINE</span><h2>주차별 제출 현황</h2></div>
            <div className="weekTabs" aria-label="주차 선택">{[1,2,3,4,5].map((week)=><button key={week} type="button" className={selectedWeek===week?'selected':''} onClick={()=>setSelectedWeek(week)}>W{week}</button>)}</div>
          </div>
          <div className="matrixWrap">
            <table className="matrix"><thead><tr><th>문제</th>{members.map((member)=><th key={member.name}><span className={`avatar ${member.tone}`}>{member.name.slice(-1)}</span><b>{member.name}</b></th>)}</tr></thead>
              <tbody>{visibleProblems.map((problem)=><tr key={problem.title}><td><span className="platform">{problem.platform}</span><div><strong>{problem.title}</strong><small>{problem.date} · {problem.tag}</small></div></td>{problem.statuses.map((status,index)=><td key={`${problem.title}-${members[index].name}`}><span className={`status ${status}`}>{status==='done'?'✓ ':''}{statusLabel[status]}</span></td>)}</tr>)}</tbody>
            </table>
          </div>
          <div className="problemCards">{visibleProblems.map((problem)=><a key={problem.title} className="problemCard" href={problem.url} target="_blank" rel="noreferrer"><div><span className="platform">{problem.platform}</span><span className="weekChip">WEEK {problem.week}</span></div><h3>{problem.title}</h3><p>{problem.tag}</p><span className="openProblem">문제 열기 ↗</span></a>)}</div>
        </section>

        <section className="compareSection" id="compare">
          <div className="sectionHead light"><div><span className="kicker">SAME PROBLEM · DIFFERENT APPROACHES</span><h2>다리 만들기2 코드 비교</h2></div><span className="compareMeta">BOJ 17472 · WEEK 1</span></div>
          <div className="codeTabs">{codeSamples.map((sample,index)=><button key={sample.name} type="button" className={codeIndex===index?'selected':''} onClick={()=>setCodeIndex(index)}><span className={`avatar ${sample.tone}`}>{sample.name.slice(-1)}</span><span><b>{sample.name}</b><small>{sample.lang} · {sample.status}</small></span></button>)}</div>
          <div className="compareGrid">
            <article className="codeWindow"><div className="codeBar"><span><i/><i/><i/></span><b>{currentCode.name} · {currentCode.lang}</b><a href={currentCode.url} target="_blank" rel="noreferrer">원본 코드 ↗</a></div><pre><code>{currentCode.code}</code></pre></article>
            <aside className="aiReview">
              <div className="aiReviewHead"><span className="spark">AI</span><div><strong>비교 리뷰 초안</strong><small>근거 기반 · 사람 승인 전</small></div></div>
              {codeIndex===0 && <><div className="finding warn"><b>완성도 확인</b><p>섬 번호 부여까지 구현됐지만 다리 탐색에서 좌표가 갱신되지 않고, 간선 생성과 MST 단계가 연결되지 않았습니다.</p></div><div className="finding"><b>다음 질문</b><p>한 방향을 고정해 바다를 전진하려면 어떤 값을 반복문 안에서 누적해야 할까요?</p></div></>}
              {codeIndex===1 && <><div className="finding good"><b>풀이 구조</b><p>BFS 번호 부여 → 직선 다리 후보 → Kruskal로 단계가 분리돼 있습니다. 선택 간선이 섬 수−1인지도 검증합니다.</p></div><div className="finding"><b>토론 포인트</b><p>모든 육지 칸에서 네 방향을 탐색하는 비용을 가장자리 칸만 사용해 줄일 수 있을까요?</p></div></>}
              {codeIndex===2 && <><div className="finding warn"><b>완성도 확인</b><p>섬 번호와 다리 후보 행렬은 만들어졌지만 현재 출력은 간선 목록 확인에서 끝납니다. MST 선택 단계가 필요합니다.</p></div><div className="finding"><b>다음 질문</b><p>만들어진 dist_board를 Kruskal용 간선 목록으로 변환하려면 중복 간선을 어떻게 제거할까요?</p></div></>}
              <div className="confidence"><span>리뷰 근거 신뢰도</span><b>92%</b></div>
            </aside>
          </div>
        </section>

        <section className="bottomGrid" id="members">
          <article className="panel memberPanel"><div className="panelHead"><div><span className="kicker">MEMBERS</span><h2>누적 제출 스냅샷</h2></div><span className="muted">활성 13문제 + 파일 매핑</span></div><div className="memberList">{members.map((member)=><div className="memberRow" key={member.name}><span className={`avatar large ${member.tone}`}>{member.name.slice(-1)}</span><div className="memberInfo"><strong>{member.name}</strong><small>{member.handle}</small></div><div className="progressTrack"><span style={{width:`${member.ratio}%`}} /></div><b className="score">{member.score}</b></div>)}</div></article>
          <article className="panel reviewPanel"><div className="reviewBadge">AGENT WORKFLOW</div><h2>수집부터 승인까지<br/>하나의 흐름으로.</h2><p>규칙 기반 매핑과 AI 분석을 분리하고, 리뷰는 사람의 승인 이후에만 공개합니다.</p><div className="flow"><span>수집</span><i>→</i><span>검증</span><i>→</i><span>리뷰</span><i>→</i><span>승인</span></div><div className="readyButton">첫 비교 리뷰 준비 완료</div></article>
        </section>
      </div>
      <footer><span>AlgoStudy · SSAFY 16th</span><span>Notion × GitHub × AI · read-only snapshot</span></footer>
    </main>
  );
}
