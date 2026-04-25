import { test, expect } from '@playwright/test';

test.describe('Navigation and Layout', () => {
  test('unauthenticated users should be redirected to login', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/login/);
    
    await page.goto('/user/home');
    await expect(page).toHaveURL(/\/login/);
  });
});
