import { expect, test, type APIRequestContext } from "@playwright/test";
import { actor, loginAs } from "../../fixtures/actors";

const backend = process.env.E2E_BACKEND_URL ?? "http://localhost:15000";

async function token(request: APIRequestContext) {
  const credentials = actor("owner");
  const response = await request.post(`${backend}/api/v1/auth/login`, { data: credentials });
  expect(response.status()).toBe(200);
  const body = await response.json() as { accessToken: string };
  return { Authorization: `Bearer ${body.accessToken}` };
}

test.describe("External services", () => {
  test("a recorded third-party service survives a reload and can be deleted", async ({ page, request }) => {
    const headers = await token(request);
    const name = `Stripe e2e ${Date.now()}`;

    // Remove rows a previous run left behind: the page shows the whole owner catalog,
    // so leftovers would make the row assertions ambiguous.
    const existing = await request.get(`${backend}/api/v1/external-services?search=Stripe%20e2e`, { headers });
    expect(existing.status()).toBe(200);
    for (const service of await existing.json() as { id: string }[])
      await request.delete(`${backend}/api/v1/external-services/${service.id}`, { headers });

    await loginAs(page, "owner");
    await page.goto("/external-services");
    await expect(page.getByRole("heading", { name: "External services" })).toBeVisible();

    await page.getByLabel("Service name").fill(name);
    await page.getByLabel("Service kind").selectOption("SaaS");
    await page.getByLabel("Environment").fill("E2E");
    await page.getByLabel("Provider").fill("Stripe, Inc.");
    await page.getByLabel("Endpoint").fill("https://api.stripe.com");
    await page.getByLabel("Protocol").fill("HTTPS");
    await page.getByLabel("Port").fill("443");
    await page.getByRole("button", { name: /record service/i }).click();

    // Rendered from the server response, not optimistic state. Scope the endpoint
    // assertion to this row: other owners' rows and older fixtures share the URL.
    const row = page.getByRole("row", { name: new RegExp(name) });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row.getByRole("cell", { name: "https://api.stripe.com:443" })).toBeVisible();

    // Survives a reload: proves the API persisted it.
    await page.reload();
    await expect(page.getByRole("row", { name: new RegExp(name) })).toBeVisible({ timeout: 15_000 });

    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: `Delete ${name}` }).click();
    await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(0, { timeout: 15_000 });
  });

  test("a duplicate name is refused with a visible message", async ({ page, request }) => {
    const headers = await token(request);
    const name = `Dup e2e ${Date.now()}`;
    await request.post(`${backend}/api/v1/external-services`, {
      headers,
      data: { name, kind: "API", environment: "E2E" },
    });

    await loginAs(page, "owner");
    await page.goto("/external-services");

    await page.getByLabel("Service name").fill(name);
    await page.getByLabel("Environment").fill("E2E");
    await page.getByRole("button", { name: /record service/i }).click();

    await expect(page.getByText(/already recorded a service with this name/i)).toBeVisible({ timeout: 15_000 });

    const created = await request.get(`${backend}/api/v1/external-services?search=Dup%20e2e`, { headers });
    for (const service of await created.json() as { id: string }[])
      await request.delete(`${backend}/api/v1/external-services/${service.id}`, { headers });
  });
});
