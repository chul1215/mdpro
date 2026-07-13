import { expect, test } from '@playwright/test';

const longMarkdown = Array.from(
  { length: 120 },
  (_, index) => `## 구간 ${index + 1}\n\n동기화 확인을 위한 충분히 긴 문단입니다.`,
).join('\n\n');

test('분할 모드에서 드래그 크기 조절과 양방향 스크롤 동기화가 동작한다', async ({
  page,
}) => {
  await page.goto('/');
  const editor = page.getByRole('textbox', { name: '마크다운 편집기' });
  await editor.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(longMarkdown);
  await expect(page.getByRole('heading', { name: '구간 120' })).toBeVisible();

  const separator = page.getByRole('separator', { name: '편집기와 프리뷰 크기 조절' });
  await expect(separator).toBeVisible();
  await expect(separator).toHaveAttribute('aria-valuenow', '50');

  const separatorBox = await separator.boundingBox();
  expect(separatorBox).not.toBeNull();
  await page.mouse.move(
    separatorBox!.x + separatorBox!.width / 2,
    separatorBox!.y + separatorBox!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(separatorBox!.x + 140, separatorBox!.y + separatorBox!.height / 2);
  await page.mouse.up();
  await expect(separator).not.toHaveAttribute('aria-valuenow', '50');

  const editorScroller = page.locator('.cm-scroller');
  const previewScroller = page.getByTestId('preview-scroll');
  await expect.poll(() => previewScroller.evaluate((element) => element.scrollHeight)).toBeGreaterThan(500);

  await editorScroller.evaluate((element) => {
    element.scrollTop = (element.scrollHeight - element.clientHeight) * 0.5;
    element.dispatchEvent(new Event('scroll'));
  });
  await expect
    .poll(() =>
      previewScroller.evaluate(
        (element) => element.scrollTop / (element.scrollHeight - element.clientHeight),
      ),
    )
    .toBeGreaterThan(0.45);

  await previewScroller.evaluate((element) => {
    element.scrollTop = (element.scrollHeight - element.clientHeight) * 0.25;
    element.dispatchEvent(new Event('scroll'));
  });
  await expect
    .poll(() =>
      editorScroller.evaluate(
        (element) => element.scrollTop / (element.scrollHeight - element.clientHeight),
      ),
    )
    .toBeGreaterThan(0.2);
});

test('모바일 분할 모드에서는 데스크톱용 좌우 리사이저를 숨긴다', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByRole('radio', { name: '분할' }).click();

  await expect(page.getByRole('region', { name: '에디터' })).toBeVisible();
  await expect(page.getByRole('region', { name: '프리뷰' })).toBeVisible();
  await expect(
    page.getByRole('separator', { name: '편집기와 프리뷰 크기 조절' }),
  ).toBeHidden();
});
