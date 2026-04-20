import { test, expect } from '@playwright/test';

// 모바일 뷰포트에서 주요 레이아웃이 정상 렌더되는지 확인한다.
// 정밀한 터치 제스처는 수동 영역이지만, 기본 반응형 + a11y는 자동으로 검증한다.
test.describe('모바일 뷰포트 스모크 (375x812)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('앱 로드 및 핵심 UI 접근 가능', async ({ page }) => {
    await page.goto('/');
    // 모바일에서 MDPro 로고는 md 미만 뷰포트에서 숨김(hidden md:block). 다른 앵커로 확인.
    await expect(page.getByRole('banner')).toBeVisible();

    // 뷰모드 radio는 모바일에서도 노출
    await expect(page.getByRole('radiogroup', { name: '뷰 모드' })).toBeVisible();

    // 파일 메뉴 접근 가능
    await page.getByRole('button', { name: '파일 메뉴' }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('Escape');

    // 사이드바 토글 — 모바일에서는 오버레이로 뜸
    await page.getByRole('button', { name: '사이드바 토글' }).click();
    await expect(page.getByRole('navigation', { name: '문서 목록' })).toBeVisible();
  });
});

test.describe('태블릿 뷰포트 스모크', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('md 분기 경계에서 레이아웃 정상', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'MDPro' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: '문서 목록' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: '문서 제목' })).toBeVisible();
  });
});
