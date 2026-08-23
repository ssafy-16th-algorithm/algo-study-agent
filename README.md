# algo-study-agent

SSAFY 16기 알고리즘 스터디의 문제, 제출 현황, 코드 비교와 AI 리뷰를 공개하는 웹 대시보드입니다.

## 주요 기능

- Notion 문제와 GitHub 풀이 현황 통합
- 주차별 제출 상태 확인
- 동일 문제 코드 비교와 공개 AI 리뷰
- 라이트 및 다크 모드
- 모바일, 태블릿, 데스크톱 반응형 지원

## 동기화와 AI 리뷰

코드는 공개 GitHub 저장소에서 최신 파일을 먼저 찾고, 파일을 찾지 못하면 해당 멤버의 Notion 풀이 페이지를 확인합니다. `NOTION_TOKEN`이 연결되지 않은 환경에서는 마지막으로 검증한 Notion 코드 스냅샷을 사용합니다.

AI 리뷰는 브라우저가 아닌 `/api/review` 서버 라우트에서 생성하며, 같은 코드의 결과는 코드 해시로 캐시됩니다. 배포 환경에는 다음 값을 비밀 환경 변수로 등록해야 합니다.

```text
OPENAI_API_KEY=...
OPENAI_REVIEW_MODEL=gpt-5  # 선택 사항
NOTION_TOKEN=...           # Notion 실시간 대체 동기화에 필요
```

`OPENAI_API_KEY`가 없으면 검수된 기본 리뷰를 유지하고, `NOTION_TOKEN`이 없으면 저장된 Notion 스냅샷으로 안전하게 대체합니다.

## 실행

```bash
npm install
npm run dev
```
