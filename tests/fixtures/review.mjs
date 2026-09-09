export const review = {
  verdict: '✅ 정상', currentApproach: '순회', issues: [],
  score: {
    rubricVersion: 1, total: 85, grade: 'A',
    criteria: {
      correctness: { points: 36, reason: '일반 입력과 경계값을 처리합니다.' },
      efficiency: { points: 25, reason: '반복 탐색을 줄일 여지가 있습니다.' },
      stability: { points: 16, reason: '큰 수의 자료형을 확인하세요.' },
      readability: { points: 8, reason: '중복된 조건을 정리할 수 있습니다.' },
    },
  },
};
