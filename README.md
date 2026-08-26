# SSAFY ALGO

SSAFY 16기 알고리즘 스터디의 문제와 풀이를 확인하는 웹 대시보드입니다.

## 링크

- [SSAFY ALGO](https://algo-study-agent.vercel.app/)
- [스터디 Notion](https://app.notion.com/p/3c5a717ec99e80e3b24df528768d2ce1)
- [코드 저장소](https://github.com/ssafy-16th-algorithm/algo-study-agent)

## 기능

- Notion의 주차별 문제와 풀이 동기화
- 풀이, 시도한 풀이, 전략, 후기 표시
- 기본 LLM 모델 호출량 초과 시, 대체 모델로 fallback
- Notion 풀이가 없을 때 GitHub 코드 조회
- Java 코드 문법 강조
- 멤버별 주차 진행도 표시
- 마감 당일 및 마감 이후 미완료 문제 알림
- 버튼으로 요청하는 AI 코드 리뷰
- 라이트·다크 모드와 반응형 화면

## 실행

```bash
npm install
npm run dev
```

프로덕션 빌드

```bash
npm run build
```

## 최근 업데이트

### 2026-08-26

- 시도한 풀이 코드 블록 추가
- AI 코드 리뷰 내용과 API 처리 개선
- Ollama 실패 시 Groq로 전환하는 fallback 추가
- 로고 이미지와 모바일 반응형 UI 수정
- 스터디 마감일 기준 미완료 문제 사이렌 알림 추가
- 브라우저 탭 아이콘과 링크 미리보기 이미지 변경

### 2026-08-24

- SSAFY 알고리즘 스터디 대시보드 생성
- 주차별 문제 탐색과 Notion 실시간 동기화 추가
- 공개 AI 리뷰, 라이트·다크 모드 추가
- 수동 AI 리뷰 요청과 전략·후기 영역 추가
- AI 리뷰 예시 Java 코드 블록 추가
- LLM 모델 설정, JSON 응답 처리, 토큰 제한 및 배포 빌드 수정
