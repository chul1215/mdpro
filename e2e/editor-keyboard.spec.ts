import { expect, test } from '@playwright/test';

test('Tab으로 들여쓰고 Enter와 Backspace로 빈 목록 단계를 빠져나온다', async ({ page }) => {
  await page.goto('/');
  const editor = page.locator('.cm-content');
  await editor.click();

  await page.keyboard.press('Control+A');
  await page.keyboard.insertText('첫 줄\n둘째 줄');
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Tab');
  await expect(page.locator('.cm-line')).toHaveText(['  첫 줄', '  둘째 줄']);

  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.cm-line')).toHaveText(['첫 줄', '둘째 줄']);

  await page.keyboard.press('Control+A');
  await page.keyboard.insertText('- 상위\n  - 하위');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(page.locator('.cm-line')).toHaveText(['- 상위', '  - 하위', '- ']);

  await page.keyboard.press('Backspace');
  await expect(page.locator('.cm-line')).toHaveText(['- 상위', '  - 하위', '']);
});