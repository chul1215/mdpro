import { test, expect } from '@playwright/test';

test('앱 최초 로드 스모크', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'MDPro' })).toBeVisible();
});
