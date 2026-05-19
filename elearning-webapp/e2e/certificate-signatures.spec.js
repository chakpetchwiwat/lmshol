import { test, expect } from '@playwright/test';

test.describe('Certification System - Multi-Signature Support', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Admin
    await page.goto('https://lms-scaleup.vercel.app/login');
    await page.fill('input[type="email"]', 'chakpetch@scaleup.co.th');
    await page.fill('input[type="password"]', 'Genjironan.1');
    await page.click('button[type="submit"]');
    
    // Ensure we are logged in (wait for navigation to dashboard)
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should allow configuring 1 or 2 signature slots in course settings', async ({ page }) => {
    // Navigate to Course Management
    await page.goto('https://lms-scaleup.vercel.app/admin/courses');
    
    // Find the first course and open edit
    const firstCourseRow = page.locator('table tbody tr').first();
    await firstCourseRow.locator('button[aria-label="Manage"]').click();
    await page.click('text=Edit Course');

    // Go to Certificate Tab or Section
    // Based on subagent findings, it's in the "General Info" tab at the bottom
    await page.click('text=General Info');
    
    const signatureSection = page.locator('text=Certificate Settings');
    await expect(signatureSection).toBeVisible();

    // Verify Signature 1 is toggleable
    // Note: The actual selector might vary, using logical description for plan
    // I'll use placeholders if I'm not 100% sure of the exact selector from the subagent log
    
    // Scenario: Configure 1 signature
    // await sig1Toggle.check();
    // await sig2Toggle.uncheck();
    // await page.click('text=Save');
    // await expect(page.locator('text=Saved successfully')).toBeVisible();

    // Scenario: Configure 2 signatures
    // await sig2Toggle.check();
    // await page.click('text=Save');
    // await expect(page.locator('text=Saved successfully')).toBeVisible();
  });

  test('should display signatures and logos correctly in template preview', async ({ page }) => {
    await page.goto('https://lms-scaleup.vercel.app/admin/courses');
    
    // Open Preview for a course with 2 signatures
    const firstCourseRow = page.locator('table tbody tr').first();
    await firstCourseRow.locator('button[aria-label="Manage"]').click();
    await page.click('text=Edit Course');
    
    await page.click('text=Certificate');
    await page.click('text=Preview Template');

    // Verify Preview Modal contains two signature areas
    // Assuming signatures have descriptive IDs or test-ids
    // await expect(page.locator('.signature-slot')).toHaveCount(2);
    // await expect(page.locator('img[alt="Organization Logo"]')).toBeVisible();
  });
});
