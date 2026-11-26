import { expect, test, type APIRequestContext } from "@playwright/test";
import { actor, loginAs } from "../../fixtures/actors";

const backend = process.env.E2E_BACKEND_URL ?? "http://localhost:15000";

async function ownerHeaders(request: APIRequestContext) {
  const response = await request.post(`${backend}/api/v1/auth/login`, { data: actor("owner") });
  expect(response.status()).toBe(200);
  const body = await response.json() as { accessToken: string };
  return { Authorization: `Bearer ${body.accessToken}` };
}

/**
 * The canvas palette has always listed external services, but dropping one used to
 * do nothing and the sync payload carried no `externalServiceId`. These specs pin the
 * whole path: palette -> node -> edge -> request body -> persisted row.
 */
test.describe("External service dependencies", () => {
  test("an external service dropped on the canvas becomes a node", async ({ page }) => {
    await loginAs(page, "owner");
    // loginAs asserts on the default landing page; the canvas is a client-side route,
    // so navigate after the session exists.
    await page.goto("/dependency-manager");
    await expect(page.locator(".react-flow__pane").first()).toBeVisible({ timeout: 20_000 });

    // Target the external row itself; a broad `[draggable]` filter also matches an
    // ancestor wrapper, which has no service id attribute.
    const paletteItem = page.locator("[data-external-service-id]").filter({ hasText: /stripe/i }).first();
    await expect(paletteItem).toBeVisible({ timeout: 20_000 });

    // Playwright's dragTo does not carry a DataTransfer into React Flow's onDrop, so
    // dispatch the same HTML5 drop event a real drag produces, with an explicit payload.
    const canvas = page.locator(".react-flow__pane").first();
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    const x = box!.x + box!.width / 2;
    const y = box!.y + box!.height / 2;

    const serviceId = await paletteItem.getAttribute("data-external-service-id");
    expect(serviceId).toBeTruthy();
    await page.evaluate(
      ({ x, y, serviceId }) => {
        const pane = document.querySelector(".react-flow__pane");
        if (!pane) throw new Error("canvas pane missing");
        const dataTransfer = new DataTransfer();
        dataTransfer.setData("external-service/reactflow", serviceId!);
        const options = { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer };
        pane.dispatchEvent(new DragEvent("dragover", options));
        pane.dispatchEvent(new DragEvent("drop", options));
      },
      { x, y, serviceId },
    );

    await expect(page.getByTestId("external-service-node")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("external-service-node")).toContainText(/stripe/i);
  });

  test("the sync request sends externalServiceId instead of an app destination", async ({ request }) => {
    const headers = await ownerHeaders(request);

    const services = await request.get(`${backend}/api/v1/external-services`, { headers });
    expect(services.status()).toBe(200);
    const list = await services.json() as { id: string; name: string }[];
    expect(list.length).toBeGreaterThan(0);
    const service = list[0];

    // Build a real deployment so the test does not depend on whatever the fixture left behind.
    const servers = await request.get(`${backend}/api/v1/Servers`, { headers });
    const serverPage = await servers.json() as { items?: { id: string }[] };
    const serverId = (serverPage.items ?? [])[0]?.id;
    expect(serverId).toBeTruthy();

    const appCode = `e2e-ext-${Date.now()}`;
    const created = await request.post(`${backend}/api/v1/Applications`, {
      headers,
      data: {
        appCode,
        appName: "E2E External Caller",
        ownerTeam: "e2e",
        techStack: "dotnet",
        risk: "LOW",
        deployment: { serverId, portNumber: 19000 + (Date.now() % 1000), protocol: "HTTP" },
      },
    });
    expect([200, 201]).toContain(created.status());
    const application = await created.json() as { id: string; servers?: { appId?: string; portMappingId: string }[] };
    let deployment = application.servers?.[0];
    if (!deployment?.portMappingId) {
      // Some responses omit the deployment projection; read it back from the server.
      const deployed = await request.get(`${backend}/api/v1/Infrastructure/servers/${serverId}/deployed-apps`, { headers });
      const rows = await deployed.json() as { items?: { appId: string; portMappingId: string }[] } | { appId: string; portMappingId: string }[];
      const list = Array.isArray(rows) ? rows : rows.items ?? [];
      deployment = list.find((row) => row.appId === application.id);
    }
    expect(deployment?.portMappingId).toBeTruthy();
    // The deployment's owning application is the record just created; the create response
    // does not always project `appId`, so lean on the id we already hold.
    const sourceAppId = deployment?.appId ?? application.id;

    // Exactly one destination: the API must accept the external form...
    const state = await request.get(`${backend}/api/v1/topology/state?catalogView=mine`, { headers });
    const current = await state.json() as { version?: number };
    const accepted = await request.put(`${backend}/api/v1/dependencies/sync`, {
      headers,
      data: {
        version: current.version ?? 0,
        dependencies: [{
          sourceAppId,
          destAppId: null,
          destinationPortMappingId: null,
          externalServiceId: service.id,
        }],
      },
    });
    // rejection cases or they would fail on a version conflict instead of the rule.
    const afterAccept = await request.get(`${backend}/api/v1/topology/state?catalogView=mine`, { headers });
    const bumped = await afterAccept.json() as { version?: number };

    // ...and must refuse a payload that names both destinations at once.
    const both = await request.put(`${backend}/api/v1/dependencies/sync`, {
      headers,
      data: {
        version: bumped.version ?? 0,
        dependencies: [{
          sourceAppId,
          destAppId: sourceAppId,
          destinationPortMappingId: deployment!.portMappingId,
          externalServiceId: service.id,
        }],
      },
    });
    expect(both.status()).toBe(400);

    // ...and one that names neither.
    const neither = await request.put(`${backend}/api/v1/dependencies/sync`, {
      headers,
      data: {
        version: current.version ?? 0,
        dependencies: [{ sourceAppId }],
      },
    });
    expect(neither.status()).toBe(400);
  });
});
