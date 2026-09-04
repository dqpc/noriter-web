# noriter-web

가볍게 한판 즐기는 웹 놀이터. 모바일 브라우저에서 바로 플레이.

## 주소

| 환경 | 브랜치 | 웹 | API |
|---|---|---|---|
| prod | main | https://noriter-web.asgd56.workers.dev | https://noriter-api.asgd56.workers.dev |
| dev | develop | https://noriter-web-dev.asgd56.workers.dev | https://noriter-api-dev.asgd56.workers.dev |

push 되면 GitHub Actions 가 Cloudflare Workers 로 자동 배포한다. 백엔드는 [noriter-api](https://github.com/dqpc/noriter-api).

## 실행

```
npm install
npm run dev
```

`--host` 옵션이 켜져 있어 터미널에 뜨는 Network 주소로 같은 와이파이의 폰에서 접속할 수 있다.

## 게임

- 2048
