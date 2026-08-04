import { expect, test, type Page } from "@playwright/test";

async function openReadyWorld(page: Page) {
  await page.goto("/");
  await expect(page.locator(".molecular-canvas")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator('[aria-live="polite"]')).toContainText(/2 atoms/, {
    timeout: 15_000,
  });
}

test("populated first paint exposes four modes and direct manipulation", async ({ page }) => {
  await openReadyWorld(page);
  for (const mode of ["Make a bond", "Break a bond", "Ignite", "Free play"]) {
    await expect(page.getByRole("button", { name: mode, exact: true })).toBeVisible();
  }

  const canvas = page.locator(".molecular-canvas");
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  // The Make preset starts its two H atoms at world x = -9 and +9.
  await page.mouse.move(bounds!.x + bounds!.width / 2 - 9, bounds!.y + bounds!.height / 2);
  await page.mouse.down();
  await expect(page.locator('[aria-live="polite"]')).toContainText(/1 grabbed/, {
    timeout: 3_000,
  });
  await page.mouse.move(bounds!.x + bounds!.width / 2 - 150, bounds!.y + bounds!.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("system rail opens a causal atom-built photopolymer and an all-ingredients sandbox", async ({
  page,
}) => {
  await openReadyWorld(page);
  await page.getByRole("button", { name: "Photopolymer", exact: true }).click();
  await expect(page.getByRole("button", { name: "Expose resin", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Stretch cured", exact: true })).toBeVisible();
  await expect(page.getByRole("button", {
    name: "Add one acrylic acid monomer. Hold to add a stream.",
  })).toBeVisible();
  await expect(page.getByRole("button", {
    name: "Add one ethylene glycol diacrylate crosslinker. Hold to add a stream.",
  })).toBeVisible();
  await expect(page.getByRole("button", { name: "Place light" })).toBeVisible();
  await expect(page.locator('[aria-live="polite"]')).toContainText(/44 atoms/, {
    timeout: 4_000,
  });
  await page.getByRole("button", { name: "Reset this experience" }).click();
  await expect(page.locator('[aria-live="polite"]')).toContainText(/44 atoms/, {
    timeout: 4_000,
  });
  await page.getByRole("button", { name: "Place light" }).click();
  const canvas = page.locator(".molecular-canvas");
  const bounds = await canvas.boundingBox();
  await page.mouse.click(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
  await expect(page.locator('[aria-live="polite"]')).toContainText(
    /[1-9]\d* reactive sites|[1-9]\d* breaking|39 bonds|4\d bonds/,
    { timeout: 8_000 },
  );

  await page.getByRole("button", { name: "Everything", exact: true }).click();
  await expect(page.getByRole("button", {
    name: "Add one Water molecule. Hold to add a stream.",
  })).toBeVisible();
  await expect(page.getByRole("button", {
    name: "Add one ethylene glycol diacrylate crosslinker. Hold to add a stream.",
  })).toBeVisible();
  await expect(page.locator('[aria-live="polite"]')).toContainText(/22 atoms/, {
    timeout: 4_000,
  });
});

test("stretch experience turns a direct pull into visible polymer bond stress", async ({
  page,
}) => {
  await openReadyWorld(page);
  await page.getByRole("button", { name: "Photopolymer", exact: true }).click();
  await page.getByRole("button", { name: "Stretch cured", exact: true }).click();
  const canvas = page.locator(".molecular-canvas");
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  const centerX = bounds!.x + bounds!.width / 2;
  const centerY = bounds!.y + bounds!.height / 2;
  await page.mouse.move(centerX - 149, centerY - 10);
  await page.mouse.down();
  await page.mouse.move(centerX - 285, centerY, { steps: 18 });
  await expect(page.locator('[aria-live="polite"]')).toContainText(/1 grabbed/, {
    timeout: 3_000,
  });
  await expect(page.locator('[aria-live="polite"]')).toContainText(
    /[1-9]\d* stressed|[1-9]\d* breaking|1[0-4] bonds/,
    { timeout: 5_000 },
  );
  await page.mouse.up();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("spark placement starts visible ignition while temperature endpoints remain semantic", async ({
  page,
}) => {
  await openReadyWorld(page);
  await page.getByRole("button", { name: "Ignite", exact: true }).click();
  await page.getByRole("button", { name: "Place a spark" }).click();
  await expect(page.getByRole("button", { name: "Cancel spark placement" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const canvas = page.locator(".molecular-canvas");
  const bounds = await canvas.boundingBox();
  await page.mouse.click(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
  await expect(page.getByRole("button", { name: "Place a spark" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.locator('[aria-live="polite"]')).toContainText(
    /[1-9]\d* excited atoms|[1-9]\d* breaking/,
    { timeout: 5_000 },
  );

  const temperature = page.getByRole("slider", { name: "Temperature from cold to hot" });
  await temperature.fill("0");
  await expect(temperature).toHaveAttribute("aria-valuetext", "Cold");
  await temperature.fill("100");
  await expect(temperature).toHaveAttribute("aria-valuetext", "Hot");
});

test("piston dragging, keyboard controls, and keyboard ingredient insertion stay operable", async ({
  page,
}) => {
  await openReadyWorld(page);
  const canvas = page.locator(".molecular-canvas");
  const bounds = await canvas.boundingBox();
  const centerX = bounds!.x + bounds!.width / 2;
  const centerY = bounds!.y + bounds!.height / 2;
  await page.mouse.move(centerX + 320, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX + 210, centerY, { steps: 14 });
  await page.mouse.up();
  await expect(page.getByRole("alert")).toHaveCount(0);

  await canvas.focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Play simulation" })).toBeVisible();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Pause simulation" })).toBeVisible();
  await page.keyboard.press("s");
  await expect(page.getByRole("button", { name: "Cancel spark placement" })).toBeVisible();
  await page.keyboard.press("Escape");

  const addHydrogen = page.getByRole("button", {
    name: "Add one Hydrogen atom. Hold to add a stream.",
  });
  await addHydrogen.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('[aria-live="polite"]')).toContainText(/3 atoms/, {
    timeout: 4_000,
  });
});

test("mobile controls remain on-screen and reduced motion retains causal state", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openReadyWorld(page);
  const tray = page.locator(".ingredient-tray");
  const systems = page.locator(".system-switcher");
  const experiences = page.locator(".experiment-switcher");
  const temperature = page.locator(".temperature-control");
  const trayBounds = await tray.boundingBox();
  const systemsBounds = await systems.boundingBox();
  const experiencesBounds = await experiences.boundingBox();
  const temperatureBounds = await temperature.boundingBox();
  expect(trayBounds!.y + trayBounds!.height).toBeLessThanOrEqual(845);
  expect(systemsBounds!.x).toBeGreaterThanOrEqual(0);
  expect(systemsBounds!.x + systemsBounds!.width).toBeLessThanOrEqual(390);
  expect(experiencesBounds!.x).toBeGreaterThanOrEqual(0);
  expect(experiencesBounds!.x + experiencesBounds!.width).toBeLessThanOrEqual(390);
  expect(temperatureBounds!.x).toBeGreaterThanOrEqual(0);
  expect(temperatureBounds!.x + temperatureBounds!.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  await page.getByRole("button", { name: "Place a spark" }).click();
  await expect(page.getByRole("button", { name: "Cancel spark placement" })).toBeVisible();
});

test("crowded presentation lowers raster cost without stopping chemistry", async ({ page }) => {
  await openReadyWorld(page);
  const addWater = page.getByRole("button", {
    name: "Add one Water molecule. Hold to add a stream.",
  });
  for (let index = 0; index < 10; index += 1) await addWater.click();
  await expect(page.locator('[aria-live="polite"]')).toContainText(/32 atoms/, {
    timeout: 5_000,
  });
  await expect.poll(async () => page.locator(".molecular-canvas").evaluate((canvas) => {
    const element = canvas as HTMLCanvasElement;
    return element.width / element.getBoundingClientRect().width;
  })).toBeLessThanOrEqual(1.26);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pause simulation" })).toBeVisible();
});

for (const failure of ["blocked", "corrupt"] as const) {
  test(`${failure} Wasm leaves an explicit inert world`, async ({ page }) => {
    await page.route("**/engine/molecularsetup_engine.wasm", async (route) => {
      if (failure === "blocked") await route.abort("blockedbyclient");
      else {
        await route.fulfill({
          status: 200,
          contentType: "application/wasm",
          body: Buffer.from("not wasm"),
        });
      }
    });
    await page.goto("/");
    await expect(page.getByRole("alert")).toContainText(/world is stopped/i, {
      timeout: 10_000,
    });
    await expect(page.getByRole("button", { name: "Place a spark" })).toBeDisabled();
  });
}
