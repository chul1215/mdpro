import { test, expect } from '@playwright/test';

for (const theme of ['light', 'dark'] as const) {
  test(`${theme} 테마의 문서 보내기 모달이 뷰포트 안에 표시된다`, async ({ page }) => {
    const viewport = { width: 1280, height: 800 };
    await page.setViewportSize(viewport);
    await page.addInitScript((selectedTheme) => {
      localStorage.setItem(
        'mdpro-ui',
        JSON.stringify({ state: { theme: selectedTheme, sidebarOpen: false }, version: 1 }),
      );
    }, theme);
    await page.goto('/');

    await page.getByRole('button', { name: '문서 보내기' }).click();
    const dialog = page.getByRole('dialog', { name: '문서 보내기' });
    const overlay = dialog.locator('..');
    const [dialogBox, overlayBox] = await Promise.all([
      dialog.boundingBox(),
      overlay.boundingBox(),
    ]);

    expect(dialogBox).not.toBeNull();
    expect(overlayBox).not.toBeNull();
    expect(overlayBox!.y).toBe(0);
    expect(overlayBox!.height).toBe(viewport.height);
    expect(dialogBox!.y).toBeGreaterThanOrEqual(16);
    expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(viewport.height - 16);
  });
}
