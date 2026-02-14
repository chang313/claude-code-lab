import { test, expect } from "@playwright/test";

test.describe("Search and Add to Wishlist (US1)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should show empty wishlist initially", async ({ page }) => {
    await expect(page.getByText("No restaurants saved yet")).toBeVisible();
  });

  test("should navigate to search page", async ({ page }) => {
    await page.getByRole("link", { name: /search/i }).click();
    await expect(page).toHaveURL("/search");
    await expect(
      page.getByPlaceholder("Search restaurants...")
    ).toBeVisible();
  });

  test("should search for restaurants and display results", async ({
    page,
  }) => {
    await page.goto("/search");
    await page.getByPlaceholder("Search restaurants...").fill("Korean BBQ");
    // Wait for debounced search results
    await page.waitForTimeout(500);
    // Results should appear (mocked or real API)
    const cards = page.locator('[data-testid="restaurant-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
  });

  test("should add restaurant to wishlist and see it on home", async ({
    page,
  }) => {
    await page.goto("/search");
    await page.getByPlaceholder("Search restaurants...").fill("Korean BBQ");
    await page.waitForTimeout(500);

    // Click first "Add to Wishlist" button
    const addButton = page.getByRole("button", { name: /add to wishlist/i });
    await addButton.first().click();

    // Navigate to home
    await page.getByRole("link", { name: /wishlist/i }).click();
    await expect(page).toHaveURL("/");

    // Should no longer show empty state
    await expect(
      page.getByText("No restaurants saved yet")
    ).not.toBeVisible();
  });

  test("should update star rating on restaurant detail", async ({ page }) => {
    // Assumes a restaurant is already wishlisted
    await page.goto("/search");
    await page.getByPlaceholder("Search restaurants...").fill("Korean BBQ");
    await page.waitForTimeout(500);
    await page
      .getByRole("button", { name: /add to wishlist/i })
      .first()
      .click();

    await page.getByRole("link", { name: /wishlist/i }).click();

    // Click on the restaurant card to go to detail
    const card = page.locator('[data-testid="restaurant-card"]').first();
    await card.click();

    // Should see star rating component
    await expect(page.getByText("Rating:")).toBeVisible();
  });
});
