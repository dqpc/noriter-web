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
