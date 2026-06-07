// Vite의 `?raw` 임포트 쿼리는 파일 내용을 문자열로 직접 반환한다.
// vite/client 타입을 tsconfig에 포함시키지 않았으므로 로컬에 선언을 둔다.
declare module '*?raw' {
  const content: string;
  export default content;
}

// TypeScript 6은 타입 선언이 없는 모듈의 side-effect import(import 'x.css')를
// TS2882로 거부한다. vite/client 타입을 포함하지 않으므로 CSS 모듈을 로컬 선언한다.
declare module '*.css';
