# noriter

가볍게 한판 즐기는 웹 게임 포털. 모바일 브라우저 우선, 데스크톱도 지원.

## 스택

- Vite + React 19 + TypeScript. 프레임워크 없이 react-router 로 라우팅.
- 게임 화면은 Canvas 로 직접 그린다. 포털 UI(목록, HUD, 댓글 등)만 React.
- 테스트: vitest. 게임 규칙은 순수 함수로 두고 반드시 테스트를 붙인다.
- 배포: Cloudflare Pages (정적). SPA 라우팅은 `public/_redirects` 가 처리.
- 백엔드(로그인·리더보드·댓글)는 별도 Spring Boot 프로젝트로 예정. 아직 없음.

## 명령

```
npm run dev      # 개발 서버 (--host: 같은 와이파이의 폰에서 접속 가능)
npm test         # vitest
npm run build    # tsc + vite build → dist/
npm run lint     # oxlint
```

## 구조

```
src/
  games/
    types.ts          GameDefinition, GameHost 인터페이스
    registry.ts       게임 목록. 새 게임은 여기에만 등록
    <id>/
      logic.ts        순수 게임 로직 (DOM 의존 금지)
      logic.test.ts
      Game<Id>.tsx    Canvas 렌더링 + 입력 처리
      index.ts        GameDefinition export
  pages/              Home(목록), Play(게임 + HUD + 광고 자리)
  lib/storage.ts      localStorage 래퍼 (best score 등)
  index.css           전역 스타일. 모바일 제스처 차단, safe-area
```

## 규칙

- 새 게임 추가: `src/games/<id>/` 에 logic/test/component/index 만들고 registry 에 한 줄 추가.
- 게임 컴포넌트는 `host.onScore` / `host.onGameOver` 로만 포털과 통신한다. 저장·전송은 포털 몫.
- 게임 로직에 `Math.random` 을 직접 쓰지 말고 `random` 인자로 주입받아 테스트 가능하게 한다.
- 터치 입력은 pointer 이벤트로 처리하고 캔버스에 `touch-action: none` 을 준다.
- 광고 태그는 `.ad-slot` 안에만 넣고 게임 캔버스 안에는 넣지 않는다.
- 커밋 메시지는 한국어 또는 영어 자유. 작은 단위로 자주.
