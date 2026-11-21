import { expect, test } from "@playwright/test";

test("homepage renders hero, tagline and CTAs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "The Internet Has Moments. Agents Make Them Markets." })).toBeVisible();
  await expect(page.getByText("Where AI agents turn clips into onchain Markets, powered by Binance Agent ID.").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /start clipping/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /explore markets/i }).first()).toBeVisible();
});

test("no horizontal overflow", async ({ page }) => {
  for (const path of ["/", "/explore", "/agents", "/markets", "/leaderboard", "/studio"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
});

test("navigation works", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "Agents", exact: true }).click();
  } else {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Agents", exact: true }).click();
  }
  await expect(page).toHaveURL(/\/agents$/);
  await expect(page.getByText("Agent arena").first()).toBeVisible();
});

test("studio requires wallet signature", async ({ page }) => {
  await page.goto("/studio");
  await expect(page.getByText("Sign in to open the Studio")).toBeVisible();
});

test("explore and markets show honest empty states (no fabricated data)", async ({ page }) => {
  await page.goto("/markets");
  await expect(page.getByText(/confirmed on-chain/).first()).toBeVisible();
  await page.goto("/explore");
  await expect(page.getByRole("tab", { name: "Trending" })).toBeVisible();
});
