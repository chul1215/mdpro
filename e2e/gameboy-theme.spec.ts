import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function enableGameBoyTheme(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '다크 모드로 전환' }).click();
  await page.getByRole('button', { name: '게임보이 모드로 전환' }).click();
  await expect(page.locator('html')).toHaveClass(/gameboy/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'gameboy');
}

test.describe('Game Boy 테마', () => {
  test('LCD 팔레트와 굴림 본문 폰트를 적용하고 새로고침 후 유지한다', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'mdONE' })).toBeVisible();
    await enableGameBoyTheme(page);

    const renderedTheme = await page.evaluate(async () => {
      const body = getComputedStyle(document.body);
      const header = getComputedStyle(document.querySelector('header')!);
      const editor = getComputedStyle(document.querySelector('.cm-editor')!);
      const editorScroller = getComputedStyle(document.querySelector('.cm-scroller')!);
      const preview = getComputedStyle(document.querySelector('.prose')!);
      return {
        bodyFont: body.fontFamily,
        editorFont: editorScroller.fontFamily,
        previewFont: preview.fontFamily,
        bodyBackground: body.backgroundColor,
        headerBackground: header.backgroundColor,
        editorBackground: editor.backgroundColor,
      };
    });

    expect(renderedTheme.bodyFont).toContain('Gulim');
    expect(renderedTheme.editorFont).toContain('Gulim');
    expect(renderedTheme.previewFont).toContain('Gulim');
    expect(renderedTheme.bodyBackground).toBe('rgb(139, 172, 15)');
    expect(renderedTheme.headerBackground).toBe('rgb(15, 56, 15)');
    expect(renderedTheme.editorBackground).toBe('rgb(155, 188, 15)');

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/gameboy/);
    await expect(page.getByRole('button', { name: '라이트 모드로 전환' })).toBeVisible();
  });

  test('모바일 메뉴에서도 Game Boy 테마를 선택할 수 있다', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await page.getByRole('button', { name: '모바일 더보기 메뉴' }).click();
    await page.getByRole('menuitem', { name: '다크 모드로 전환' }).click();
    await page.getByRole('button', { name: '모바일 더보기 메뉴' }).click();
    await page.getByRole('menuitem', { name: '게임보이 모드로 전환' }).click();

    await expect(page.locator('html')).toHaveClass(/gameboy/);
    await expect(page.getByRole('button', { name: '모바일 더보기 메뉴' })).toBeVisible();
  });

  test('Game Boy 테마가 WCAG AA 자동 감사에 통과한다', async ({ page }) => {
    await page.goto('/');
    await enableGameBoyTheme(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
});
