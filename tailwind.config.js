/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: [
          '"SF Pro Display"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Icons"',
          '"Helvetica Neue"',
          'Helvetica',
          'Arial',
          '"Noto Sans KR"',
          'sans-serif',
        ],
        sans: [
          '"SF Pro Text"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Icons"',
          '"Helvetica Neue"',
          'Helvetica',
          'Arial',
          '"Noto Sans KR"',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          '"SF Mono"',
          'Menlo',
          'Monaco',
          '"Cascadia Mono"',
          'Consolas',
          'monospace',
        ],
      },
      colors: {
        // Apple의 단일 강조색 팔레트로 blue 시리즈를 덮어쓴다.
        // 기존 blue-500/600 사용처가 자동으로 Apple Blue로 전환됨.
        blue: {
          50: '#e8f3ff',
          100: '#d0e7ff',
          200: '#a1ceff',
          300: '#72b6ff',
          400: '#2997ff', // 다크 배경 링크
          500: '#0071e3', // Apple Blue (주 강조)
          600: '#0066cc', // 라이트 배경 링크
          700: '#0058b0',
          800: '#004a93',
          900: '#003c77',
          950: '#002a54',
        },
        apple: {
          bg: '#f5f5f7', // 라이트 배경
          ink: '#1d1d1f', // 라이트 텍스트
          blue: '#0071e3',
          link: '#0066cc',
          brightLink: '#2997ff',
        },
        surface: {
          1: '#272729',
          2: '#262628',
          3: '#28282a',
          4: '#2a2a2d',
          5: '#242426',
        },
      },
      borderRadius: {
        pill: '980px',
      },
      boxShadow: {
        apple: '0 5px 30px 3px rgba(0, 0, 0, 0.22)',
      },
      letterSpacing: {
        'apple-tight': '-0.022em', // ~-0.374px @17px
        'apple-caption': '-0.016em', // ~-0.224px @14px
        'apple-display': '-0.005em', // ~-0.28px @56px
      },
      backdropBlur: {
        glass: '20px',
      },
      backdropSaturate: {
        glass: '180',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
