import { expect, test } from '@playwright/test';

test.describe('Paperkit Playground & Board Interactions', () => {
  test('boots playground and renders initial papers', async ({ page }) => {
    await page.goto('/');

    // Check title and brand
    await expect(page.locator('text=Paperkit')).toBeVisible();

    // Check that papers are mounted in DOM
    const papers = page.locator('.paperkit-paper');
    await expect(papers).toHaveCount(3);
  });

  test('adds sample receipt paper when clicked', async ({ page }) => {
    await page.goto('/');

    const initialCount = await page.locator('.paperkit-paper').count();
    await page.click('button:has-text("+ Receipt")');

    await expect(page.locator('.paperkit-paper')).toHaveCount(initialCount + 1);
  });

  test('double clicking a paper flips it', async ({ page }) => {
    await page.goto('/');

    const firstPaper = page.locator('.paperkit-paper').first();
    await expect(firstPaper).not.toHaveClass(/paperkit-flipped/);

    // Double click to flip
    await firstPaper.dblclick({ position: { x: 50, y: 50 } });
    await expect(firstPaper).toHaveClass(/paperkit-flipped/);
  });

  test('dragging a paper translates its position', async ({ page }) => {
    await page.goto('/');

    const paper = page.locator('.paperkit-paper').first();
    const boxBefore = await paper.boundingBox();
    expect(boxBefore).not.toBeNull();

    // Drag paper 80px to the right and 50px down
    await page.mouse.move(boxBefore!.x + 50, boxBefore!.y + 50);
    await page.mouse.down();
    await page.mouse.move(boxBefore!.x + 130, boxBefore!.y + 100, { steps: 5 });
    await page.mouse.up();

    const boxAfter = await paper.boundingBox();
    expect(boxAfter!.x).toBeGreaterThan(boxBefore!.x);
    expect(boxAfter!.y).toBeGreaterThan(boxBefore!.y);
  });

  test('opens and closes Book View', async ({ page }) => {
    await page.goto('/');

    await page.click('button:has-text("Book View")');
    await expect(page.locator('text=BOOK PREVIEW')).toBeVisible();

    await page.click('button:has-text("Exit Book Mode")');
    await expect(page.locator('text=BOOK PREVIEW')).not.toBeVisible();
  });

  test('exports lossless JSON layout', async ({ page }) => {
    await page.goto('/');

    await page.click('button:has-text("JSON")');
    await expect(page.locator('text=Serialized Board JSON')).toBeVisible();

    const textarea = page.locator('textarea');
    const val = await textarea.inputValue();
    const parsed = JSON.parse(val);
    expect(parsed.version).toBe(1);
    expect(Array.isArray(parsed.papers)).toBe(true);
    expect(parsed.papers.length).toBeGreaterThanOrEqual(3);
  });
});
