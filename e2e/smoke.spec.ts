import { test, expect } from '@playwright/test';

test('앱 최초 로드 스모크', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'mdONE' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Roomi 마스코트' })).toBeVisible();
});
