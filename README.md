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
| 계단 오르기 | Shift 방향전환, Space 오르기 / 좌우 버튼 | 에너지 바, 번개 아이템, 대시(방향전환 직후 오르기, 시작 전 팁으로 안내) |
| 윷놀이 | 클릭/터치 (던지기 → 말판의 도착지를 두 번 눌러 이동) | 2~4인 같이 하기 전용. 규칙·난수는 서버, 화면은 서버 판을 그리기만. 잡기·방 도착·시작 때 천사·악마 카드를 뽑고, 항복할 수 있다 |
| 글딱지 | 화면 자모 키보드 / 물리 키보드(두벌식 자리, 한글 자모 입력도 됨) | 혼자 하기 전용. 하루 한 문제(KST 자정 갱신), 자모 6칸·6번 도전. 판정은 서버(정답은 내려오지 않음). 결과 이모지 격자 공유, 어렵게 풀기·고대비, 문제 만들기 링크(`?code=`, 클라이언트 판정) |

## 기능

- **계정**: 홈 첫 화면에서 닉네임 하나로 시작한다. 가입된 닉네임이면 비밀번호를 물어 로그인, 처음이면 가입(비밀번호 + 이메일 선택) 또는 게스트. 토큰(JWT)은 localStorage 에 두고 API 와 방 입장(`join.token`)에 같이 보낸다. 계정이 있으면 고른 캐릭터가 서버에 저장되어 어디서 접속해도 유지되고, 방에는 닉네임을 묻지 않고 바로 들어간다. 게스트는 이 브라우저에서만 이름이 남고 기록·친구·알림이 없다.
- **사람들·알림**: 로그인하면 왼쪽 아래에 사람(친구) 버튼과 알림 버튼이 뜬다. 친구 패널은 온라인/전체 탭, 검색(닉네임을 정확히 치고 Enter 하면 친구가 아닌 사용자도 찾아 프로필에서 추가), 친구가 지금 뭘 하는지(메뉴·어떤 게임 대기실·하는 중)와 대기실에 있으면 바로 들어가기. 머리글의 상태 버튼으로 온라인·자리 비움·바쁨·숨김을 고른다. 알림 패널은 환영·게임 결과·최고 기록 갱신·초대를 보여 주고, 새 알림은 개인 WebSocket 채널로 바로 도착해 배지와 초대 토스트가 뜬다.
- **프로필·친구 추가**: 대기실 참가자 이름(ⓘ)이나 친구 목록을 누르면 프로필 카드(캐릭터·가입일·접속 상태·게임별 판 수와 최고 기록 또는 1등 횟수). 친구 추가는 인스타 팔로우처럼 일방향이라 상대에게 알리지 않고 수락도 없다.
- **쪽지**: 사람들 패널의 "쪽지" 탭과 친구 옆 쪽지 버튼으로 1:1 대화. 서로 친구 관계(한쪽이라도)인 계정끼리만. 새 쪽지는 개인 채널로 바로 도착해 열려 있으면 대화에 붙고, 아니면 도크 배지와 상단 토스트. 이전 쪽지는 "더 보기" 로 50개씩.
- **초대**: 대기실의 "친구 초대" 에서 접속 중(온라인·자리 비움)인 친구만 초대 버튼이 살아 있다. 초대받은 쪽은 알림·상단 토스트의 "수락" 으로 그 방에 바로 들어간다(계정이라 자동 입장).
- **혼자 하기 / 같이 하기**: 게임을 고르면 선택 화면. 같이 하기는 방을 만들고 초대 링크(`/rooms/{id}`)로 부른다.
- **방**: 입장(계정은 자동, 게스트는 닉네임), 방장 설정(최대 인원, 게임 옵션), 방장 넘기기(대기실에서 다른 참가자에게), 3초 카운트다운 후 같은 seed 로 동시 시작, 실시간 점수판, 제한 시간, 순위. 방장의 다시 하기로 바로 재시작.
- **관전**: 다른 참가자 화면이 미니 뷰로 실시간 표시. 내가 끝나면 관전 화면으로 전환, ← → 로 대상 변경.
- **턴제 게임**: 윷놀이처럼 판이 하나인 게임은 서버가 상태를 갖고 `gameState` 를 내려준다. 화면은 `GameDefinition.Turn` 이 그리고 `action` 만 보낸다. 캐릭터가 겹치면 시작할 수 없다.
- **채팅**: 대기실·결과 화면(PC 는 진행 중에도) 채팅, 입장·퇴장 알림. 저장하지 않는다. 시각은 보는 사람의 로컬 시간.
- **캐릭터**: 십이지신 12마리 중 선택(홈·입장 화면·대기실). 처음엔 랜덤. 모든 게임이 같은 캐릭터를 쓴다.
- **글딱지**: 꼬들(kordle.kr) 규칙 그대로. 오늘 진행·설정은 localStorage, 통계는 계정이면 서버(`/api/games/word/stats`) 게스트면 localStorage. `solo: true` 게임은 방·최고 점수 UI 를 숨긴다.
- **화면 크기**: 게임판은 창·모니터 크기를 따라 커진다(PC 720px 이상에서 혼자 하기 폭 확대, 1040px 이상에서 방 화면도 확대). 게임 화면 머리글의 ⛶ 버튼은 브라우저 전체 화면(문서 전체를 요청, `body.fullscreen` 으로 하단·도크·광고 자리를 숨김). Fullscreen API 가 없는 iPhone Safari 에서는 버튼이 안 보인다.
- 연결이 끊기면 자동 재접속. 진행도·최고 점수·설정은 localStorage.
- **방문자 수**: 하단 오른쪽에 오늘·전체. 브라우저마다 하루 한 번 서버에 기록(서울 시간 기준).

