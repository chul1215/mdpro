import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// KaTeX CSS: rehype-katex가 생성하는 span.katex* 클래스의 수학 기호 렌더링에 필수.
import 'katex/dist/katex.min.css';
// highlight.js 라이트 테마를 기본으로 로드한다. 다크 모드에서는 index.css에 정의된
// html.dark 스코프 오버라이드가 색상을 덮어쓴다. 두 CSS 파일을 모두 로드하면 후자가
// 선택자 특이도 동일로 이기는 방식이 불안정하므로, 라이트 하나 + 수동 다크 팔레트로 간결화.
import 'highlight.js/styles/github.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
