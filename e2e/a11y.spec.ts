import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('접근성 감사', () => {
  test('앱 초기 상태 WCAG AA 위반 없음', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'MDPro' })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('파일 메뉴 열린 상태에서도 위반 없음', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '파일 메뉴' }).click();
    await expect(page.getByRole('menu')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
});