## 기술 스택

**화면은 React 19 로, 게임은 Canvas 로 그린다.** 목록·대기실·채팅·순위표처럼 상태에 따라 바뀌는 일반 UI 는 React 컴포넌트이고, 게임판은 매 프레임 직접 그려야 해서 `<canvas>` 하나에 2D 컨텍스트로 렌더한다. 애니메이션(2048 타일 슬라이드, 계단 캐릭터 호핑·부스터 잔상)은 `requestAnimationFrame` 루프에서 처리하고, React 는 점수·종료 같은 표시용 상태만 갖는다. 페이지 이동은 React Router 로 `/games/{id}`, `/games/{id}/play`, `/rooms/{id}` 를 나눈다.

**게임 규칙은 순수 TypeScript 함수로 분리했다.** `logic.ts` 는 DOM 을 모르는 함수(보드 이동, 계단 판정, 에너지 계산)만 있어서 Vitest 로 단위 테스트한다. 난수는 `mulberry32` 로 seed 를 주입받아, 같은 seed 면 같은 판이 나온다. 이 덕분에 방 대전에서 전원이 같은 타일 순서·같은 계단을 받는다.

**서버와는 REST 와 WebSocket 두 통로로 통신한다.** 방 생성·조회·계정·친구·알림은 `fetch` 로(`lib/auth.ts` 가 Bearer 토큰을 붙인다), 입장·설정·시작·점수·채팅·상태 중계는 브라우저 내장 `WebSocket` 으로 주고받는다. `lib/roomClient.ts` 가 이 둘을 감싸고, 30초 하트비트와 끊김 시 자동 재접속을 담당한다. 로그인 상태는 `auth/AuthContext` 가 갖고, `lib/meSocket.ts` 로 개인 채널(`/ws/me`)을 하나 열어 둔다. 이 연결이 살아 있는 동안 서버가 나를 온라인으로 보고, 화면이 바뀌면 activity 를 보내며, 새 알림은 이 채널로 즉시 받는다. 끊기면 1.5초마다 다시 붙는다. 솔로 진행도·최고 점수와 게스트 닉네임은 `localStorage` 에 둔다.

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
    word/           글딱지: jamo(분해·자판), judge(판정·하드 모드), share(공유 텍스트), custom(문제 코드), api, storage, GameWord.tsx
    types.ts        GameDefinition / GameHost(onScore·onGameOver·onState) / PreviewProps / TurnProps(턴제)
  characters/       공통 캐릭터(SVG 12종, 피커, 캔버스 이미지)
  auth/             AuthContext(로그인 상태·하트비트·알림 폴링·캐릭터 동기화), useAuth/useActivity, Gate(닉네임 → 로그인/가입/게스트)
  social/           SocialDock(사람·알림 버튼, 초대 토스트), PeoplePanel(친구·상태 선택), NotificationPanel, ProfileCard, InviteDialog
  pages/            Home, GameEntry(혼자/같이), Play(솔로), Room(대기실·게임·관전·결과)
  lib/              api.ts(주소), auth.ts(계정·친구·알림 API), meSocket.ts(개인 채널), roomClient.ts(REST+WebSocket, 하트비트·재접속), storage.ts, random.ts, time.ts
```

새 게임은 `src/games/<id>/` 에 로직·렌더·미리보기·아이콘을 만들고 registry 에 한 줄 추가하면 된다. 서버에는 GameSpec 한 줄.
