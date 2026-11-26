import { expect, test, type APIRequestContext } from "@playwright/test";
import { actor, loginAs } from "../../fixtures/actors";

const backend = process.env.E2E_BACKEND_URL ?? "http://localhost:15000";

async function token(request: APIRequestContext, who: "systemAdmin" | "owner") {
  const response = await request.post(`${backend}/api/v1/auth/login`, { data: actor(who) });
  expect(response.status()).toBe(200);
  const body = await response.json() as { accessToken: string };
  return { Authorization: `Bearer ${body.accessToken}` };
}

test.describe("Administration console", () => {
  test("a SystemAdmin sees only the administration navigation", async ({ page }) => {
    await loginAs(page, "systemAdmin");

    await expect(page.getByRole("link", { name: /^users$/i })).toBeVisible({ timeout: 15_000 });

    // Catalog navigation is for ordinary users; an administrator must not see it.
    await expect(page.getByRole("link", { name: /^inventory$/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /topology map/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^dependencies$/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /external services/i })).toHaveCount(0);
  });

  test("an ordinary user does not see the administration section", async ({ page }) => {
    await loginAs(page, "owner");

    await expect(page.getByRole("link", { name: /^inventory$/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: /^users$/i })).toHaveCount(0);
  });

  test("the admin user page shows the catalog read-only and a sharing tab", async ({ page, request }) => {
    const adminHeaders = await token(request, "systemAdmin");
    const ownerHeaders = await token(request, "owner");
    const me = await request.get(`${backend}/api/v1/auth/me`, { headers: ownerHeaders });
    const ownerId = (await me.json() as { id: string }).id;

    // The API must serve the owner catalog to an admin and refuse a write verb.
    const catalog = await request.get(`${backend}/api/v1/admin/users/${ownerId}/catalog`, { headers: adminHeaders });
    expect(catalog.status()).toBe(200);
    const write = await request.post(`${backend}/api/v1/admin/users/${ownerId}/catalog`, {
      headers: adminHeaders,
      data: { hostname: "should-not-exist" },
    });
    expect([403, 404, 405]).toContain(write.status());

    await loginAs(page, "systemAdmin");
    await page.goto(`/admin/users/${ownerId}`);

    await expect(page.getByRole("heading", { name: actor("owner").username })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/read-only catalog/i)).toBeVisible();

    // The catalog tab lists what the owner recorded and offers no edit control.
    await expect(page.getByRole("button", { name: /^catalog$/i })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: /^(edit|save|delete)$/i })).toHaveCount(0);

    await page.getByRole("button", { name: /^sharing$/i }).click();
    await expect(page.getByRole("button", { name: /^sharing$/i })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("Grantee user id")).toBeVisible();
    await expect(page.getByRole("button", { name: /add grant/i })).toBeVisible();
  });
});
