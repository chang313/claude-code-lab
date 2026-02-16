import { test, expect } from "@playwright/test";

test.describe("Browse by Menu (US4)", () => {
  test("should show empty state when no menu items exist", async ({
    page,
  }) => {
    await page.goto("/by-menu");
    await expect(page.getByText("By Menu")).toBeVisible();
    await expect(page.getByText("No menu items saved yet")).toBeVisible();
  });

  test("should show menu groups after adding menu items", async ({ page }) => {
    // Setup: add restaurant with menu item
    await page.goto("/search");
    await page.getByPlaceholder("Search restaurants...").fill("Korean BBQ");
    await page.waitForTimeout(500);
    await page
      .getByRole("button", { name: /add to wishlist/i })
      .first()
      .click();

    await page.getByRole("link", { name: /wishlist/i }).click();
    await page.locator('[data-testid="restaurant-card"]').first().click();

    // Add menu item
    await page.getByPlaceholder("Add a menu item...").fill("Kimchi Jjigae");
    await page.getByRole("button", { name: "Add" }).click();

    // Navigate to By Menu page
    await page.getByRole("link", { name: /by menu/i }).click();
    await expect(page).toHaveURL("/by-menu");

    // Should see the menu group
    await expect(page.getByText("kimchi jjigae")).toBeVisible();
    await expect(page.getByText("1 restaurant")).toBeVisible();
  });

  test("should drill into menu group to see restaurants", async ({ page }) => {
    // Setup: add restaurant with menu item
    await page.goto("/search");
    await page.getByPlaceholder("Search restaurants...").fill("Korean BBQ");
    await page.waitForTimeout(500);
    await page
      .getByRole("button", { name: /add to wishlist/i })
      .first()
      .click();

    await page.getByRole("link", { name: /wishlist/i }).click();
    await page.locator('[data-testid="restaurant-card"]').first().click();

    await page.getByPlaceholder("Add a menu item...").fill("Bulgogi");
    await page.getByRole("button", { name: "Add" }).click();

    // Navigate to By Menu
    await page.getByRole("link", { name: /by menu/i }).click();

    // Click on the menu group
    await page.getByText("bulgogi").click();

    // Should see restaurants for this menu
    await expect(page.getByText("1 restaurant")).toBeVisible();
  });
});
