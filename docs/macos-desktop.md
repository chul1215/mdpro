# MD Practice macOS 앱 빌드

MD Practice는 웹앱과 동일한 React/Vite 코드를 Tauri 데스크탑 셸로 감싸 macOS 앱으로 빌드할 수 있다.

## 개발 실행

macOS에서 다음 도구가 필요하다.

- Node.js 22+
- Rust stable (`rustup` 권장)
- Xcode Command Line Tools

```bash
npm ci
npm run desktop:dev
```

## 앱 번들 빌드

```bash
npm ci
npm run desktop:build
```

성공하면 Tauri가 아래 경로에 산출물을 만든다.

- `src-tauri/target/release/bundle/macos/*.app`
- `src-tauri/target/release/bundle/dmg/*.dmg`

## 현재 설정

- 제품명: `MD Practice`
- 번들 ID: `com.chul1215.mdpractice`
- 최소 macOS: `12.0`
- 창 기본 크기: `1280x900`
- 창 최소 크기: `900x640`

## 주의

현재 설정은 **로컬/내부 배포용 unsigned 앱**을 만드는 단계다. 일반 사용자에게 배포하려면 Apple Developer ID 인증서로 코드 서명하고 Apple notarization을 추가해야 한다.
