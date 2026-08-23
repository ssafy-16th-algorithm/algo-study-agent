'use client';

import { useEffect, useMemo, useState } from 'react';

type Status = 'done' | 'progress' | 'empty' | 'unlinked';
type Theme = 'light' | 'dark';

const members = [
  { name: '이종혁', handle: 'jonghyuck', score: '12 / 16', tone: 'violet', ratio: 75 },
  { name: '강예정', handle: 'yeajeong', score: '4 / 16', tone: 'blue', ratio: 25 },
  { name: '민택기', handle: '저장소 연결 필요', score: '0 / 16', tone: 'gray', ratio: 0 },
  { name: '주민경', handle: 'minkyung-', score: '3 / 16', tone: 'rose', ratio: 19 },
  { name: '전홍선', handle: 'hongph', score: '1 / 16', tone: 'amber', ratio: 6 },
];

const problems: Array<{week:number; platform:string; title:string; date:string; url:string; statuses:Status[]; tag:string}> = [
  { week:1, platform:'BOJ', title:'다리 만들기2', date:'07.24 - 07.26', url:'https://www.acmicpc.net/problem/17472', statuses:['progress','done','unlinked','progress','progress'], tag:'그래프 / MST' },
  { week:1, platform:'SWEA', title:'프로세서 연결하기', date:'07.24 - 07.26', url:'https://swexpertacademy.com/main/code/problem/problemDetail.do?contestProbId=AV4suNtaXFEDFAUf', statuses:['done','done','unlinked','done','empty'], tag:'백트래킹' },
  { week:1, platform:'BOJ', title:'선수과목', date:'07.24 - 07.26', url:'https://www.acmicpc.net/problem/14567', statuses:['done','empty','unlinked','done','empty'], tag:'위상 정렬' },
  { week:2, platform:'PGS', title:'섬 연결하기', date:'07.28', url:'https://school.programmers.co.kr/learn/courses/30/lessons/42861', statuses:['done','done','unlinked','empty','empty'], tag:'Kruskal' },
  { week:2, platform:'LTC', title:'684. Redundant Connection', date:'07.29', url:'https://leetcode.com/problems/redundant-connection/description/', statuses:['done','empty','unlinked','empty','empty'], tag:'Union-Find' },
  { week:3, platform:'CDT', title:'해적선장 코디', date:'07.31', url:'https://www.codetree.ai/ko/frequent-problems/samsung-sw/problems/pirate-captain-coddy/description', statuses:['empty','empty','unlinked','empty','empty'], tag:'시뮬레이션' },
  { week:3, platform:'PGS', title:'리코쳇 로봇', date:'08.03', url:'https://school.programmers.co.kr/learn/courses/30/lessons/169199', statuses:['done','done','unlinked','empty','empty'], tag:'BFS' },
  { week:3, platform:'SWEA', title:'나무높이', date:'08.05', url:'https://swexpertacademy.com/main/code/userProblem/userProblemDetail.do?contestProbId=AYFofW8qpXYDFAR4', statuses:['done','empty','unlinked','empty','empty'], tag:'그리디' },
  { week:4, platform:'PGS', title:'메뉴리뉴얼', date:'08.07', url:'https://school.programmers.co.kr/learn/courses/30/lessons/72411', statuses:['done','empty','unlinked','empty','empty'], tag:'조합' },
  { week:4, platform:'SWEA', title:'키 순서', date:'08.10', url:'https://swexpertacademy.com/main/code/problem/problemDetail.do?contestProbId=AWXQsLWKd5cDFAUo', statuses:['progress','empty','unlinked','empty','empty'], tag:'그래프' },
  { week:4, platform:'SWEA', title:'보급로', date:'08.12', url:'https://swexpertacademy.com/main/code/problem/problemDetail.do?contestProbId=AV15QRX6APsCFAYD', statuses:['done','empty','unlinked','empty','empty'], tag:'Dijkstra' },
  { week:5, platform:'SWEA', title:'벽돌깨기', date:'08.14 - 08.21', url:'https://swexpertacademy.com/main/code/problem/problemDetail.do?contestProbId=AWXRQm6qfL0DFAUo', statuses:['progress','empty','unlinked','empty','empty'], tag:'완전탐색' },
  { week:5, platform:'SWEA', title:'블록제거게임', date:'08.14 - 08.21', url:'https://swexpertacademy.com/main/code/userProblem/userProblemDetail.do?contestProbId=AZwmCVWq3uLHBIT3', statuses:['done','empty','unlinked','empty','empty'], tag:'시뮬레이션' },
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
  const [theme,setTheme] = useState<Theme>('light');
  const visibleProblems = useMemo(() => problems.filter((problem) => problem.week === selectedWeek), [selectedWeek]);
  const currentCode = codeSamples[codeIndex];

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('algostudy-theme', next);
    setTheme(next);
  };

  return (
    <main className="shell" id="top">
      <a className="skipLink" href="#dashboard">본문으로 건너뛰기</a>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="AlgoStudy 홈"><span className="brandMark">A</span><span><strong>AlgoStudy</strong><small>SSAFY 16기</small></span></a>
        <nav className="nav" aria-label="주요 메뉴"><a className="active" href="#dashboard">개요</a><a href="#problems">문제</a><a href="#compare">코드 리뷰</a><a href="#members">멤버</a></nav>
        <div className="headerActions"><button className="themeButton" type="button" onClick={toggleTheme} aria-label={`${theme === 'dark' ? '라이트' : '다크'} 모드로 전환`} aria-pressed={theme === 'dark'}>화면 {theme === 'dark' ? '밝게' : '어둡게'}</button><a className="githubButton" href="https://github.com/ssafy-16th-algorithm" target="_blank" rel="noreferrer">GitHub ↗</a></div>
      </header>

      <div className="page">
        <section className="hero" id="dashboard">
          <div className="heroCopy"><p className="heroMeta">공개 페이지 / 로그인 없음</p><h1>문제, 제출, 코드 리뷰를<br/>한곳에서 확인합니다.</h1><p className="heroDescription">노션에 등록한 문제와 GitHub 풀이를 연결했습니다. 같은 문제를 푼 코드와 AI 리뷰도 바로 볼 수 있습니다.</p><div className="heroActions"><a className="primaryButton" href="#problems">이번 주 문제</a><a className="textButton" href="#compare">코드 리뷰 보기 ↘</a></div></div>
          <aside className="snapshot" aria-label="데이터 스냅샷"><div className="snapshotHead"><span>데이터 스냅샷</span><time>2026.08.24</time></div><dl><div><dt>Notion</dt><dd>활성 문제 13개</dd></div><div><dt>GitHub</dt><dd>연결 저장소 4개</dd></div><div><dt>최근 활동</dt><dd>블록제거게임 / 08.21</dd></div></dl><p>읽기 전용으로 공개 중입니다.</p></aside>
        </section>

        <section className="metrics" aria-label="스터디 현황 요약"><article><span>이번 주</span><strong>2</strong><small>W5 문제</small></article><article><span>진행 중</span><strong>13</strong><small>활성 문제</small></article><article><span>저장소</span><strong>4</strong><small>5명 중 연결</small></article><article><span>최근 제출</span><strong>08.21</strong><small>이종혁</small></article></section>

        <section className="section" id="problems">
          <div className="sectionHead"><div><h2>주차별 제출 현황</h2><p>주차를 선택하면 문제별 제출 상태가 바뀝니다.</p></div><div className="weekTabs" aria-label="주차 선택">{[1,2,3,4,5].map((week)=><button key={week} type="button" className={selectedWeek===week?'selected':''} onClick={()=>setSelectedWeek(week)} aria-pressed={selectedWeek===week}>W{week}</button>)}</div></div>
          <div className="matrixWrap" tabIndex={0} aria-label={`WEEK ${selectedWeek} 제출 현황 표, 가로로 스크롤할 수 있습니다`}><table className="matrix"><thead><tr><th>문제</th>{members.map((member)=><th key={member.name}><span className={`avatar ${member.tone}`}>{member.name.slice(-1)}</span><b>{member.name}</b></th>)}</tr></thead><tbody>{visibleProblems.map((problem)=><tr key={problem.title}><td><span className="platform">{problem.platform}</span><div><strong>{problem.title}</strong><small>{problem.date} / {problem.tag}</small></div></td>{problem.statuses.map((status,index)=><td key={`${problem.title}-${members[index].name}`}><span className={`status ${status}`}>{status==='done'?'✓ ':''}{statusLabel[status]}</span></td>)}</tr>)}</tbody></table></div>
          <div className="problemCards">{visibleProblems.map((problem)=><a key={problem.title} className="problemCard" href={problem.url} target="_blank" rel="noreferrer"><span className="platform">{problem.platform}</span><div><h3>{problem.title}</h3><p>{problem.tag}</p></div><span className="openProblem">문제 열기 ↗</span></a>)}</div>
        </section>

        <section className="compareSection" id="compare">
          <div className="sectionHead"><div><h2>다리 만들기2 코드 비교</h2><p>BOJ 17472 / W1 / 작성자를 선택해 코드와 리뷰를 확인하세요.</p></div></div>
          <div className="codeTabs" role="tablist" aria-label="코드 작성자 선택">{codeSamples.map((sample,index)=><button key={sample.name} type="button" role="tab" aria-selected={codeIndex===index} className={codeIndex===index?'selected':''} onClick={()=>setCodeIndex(index)}><span className={`avatar ${sample.tone}`}>{sample.name.slice(-1)}</span><span><b>{sample.name}</b><small>{sample.lang} / {sample.status}</small></span></button>)}</div>
          <div className="compareGrid"><article className="codeWindow"><div className="codeBar"><b>{currentCode.name} / {currentCode.lang}</b><a href={currentCode.url} target="_blank" rel="noreferrer">원본 코드 ↗</a></div><pre><code>{currentCode.code}</code></pre></article><aside className="aiReview"><div className="aiReviewHead"><span className="spark">AI</span><div><strong>공개 코드 리뷰</strong><small>로그인 없이 열람할 수 있습니다</small></div></div>{codeIndex===0 && <><div className="finding warn"><span>완성도</span><b>탐색 좌표가 멈춰 있습니다</b><p>섬 번호 부여까지 구현됐지만 다리 탐색에서 좌표가 갱신되지 않고, 간선 생성과 MST 단계가 연결되지 않았습니다.</p></div><div className="finding"><span>다음 질문</span><b>한 방향으로 전진하려면?</b><p>선택한 방향의 좌표 값을 반복문 안에서 누적해 보세요.</p></div></>}{codeIndex===1 && <><div className="finding good"><span>풀이 구조</span><b>단계가 선명하게 분리됐습니다</b><p>BFS 번호 부여 → 직선 다리 후보 → Kruskal로 이어지며, 선택 간선이 섬 수-1인지도 검증합니다.</p></div><div className="finding"><span>토론할 점</span><b>탐색 범위를 더 줄일 수 있을까요?</b><p>모든 육지 칸 대신 가장자리 칸만 사용했을 때의 비용을 비교해 보세요.</p></div></>}{codeIndex===2 && <><div className="finding warn"><span>완성도</span><b>MST 선택 단계가 남았습니다</b><p>섬 번호와 다리 후보 행렬은 만들어졌지만 현재 출력은 간선 목록 확인에서 끝납니다.</p></div><div className="finding"><span>다음 질문</span><b>중복 간선을 어떻게 없앨까요?</b><p>dist_board를 Kruskal 간선 목록으로 바꾸며 i &lt; j 조건을 활용해 보세요.</p></div></>}<p className="reviewBasis">검토 기준: 실행 흐름, 종료 조건, 누락 단계</p></aside></div>
        </section>

        <section className="bottomGrid" id="members"><article className="memberPanel"><div className="panelHead"><div><h2>멤버별 누적 제출</h2><p>활성 문제와 저장소 파일을 기준으로 계산했습니다.</p></div></div><div className="memberList">{members.map((member)=><div className="memberRow" key={member.name}><span className={`avatar large ${member.tone}`}>{member.name.slice(-1)}</span><div className="memberInfo"><strong>{member.name}</strong><small>{member.handle}</small></div><b className="score">{member.score}</b></div>)}</div></article><article className="reviewPanel"><h2>리뷰가 만들어지는 과정</h2><p>문제와 풀이 파일을 규칙으로 연결한 뒤 AI가 실행 흐름과 누락 단계를 비교합니다. 생성된 리뷰는 이 페이지에 바로 공개됩니다.</p><dl className="processList"><div><dt>수집</dt><dd>Notion 문제와 GitHub 풀이</dd></div><div><dt>매핑</dt><dd>주차, 문제 번호, 작성자</dd></div><div><dt>분석</dt><dd>풀이 구조와 오류 가능성</dd></div><div><dt>공개</dt><dd>로그인 없는 읽기 전용 페이지</dd></div></dl><a className="textButton" href="#compare">코드 리뷰로 이동 ↑</a></article></section>
      </div>
      <footer><div className="footerBrand"><span className="brandMark small">A</span><span><strong>AlgoStudy</strong><small>SSAFY 16기</small></span></div><p>Notion / GitHub / AI</p><span>공개 읽기 전용 페이지</span></footer>
    </main>
  );
}
