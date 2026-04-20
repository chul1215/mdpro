// Vite의 `?raw` 임포트 쿼리는 파일 내용을 문자열로 직접 반환한다.
// vite/client 타입을 tsconfig에 포함시키지 않았으므로 로컬에 선언을 둔다.
declare module '*?raw' {
  const content: string;
  export default content;
}
