import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function enableGameBoyTheme(page: import('@playwright/test').Page) {
  for (const label of ['다크 모드로 전환', '게임보이 모드로 전환']) {
    const desktopButton = page.getByRole('button', { name: label }).last();
    if (await desktopButton.isVisible()) {
      await desktopButton.click();
    } else {
      await page.getByRole('button', { name: '모바일 더보기 메뉴' }).click();
      await page.getByRole('menuitem', { name: label }).click();
    }
  }
  await expect(page.locator('html')).toHaveClass(/gameboy/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'gameboy');
}

function contrastRatio(a: string, b: string) {
  const rgb = (value: string) => value.match(/\d+(?:\.\d+)?/g)!.slice(0, 3).map(Number);
  const luminance = (value: string) => {
    const channels = rgb(value).map((channel) => {
      const normalized = channel / 255;
      return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

test.describe('Game Boy 테마', () => {
  test('persisted Game Boy를 첫 DOM 페인트 전에 적용하고 invalid 값은 안전하게 무시한다', async ({ page }) => {
    await page.addInitScript(() => {
      if (!localStorage.getItem('mdpro-ui')) {
        localStorage.setItem('mdpro-ui', JSON.stringify({ state: { theme: 'gameboy' }, version: 1 }));
      }
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveClass(/gameboy/);

    await page.evaluate(() => localStorage.setItem('mdpro-ui', JSON.stringify({ state: { theme: 'system' }, version: 1 })));
    await page.reload();
    await expect(page.getByRole('heading', { name: 'mdONE' })).toBeVisible();
    await expect(page.getByRole('button', { name: /모드로 전환/ }).last()).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/gameboy/);
  });

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

  test('Game Boy 모바일 메뉴와 문서 보내기 모달의 글자가 배경과 구분된다', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 812 });
    await page.goto('/');
    await enableGameBoyTheme(page);

    await page.getByRole('button', { name: '모바일 더보기 메뉴' }).click();
    const menu = page.getByRole('menu', { name: '모바일 작업 메뉴' });
    const menuBox = await menu.boundingBox();
    expect(menuBox).not.toBeNull();
    expect(menuBox!.x).toBeGreaterThanOrEqual(8);
    expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(312);
    const menuColors = await menu.locator('button').evaluateAll((buttons) => buttons.map((button) => ({
      foreground: getComputedStyle(button).color,
      background: getComputedStyle(button.closest('[role="menu"]')!).backgroundColor,
    })));
    expect(menuColors.every(({ foreground, background }) => contrastRatio(foreground, background) >= 4.5)).toBe(true);

    const trigger = page.getByRole('button', { name: '모바일 더보기 메뉴' });
    await trigger.click();
    await page.setViewportSize({ width: 430, height: 812 });
    await trigger.click();
    const wideMenuBox = await menu.boundingBox();
    expect(wideMenuBox).not.toBeNull();
    expect(wideMenuBox!.x).toBeGreaterThanOrEqual(8);
    expect(wideMenuBox!.x + wideMenuBox!.width).toBeLessThanOrEqual(422);
    await trigger.click();
    await page.setViewportSize({ width: 320, height: 812 });
    await trigger.click();

    await menu.getByRole('menuitem', { name: '문서 보내기' }).click();
    const dialog = page.getByRole('dialog', { name: '문서 보내기' });
    const dialogColors = await dialog.locator('h2, p, button').evaluateAll((elements) => elements.map((element) => ({
      foreground: getComputedStyle(element).color,
      background: getComputedStyle(element.closest('[role="dialog"]')!).backgroundColor,
    })));
    expect(dialogColors.every(({ foreground, background }) => contrastRatio(foreground, background) >= 4.5)).toBe(true);

    const inputColors = await dialog.evaluate((element) => {
      const input = document.createElement('input');
      input.placeholder = 'friend@gmail.com';
      element.append(input);
      const background = getComputedStyle(element).backgroundColor;
      return {
        text: getComputedStyle(input).color,
        placeholder: getComputedStyle(input, '::placeholder').color,
        background,
      };
    });
    expect(contrastRatio(inputColors.text, inputColors.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(inputColors.placeholder, inputColors.background)).toBeGreaterThanOrEqual(4.5);
  });

  test('Game Boy 테마가 WCAG AA 자동 감사에 통과한다', async ({ page }) => {
    await page.goto('/');
    await enableGameBoyTheme(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('코드, placeholder, active gutter가 4.5:1 이상이고 focus ring이 밝게 보인다', async ({ page }) => {
    await page.goto('/');
    await enableGameBoyTheme(page);
    await page.locator('.cm-content').click();
    await expect(page.locator('.cm-activeLineGutter')).toBeVisible();
    await expect(page.locator('input[aria-label="문서 제목"]')).toBeVisible();
    const styles = await page.evaluate(() => {
      const inlineCode = document.querySelector('.prose code:not(pre code)') ?? (() => {
        const node = document.createElement('code');
        node.textContent = 'inline';
        document.querySelector('.prose')!.append(node);
        return node;
      })();
      const title = document.querySelector<HTMLInputElement>('input[aria-label="문서 제목"]')!;
      title.focus();
      const gutter = document.querySelector('.cm-activeLineGutter')!;
      const code = getComputedStyle(inlineCode);
      const placeholder = getComputedStyle(title, '::placeholder');
      const gutterStyle = getComputedStyle(gutter);
      const focus = getComputedStyle(title);
      return {
        codeFg: code.color, codeBg: code.backgroundColor,
        placeholderFg: placeholder.color, placeholderOpacity: placeholder.opacity,
        placeholderBg: getComputedStyle(title).backgroundColor,
        gutterFg: gutterStyle.color, gutterBg: gutterStyle.backgroundColor,
        outline: focus.outlineColor,
      };
    });
    expect(contrastRatio(styles.codeFg, styles.codeBg)).toBeGreaterThanOrEqual(4.5);
    expect(Number(styles.placeholderOpacity)).toBe(1);
    expect(contrastRatio(styles.placeholderFg, styles.placeholderBg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(styles.gutterFg, styles.gutterBg)).toBeGreaterThanOrEqual(4.5);
    expect(styles.outline).toBe('rgb(155, 188, 15)');
  });

  test('highlight.js의 모든 언어 토큰이 LCD 코드 배경에서 읽힌다', async ({ page }) => {
    await page.goto('/');
    await enableGameBoyTheme(page);
    const editor = page.locator('.cm-content');
    await editor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('```js\nconsole.log("LCD");\n```');
    await page.getByRole('radio', { name: '프리뷰만' }).click();
    const code = page.locator('.prose pre code[class*="language-"]');
    await expect(code).toBeVisible();
    const tokenColors = await code.locator('*').evaluateAll((tokens) => tokens.map((token) => ({
      foreground: getComputedStyle(token).color,
      background: getComputedStyle(token.closest('pre')!).backgroundColor,
    })));
    expect(tokenColors.length).toBeGreaterThan(0);
    expect(tokenColors.every(({ foreground, background }) => contrastRatio(foreground, background) >= 4.5)).toBe(true);
  });

  test('390px sidebar tabs fit, remain readable, and have 44px touch targets', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await enableGameBoyTheme(page);
    await page.getByRole('button', { name: '사이드바 토글' }).click();
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(4);
    const metrics = await tabs.evaluateAll((nodes) => nodes.map((node) => {
      const el = node as HTMLElement;
      return { height: el.getBoundingClientRect().height, clipped: el.scrollWidth > el.clientWidth };
    }));
    expect(metrics.every(({ height, clipped }) => height >= 44 && !clipped)).toBe(true);
    const tablist = page.getByRole('tablist');
    expect(await tablist.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  });

  test('destructive dialog CTA text remains visible against its background', async ({ page }) => {
    await page.goto('/');
    await enableGameBoyTheme(page);
    const deleteButton = page.getByRole('button', { name: /삭제$/ }).first();
    await deleteButton.focus();
    await deleteButton.click();
    const confirm = page.getByRole('dialog').getByRole('button', { name: '삭제' });
    const colors = await confirm.evaluate((element) => {
      const style = getComputedStyle(element);
      return { foreground: style.color, background: style.backgroundColor };
    });
    expect(contrastRatio(colors.foreground, colors.background)).toBeGreaterThanOrEqual(4.5);
  });

  test('theme transition restores Mermaid source HTML and rerenders the SVG', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('.cm-content');
    await editor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('```mermaid\ngraph TD\nA-->B\n```');
    await page.getByRole('radio', { name: '프리뷰만' }).click();
    const diagram = page.locator('.mermaid-diagram svg');
    await expect(diagram).toBeVisible();
    const lightSvg = await diagram.evaluate((node) => node.outerHTML);

    await page.getByRole('button', { name: '다크 모드로 전환' }).click();
    await expect(diagram).toBeVisible();
    await expect.poll(() => diagram.evaluate((node) => node.outerHTML)).not.toBe(lightSvg);
    const darkSvg = await diagram.evaluate((node) => node.outerHTML);

    await page.getByRole('button', { name: '게임보이 모드로 전환' }).click();
    await expect(diagram).toBeVisible();
    await expect.poll(() => diagram.evaluate((node) => node.outerHTML)).not.toBe(darkSvg);
  });
});
