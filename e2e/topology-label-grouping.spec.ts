import { expect, test, type Page } from "@playwright/test";

const paymentsLabel = {
  id: "11111111-1111-1111-1111-111111111111",
  key: "service",
  value: "payments",
  colorHex: "#ff4d7e",
};

const dependencyServers = [
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    hostname: "api-host-01",
    ipAddress: "10.0.1.10",
    osType: "Linux",
    environment: "Development",
    status: "Online",
    applications: [
      {
        id: "aaaaaaaa-0000-0000-0000-000000000001",
        name: "Audit API",
        port: 7126,
        protocol: "HTTPS",
        labels: [],
      },
      {
        id: "aaaaaaaa-0000-0000-0000-000000000002",
        name: "Payments API",
        port: 8443,
        protocol: "HTTPS",
        labels: [paymentsLabel],
      },
    ],
    labels: [],
  },
  {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    hostname: "worker-host-01",
    ipAddress: "10.0.1.11",
    osType: "Linux",
    environment: "Development",
    status: "Online",
    applications: [],
    labels: [],
  },
];

async function mockDependencyApi(page: Page) {
  await page.route("**/api/v1/datacenters", async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.route("**/api/v1/inventory/labels", async (route) => {
    await route.fulfill({ json: [paymentsLabel] });
  });

  await page.route("**/api/v1/topology/map**", async (route) => {
    await route.fulfill({
      json: {
        servers: dependencyServers,
        connections: [],
      },
    });
  });

  await page.route("**/api/v1/topology/status", async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.route("**/api/v1/servers", async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.route("**/api/v1/frames", async (route) => {
    await route.fulfill({ json: [] });
  });
}

test.describe("Dependencies label grouping", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("accessToken", "playwright-e2e-token");
      window.sessionStorage.clear();
    });
    await mockDependencyApi(page);
  });

  test("shows an app label inside a derived frame with its hosting server", async ({
    page,
  }) => {
    await page.goto("/dependency-manager");

    await expect(
      page.locator(".react-flow__node-serverNode"),
    ).toHaveCount(2);

    const labelPicker = page.getByRole("button", { name: /labels/i });
    await labelPicker.click();

    const labelOption = page
      .getByRole("option")
      .filter({ hasText: "service: payments" });
    await expect(labelOption).toBeVisible();

    const groupedMapRequest = page.waitForRequest((request) => {
      if (!request.url().includes("/api/v1/topology/map")) return false;

      const requestUrl = new URL(request.url());
      return requestUrl.searchParams
        .getAll("labelIds")
        .includes(paymentsLabel.id);
    });

    await labelOption.click();
    await groupedMapRequest;
    await expect(labelOption).toHaveAttribute("aria-selected", "true");

    await labelPicker.click();

    const labelGroupFrame = page
      .locator(".react-flow__node-dependencyLabelGroupNode")
      .filter({ hasText: "service: payments" });

    await expect(labelGroupFrame).toBeVisible();
    await expect(labelGroupFrame).toContainText("1 server");
    await expect(labelGroupFrame).toContainText("1 app");
    await expect(
      page.locator(".react-flow__node-serverNode"),
    ).toHaveCount(1);
    await expect(page.getByText("Payments API")).toBeVisible();
    await expect(page.getByText("Audit API")).toHaveCount(0);
    await expect(page.getByText("worker-host-01")).toHaveCount(0);

    const initialBox = await labelGroupFrame.boundingBox();
    const dragHandle = labelGroupFrame.locator(
      ".dependency-label-drag-handle",
    );
    const handleBox = await dragHandle.boundingBox();

    expect(initialBox).not.toBeNull();
    expect(handleBox).not.toBeNull();

    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2 + 160,
      handleBox!.y + handleBox!.height / 2 + 90,
      { steps: 8 },
    );
    await page.mouse.up();

    await expect.poll(async () => {
      const movedBox = await labelGroupFrame.boundingBox();
      return movedBox ? movedBox.x - initialBox!.x : 0;
    }).toBeGreaterThan(100);
  });

  test("does not expose label grouping controls on Topology", async ({ page }) => {
    await page.goto("/topology");

    await expect(page.getByRole("button", { name: /labels/i })).toHaveCount(0);
  });
});
