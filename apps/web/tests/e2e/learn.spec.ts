import { expect, test } from "@playwright/test";

const guide = "/learn/pstack";

test("serves distinct social previews with matching Open Graph and Twitter metadata", async ({
  page,
}) => {
  const imageUrls: string[] = [];
  for (const route of ["/learn", guide]) {
    await page.goto(route);
    const imageUrl = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(imageUrl).toBeTruthy();
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", imageUrl!);
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
      "content",
      /JuiceColored/,
    );
    const image = await page.request.get(imageUrl!);
    expect(image.ok()).toBe(true);
    expect(image.headers()["content-type"]).toContain("image/png");
    const png = await image.body();
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
    imageUrls.push(imageUrl!);
  }
  expect(imageUrls[0]).not.toBe(imageUrls[1]);
});

test("opens the first guide and returns to the learning index", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/learn");
  await expect(page).toHaveTitle("Learn | JuiceColored");
  await page.getByRole("link", { name: /Inside pstack/ }).click();
  await expect(page).toHaveURL(new RegExp(`${guide}$`));
  await expect(page.getByRole("region", { name: "Explore pstack" })).toBeVisible();
  await page.getByRole("button", { name: /\/architect Find/ }).click();
  await expect(page.locator(".skill-diagram h2")).toHaveText("Settle the shape before the code.");
  await page.getByRole("link", { name: "All guides" }).click();
  await expect(page).toHaveTitle("Learn | JuiceColored");
  expect(errors).toEqual([]);
});

test("reads original instructions and follows previews with mouse and keyboard", async ({
  page,
}) => {
  await page.goto(`${guide}#skill=poteto-mode&read=1`);
  const principle = page.locator('[data-reference="skill:principle-model-the-domain"]');
  await principle.hover();
  const preview = page.getByRole("dialog", { name: "Model The Domain preview" });
  await expect(preview).toContainText("Encode the real domain");
  await preview.getByRole("link", { name: "Read principle" }).click();
  await expect(page.locator(".markdown h1")).toHaveText("Model the Domain");
  const term = page.locator('[data-reference="term:state-machine"]');
  await term.focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Full definition" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(term).toBeFocused();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await term.press("Enter");
  await expect(page.locator(".glossary-definition h1")).toHaveText("State machine");
  await page.goBack();
  await page.getByRole("button", { name: "Raw Markdown" }).click();
  const response = await page.request.get(
    `${guide}/source/skills/principle-model-the-domain/SKILL.md`,
  );
  expect(response.ok()).toBe(true);
  expect(await page.locator(".raw-source").textContent()).toBe(await response.text());
  await expect(page.getByRole("link", { name: "Download original file" })).toHaveAttribute(
    "href",
    `${guide}/source/skills/principle-model-the-domain/SKILL.md`,
  );
});

test("filters the library and opens the full feature playbook", async ({ page }) => {
  await page.goto(`${guide}#view=library`);
  await page.getByRole("textbox", { name: "Search all skills" }).fill("no-such-skill-xyz");
  await expect(page.getByRole("heading", { name: "No skills match that search." })).toBeVisible();
  await page.getByRole("button", { name: "Reset search" }).click();
  await page.getByRole("button", { name: "Principles", exact: true }).click();
  await expect(page.locator(".skill-list-item")).toHaveCount(24);
  await page.getByRole("link", { name: "Playbooks", exact: true }).click();
  await expect(page.locator(".playbook-list > button")).toHaveCount(23);
  await page
    .locator(".playbook-list > button")
    .filter({ has: page.getByText("Feature", { exact: true }) })
    .click();
  await expect(
    page.locator(".markdown").getByRole("heading", { name: "Feature", exact: true }),
  ).toBeVisible();
  expect(
    await page
      .locator(".markdown ol")
      .first()
      .evaluate((el) => getComputedStyle(el).listStyleType),
  ).toBe("decimal");
  await expect(page.locator('[data-reference="skill:principle-model-the-domain"]')).toBeVisible();
});

test("preserves learning and portfolio styles across navigation", async ({ page }) => {
  await page.goto(`${guide}#skill=poteto-mode&read=1`);
  await expect(page.locator(".markdown h1")).toBeVisible();
  await page.getByRole("link", { name: "All guides" }).click();
  await expect(page.locator(".learn-page h1")).toBeVisible();
  await page.getByRole("link", { name: "Back to the portfolio" }).click();
  await page.waitForURL(/\/$/, { waitUntil: "load" });
  await expect(page.locator(".portfolio")).toBeVisible();
  expect(
    await page.locator(".portfolio").evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(241, 239, 230)");
  await page.getByRole("button", { name: /Contents/ }).click();
  await page.getByRole("link", { name: /Learn FIELD GUIDES/ }).click();
  await expect(page).toHaveTitle("Learn | JuiceColored");
});

test.describe("touch reader", () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true });
  test("previews on first tap and opens a definition without overflow", async ({ page }) => {
    await page.goto(`${guide}#skill=principle-model-the-domain&read=1`);
    const term = page.locator('[data-reference="term:state-machine"]');
    await term.scrollIntoViewIfNeeded();
    await term.tap();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
    const bounds = await page.getByRole("dialog").boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(375);
    await page.getByRole("link", { name: "Full definition" }).tap();
    await expect(page.locator(".glossary-definition h1")).toHaveText("State machine");
    await page.getByRole("link", { name: "All guides" }).tap();
    await expect(page.locator(".learn-page h1")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  });
});

test("learn pages follow the system theme until a saved choice overrides it", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/learn");
  const background = () =>
    page.evaluate(() => getComputedStyle(document.querySelector(".learn-page")!).backgroundColor);
  const theme = page.getByRole("radiogroup", { name: "Color theme" });
  await expect(theme.getByRole("radio", { name: "System" })).toBeChecked();
  const dark = await background();

  await theme.getByTitle("Light").click();
  await expect(theme.getByRole("radio", { name: "Light" })).toBeChecked();
  await expect.poll(background).not.toBe(dark);
  const light = await background();

  await page.goto(guide);
  await expect(
    page.getByRole("radiogroup", { name: "Color theme" }).getByRole("radio", { name: "Light" }),
  ).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.goto("/learn");
  expect(await background()).toBe(light);
  await theme.getByTitle("System").click();
  await expect.poll(background).toBe(dark);
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /./);
});
