import { test, expect, type Locator } from '@playwright/test';

type Rect = { x: number; y: number; width: number; height: number };

function intersects(a: Rect, b: Rect, tolerance = 0): boolean {
  return (
    a.x + a.width > b.x + tolerance &&
    b.x + b.width > a.x + tolerance &&
    a.y + a.height > b.y + tolerance &&
    b.y + b.height > a.y + tolerance
  );
}

async function visibleBoxes(locators: Locator[]) {
  const boxes: Rect[] = [];
  for (const item of locators) {
    if (!(await item.isVisible())) continue;
    const box = await item.boundingBox();
    if (box) boxes.push(box);
  }
  return boxes;
}

// 모바일 뷰포트에서 주요 레이아웃이 정상 렌더되는지 확인한다.
// 정밀한 터치 제스처는 수동 영역이지만, 기본 반응형 + a11y는 자동으로 검증한다.
test.describe('모바일 뷰포트 스모크 (375x812)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('앱 로드 및 핵심 UI 접근 가능', async ({ page }) => {
    await page.goto('/');
    // 모바일에서 mdONE 로고는 md 미만 뷰포트에서 숨김(hidden md:flex). 다른 앵커로 확인.
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

test.describe('좁은 화면 레이아웃 충돌 방지', () => {
  for (const width of [320, 375, 430]) {
    test(`TopBar/Toolbar 컨트롤이 ${width}px 폭에서 겹치지 않음`, async ({ page }) => {
      await page.setViewportSize({ width, height: 812 });
      await page.goto('/');

      const banner = page.getByRole('banner');
      const toolbar = page.getByRole('toolbar', { name: '서식 도구' });
      await expect(banner).toBeVisible();
      await expect(toolbar).toBeVisible();

      const bannerBox = await banner.boundingBox();
      const toolbarBox = await toolbar.boundingBox();
      expect(bannerBox).not.toBeNull();
      expect(toolbarBox).not.toBeNull();
      expect(toolbarBox!.y).toBeGreaterThanOrEqual(bannerBox!.y + bannerBox!.height - 1);

      const controls = await visibleBoxes([
        page.getByRole('button', { name: '사이드바 토글' }),
        page.getByRole('textbox', { name: '문서 제목' }),
        page.getByRole('radio', { name: '편집만' }),
        page.getByRole('radio', { name: '분할' }),
        page.getByRole('radio', { name: '프리뷰만' }),
        page.getByRole('button', { name: '파일 메뉴' }),
        page.getByRole('button', { name: /모드로 전환/ }),
      ]);
      for (let i = 0; i < controls.length; i += 1) {
        for (let j = i + 1; j < controls.length; j += 1) {
          expect(intersects(controls[i], controls[j], 1)).toBe(false);
        }
      }
    });
  }

  test('모바일 사이드바는 TopBar와 Toolbar를 덮지 않음', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 812 });
    await page.goto('/');

    const banner = page.getByRole('banner');
    const toolbar = page.getByRole('toolbar', { name: '서식 도구' });
    const sidebar = page.getByRole('navigation', { name: '문서 목록' });

    await expect(sidebar).toBeHidden();
    await page.getByRole('button', { name: '사이드바 토글' }).click();
    await expect(sidebar).toBeVisible();
    const bannerBox = await banner.boundingBox();
    const toolbarBox = await toolbar.boundingBox();
    const sidebarBox = await sidebar.boundingBox();
    expect(bannerBox).not.toBeNull();
    expect(toolbarBox).not.toBeNull();
    expect(sidebarBox).not.toBeNull();

    expect(intersects(sidebarBox!, bannerBox!, 1)).toBe(false);
    expect(intersects(sidebarBox!, toolbarBox!, 1)).toBe(false);
    expect(sidebarBox!.y).toBeGreaterThanOrEqual(toolbarBox!.y + toolbarBox!.height - 1);
    expect(sidebarBox!.y + sidebarBox!.height).toBeLessThanOrEqual(813);
  });
});

test.describe('태블릿 뷰포트 스모크', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('md 분기 경계에서 레이아웃 정상', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'mdONE' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: '문서 목록' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: '문서 제목' })).toBeVisible();
  });
});
