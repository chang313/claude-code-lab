import { test, expect } from "@playwright/test";

test.describe("Map Discovery (US2)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/map");
  });

  test("should display map page with title", async ({ page }) => {
    await expect(page.getByText("Discover on Map")).toBeVisible();
  });

  test("should render Kakao Map container", async ({ page }) => {
    const mapContainer = page.locator("#kakao-map");
    await expect(mapContainer).toBeVisible();
  });

  test("should show restaurant card when marker is clicked", async ({
    page,
  }) => {
    // Wait for map to load and markers to appear
    await page.waitForTimeout(2000);

    // If markers exist, clicking one should show a card popup
    const markers = page.locator(".kakao-marker");
    if ((await markers.count()) > 0) {
      await markers.first().click();
      await expect(
        page.locator('[data-testid="restaurant-card"]')
      ).toBeVisible();
    }
  });
});
