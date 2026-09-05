# noriter-web

놀이터(noriter)의 프론트엔드. 가볍게 한판 즐기는 웹 게임 포털이다. PC 브라우저가 1순위, 모바일은 같이 플레이할 수 있는 정도로 맞춘다.

## 주소

| 환경 | 브랜치 | 웹 | API |
|---|---|---|---|
| prod | main | https://noriter-web.asgd56.workers.dev | https://noriter-api.asgd56.workers.dev |
| dev | develop | https://noriter-web-dev.asgd56.workers.dev | https://noriter-api-dev.asgd56.workers.dev |

push 되면 GitHub Actions 가 Cloudflare Workers 로 자동 배포한다. 백엔드는 [noriter-api](https://github.com/dqpc/noriter-api).

## 게임

| 게임 | 조작 | 비고 |
|---|---|---|
| 2048 | 방향키 / 스와이프 | 목표 타일 512·1024·2048 선택, 클리어 타임 기록 |
| 계단 오르기 | Shift 방향전환, Space 오르기 / 좌우 버튼 | 에너지 바, 번개 아이템, 히든 부스터(방향전환 직후 오르기) |

## 기능

- **혼자 하기 / 같이 하기**: 게임을 고르면 선택 화면. 같이 하기는 방을 만들고 초대 링크(`/rooms/{id}`)로 부른다.
- **방**: 닉네임 입장, 방장 설정(최대 인원, 게임 옵션), 3초 카운트다운 후 같은 seed 로 동시 시작, 실시간 점수판, 제한 시간, 순위. 방장의 다시 하기로 바로 재시작.
- **관전**: 다른 참가자 화면이 미니 뷰로 실시간 표시. 내가 끝나면 관전 화면으로 전환, ← → 로 대상 변경.
- **채팅**: 대기실·결과 화면(PC 는 진행 중에도) 채팅, 입장·퇴장 알림. 저장하지 않는다.
- **캐릭터**: 십이지신 12마리 중 선택(홈·입장 화면·대기실). 처음엔 랜덤. 모든 게임이 같은 캐릭터를 쓴다.
- 연결이 끊기면 자동 재접속. 진행도·최고 점수·설정은 localStorage.

## 기술 스택

**화면은 React 19 로, 게임은 Canvas 로 그린다.** 목록·대기실·채팅·순위표처럼 상태에 따라 바뀌는 일반 UI 는 React 컴포넌트이고, 게임판은 매 프레임 직접 그려야 해서 `<canvas>` 하나에 2D 컨텍스트로 렌더한다. 애니메이션(2048 타일 슬라이드, 계단 캐릭터 호핑·부스터 잔상)은 `requestAnimationFrame` 루프에서 처리하고, React 는 점수·종료 같은 표시용 상태만 갖는다. 페이지 이동은 React Router 로 `/games/{id}`, `/games/{id}/play`, `/rooms/{id}` 를 나눈다.

**게임 규칙은 순수 TypeScript 함수로 분리했다.** `logic.ts` 는 DOM 을 모르는 함수(보드 이동, 계단 판정, 에너지 계산)만 있어서 Vitest 로 단위 테스트한다. 난수는 `mulberry32` 로 seed 를 주입받아, 같은 seed 면 같은 판이 나온다. 이 덕분에 방 대전에서 전원이 같은 타일 순서·같은 계단을 받는다.

**서버와는 REST 와 WebSocket 두 통로로 통신한다.** 방 생성·조회는 `fetch` 로, 입장·설정·시작·점수·채팅·상태 중계는 브라우저 내장 `WebSocket` 으로 주고받는다. `lib/roomClient.ts` 가 이 둘을 감싸고, 30초 하트비트와 끊김 시 자동 재접속을 담당한다. 진행도·최고 점수·닉네임·캐릭터는 아직 로그인이 없어 `localStorage` 에 둔다.

**빌드와 배포는 Vite 와 Cloudflare Workers 다.** Vite 가 개발 서버(핫 리로드, 같은 와이파이의 폰 접속)와 프로덕션 번들을 맡고, 브랜치에 따라 `VITE_APP_ENV` / `VITE_API_URL` 을 주입해 dev 와 prod 를 가른다. 결과물 `dist/` 는 Wrangler 로 Cloudflare Workers 정적 에셋에 올리고(`wrangler.jsonc`), SPA 라우팅은 Workers 의 폴백 설정이 처리한다. GitHub Actions 가 `develop` 은 `noriter-web-dev`, `main` 은 `noriter-web` 워커로 자동 배포한다.

**코드 품질 도구**는 oxlint(린트), Prettier(포맷), Vitest(테스트)이고, PR 마다 GitHub Actions 에서 린트·테스트·빌드를 돌린다. 캐릭터는 인라인 SVG 문자열로 두어 React 에서는 그대로, Canvas 에서는 data URI 이미지로 같은 그림을 쓴다.

## 실행

```
npm install
npm run dev        # http://localhost:5173 (API 는 .env.development 의 dev 주소)
npm test           # vitest
npm run lint       # oxlint
npm run build      # dist/
```

## 구조

```
src/
  games/            게임 모듈. registry.ts 에 등록하면 목록·방·관전에 자동 반영
    <id>/logic.ts   순수 로직(테스트), Game*.tsx Canvas 렌더, Preview*.tsx 미니 뷰, Icon*.tsx
    types.ts        GameDefinition / GameHost(onScore·onGameOver·onState) / PreviewProps
  characters/       공통 캐릭터(SVG 12종, 피커, 캔버스 이미지)
  pages/            Home, GameEntry(혼자/같이), Play(솔로), Room(대기실·게임·관전·결과)
  lib/              api.ts(주소), roomClient.ts(REST+WebSocket, 하트비트·재접속), storage.ts, random.ts, time.ts
```

새 게임은 `src/games/<id>/` 에 로직·렌더·미리보기·아이콘을 만들고 registry 에 한 줄 추가하면 된다. 서버에는 GameSpec 한 줄.
