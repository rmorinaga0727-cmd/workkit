const { test, expect } = require('@playwright/test');

test('トップページの主要コンテンツが表示され、JavaScript例外がない', async ({ page, context }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // 外部サイトへの通信はすべて遮断する。
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.origin === 'http://127.0.0.1:4173'
      ? route.continue()
      : route.abort('blockedbyclient');
  });
  const response = await page.goto('/', { waitUntil: 'load' });
  expect(response.status()).toBe(200);
  await expect(page).toHaveTitle(/WORKKIT/);
  await expect(page.locator('.site-header .brand')).toBeVisible();
  await expect(page.locator('.site-header .brand')).toContainText('WORKKIT');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('AI営業アシスタント。');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: '営業の仕事に使えるツール', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '営業リスト作成代行', exact: true })).toBeVisible();
  expect(errors, 'ページ表示中の未処理JavaScript例外').toEqual([]);
});
