import { test, expect } from "@playwright/test";

test.describe("Menu Items (US3)", () => {
  test("should add and view menu items on restaurant detail", async ({
    page,
  }) => {
    // First add a restaurant via search
    await page.goto("/search");
    await page.getByPlaceholder("Search restaurants...").fill("Korean BBQ");
    await page.waitForTimeout(500);
    await page
      .getByRole("button", { name: /add to wishlist/i })
      .first()
      .click();

    // Go to wishlist and open restaurant detail
    await page.getByRole("link", { name: /wishlist/i }).click();
    await page.locator('[data-testid="restaurant-card"]').first().click();

    // Should see menu items section
    await expect(page.getByText("Menu Items")).toBeVisible();
    await expect(page.getByPlaceholder("Add a menu item...")).toBeVisible();

    // Add a menu item
    await page.getByPlaceholder("Add a menu item...").fill("Bibimbap");
    await page.getByRole("button", { name: "Add" }).click();

    // Should see the menu item listed
    await expect(page.getByText("Bibimbap")).toBeVisible();
  });

  test("should delete a menu item", async ({ page }) => {
    // Setup: add restaurant and menu item
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
    await page.getByPlaceholder("Add a menu item...").fill("Tteokbokki");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText("Tteokbokki")).toBeVisible();

    // Delete it
    await page.getByRole("button", { name: /remove tteokbokki/i }).click();
    await expect(page.getByText("Tteokbokki")).not.toBeVisible();
  });

  test("should remove restaurant and cascade delete menu items", async ({
    page,
  }) => {
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
    await page.getByPlaceholder("Add a menu item...").fill("Japchae");
    await page.getByRole("button", { name: "Add" }).click();

    // Remove restaurant
    await page.getByRole("button", { name: /remove from wishlist/i }).click();

    // Should redirect to home with empty state
    await expect(page).toHaveURL("/");
    await expect(page.getByText("No restaurants saved yet")).toBeVisible();
  });
});
