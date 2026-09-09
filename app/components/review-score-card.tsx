import { nextScoreGoal, SCORE_GRADES, SCORE_RUBRIC, type ReviewScore } from '../lib/review-score';

export default function ReviewScoreCard({score}:{score:ReviewScore}) {
  const goal=nextScoreGoal(score.total);
  return <section className="reviewScore" aria-label="AI 코드 평가 점수">
    <div className="scoreOverview">
      <div className="scoreHeading"><h3>이번 풀이 점수</h3><span className="scoreGrade" data-grade={score.grade}>{score.grade}<small>등급</small></span></div>
      <p className="scoreTotal"><strong>{score.total}</strong><span>/ 100점</span></p>
      <p className="scoreGoal">{goal?<><strong>{goal.label}</strong>까지 <strong>{goal.remaining}점</strong></>:'100점 달성! 이 풀이의 강점을 다음 문제에도 활용해 보세요.'}</p>
    </div>
    <ul className="scoreCriteria">{SCORE_RUBRIC.map((rule)=>{
      const item=score.criteria[rule.id];
      return <li key={rule.id}>
        <div><strong>{rule.label}</strong><span><b>{item.points}</b> / {rule.max}</span></div>
        <meter min={0} max={rule.max} value={item.points} aria-label={`${rule.label} ${rule.max}점 만점에 ${item.points}점`}/>
        <p>{item.reason}</p>
      </li>;
    })}</ul>
    <details className="scoreRules">
      <summary>점수·등급 기준 보기</summary>
      <p>{SCORE_GRADES.map((tier)=>`${tier.grade} ${tier.min===0?'60점 미만':`${tier.min}점 이상`}`).join(' · ')}</p>
      <ul>{SCORE_RUBRIC.map((rule)=><li key={rule.id}><strong>{rule.label} {rule.max}점</strong><span>{rule.description}</span><p>{rule.bands}</p></li>)}</ul>
      <p>확인된 문제의 영향을 기준으로 평가하며, 같은 결함은 한 항목에서만 감점합니다.</p>
    </details>
    <p className="scoreNote">AI의 코드 분석 점수이며 실제 실행 채점 결과가 아닙니다. 같은 문제·같은 기준에서 참고하고, 모델이나 재요청에 따라 달라질 수 있습니다.</p>
  </section>;
}
