import { test, expect } from '@playwright/test';

test.describe('문서 왕복 시나리오', () => {
  test.beforeEach(async ({ page }) => {
    // IndexedDB + localStorage 초기화 후 앱 로드 — 테스트 간 상태 누수 방지.
    await page.goto('/');
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('mdpro');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
      localStorage.clear();
    });
  });

  test('새 문서 → 편집 → 제목 자동 추출 → 전환 → 삭제', async ({ page }) => {
    await page.reload();
    await expect(page.getByRole('heading', { name: 'MDPro' })).toBeVisible();

    // 초기 활성 문서의 제목 input
    const titleInput = page.getByRole('textbox', { name: '문서 제목' });
    await expect(titleInput).toBeVisible();

    // 사이드바에서 새 문서 버튼 클릭
    await page.getByRole('button', { name: '새 문서', exact: true }).click();

    // 에디터에 내용 입력 (CodeMirror content)
    const editor = page.getByRole('textbox', { name: '마크다운 편집기' });
    await editor.click();
    // 기본 템플릿이 들어있으므로 Ctrl+A로 전체 선택 후 덮어쓰기
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('# 자동 추출된 제목\n\n본문입니다.');

    // 자동 추출: 제목 input이 "자동 추출된 제목"이 되어야 함 (debounce 대기)
    await expect(titleInput).toHaveValue('자동 추출된 제목', { timeout: 3000 });

    // 한 번 더 새 문서 만들고 사이드바에서 이전 문서로 전환
    await page.getByRole('button', { name: '새 문서', exact: true }).click();
    await page.getByRole('button', { name: '자동 추출된 제목', exact: true }).click();
    await expect(titleInput).toHaveValue('자동 추출된 제목');

    // 삭제 버튼 hover/focus 후 클릭 → 확인 모달 → 삭제
    const deleteBtn = page.getByRole('button', { name: '자동 추출된 제목 삭제' });
    await deleteBtn.focus();
    await deleteBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: '삭제' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('button', { name: '자동 추출된 제목', exact: true })).toHaveCount(0);
  });

  test('내보내기(.md) — 다운로드 이벤트 발생', async ({ page }) => {
    await page.reload();
    await page.getByRole('textbox', { name: '문서 제목' }).fill('테스트 문서');

    // 다운로드 이벤트 대기 시작
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '파일 메뉴' }).click();
    await page.getByRole('menuitem', { name: '내보내기 (.md)' }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.md$/);
  });

  test('내보내기(.html) — 다운로드 이벤트 발생', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('textbox', { name: '문서 제목' }).fill('HTML 테스트');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '파일 메뉴' }).click();
    await page.getByRole('menuitem', { name: '내보내기 (.html)' }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.html$/);
  });
});
