const { test, expect } = require('@playwright/test');

test('営業タイプ診断に20問回答するとコンサルの結果が表示される', async ({ page, context }) => {
  await context.route('**/*', route => {
    return new URL(route.request().url()).origin === 'http://127.0.0.1:4173'
      ? route.continue()
      : route.abort('blockedbyclient');
  });
  await page.goto('/');
  await page.getByRole('button', { name: '無料で診断してAIアシスタントを設定', exact: true }).click();
  const answers = page.locator('#questions select.typeq');
  await expect(answers).toHaveCount(20);
  await expect(page.locator('#typeResult')).toContainText('回答後に診断結果が表示されます。');
  for (let i = 0; i < 20; i++) {
    await answers.nth(i).selectOption(i >= 3 && i <= 5 ? '5' : '1');
  }
  await page.getByRole('button', { name: '診断する', exact: true }).click();
  await expect(page.locator('#salesTypeLayout')).toHaveClass(/diagnosis-complete/);
  await expect(page.locator('#salesTypeResultPanel')).toBeVisible();
  await expect(page.locator('#typeResult')).toContainText('顧客の話を深く聞き、本当に困っていることを見つけるタイプ。');
  await expect(page.locator('#typeResult .type-name')).toHaveText('コンサル');
  await expect(page.locator('#typeResult .type-name')).toBeVisible();
  await expect(page.locator('#typeRestart')).toBeVisible();
});
