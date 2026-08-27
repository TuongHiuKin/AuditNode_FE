import type { FullConfig } from '@playwright/test';

const requiredWhenExternal = [
  'E2E_SYSTEM_ADMIN_USERNAME', 'E2E_SYSTEM_ADMIN_PASSWORD',
  'E2E_OWNER_USERNAME', 'E2E_OWNER_PASSWORD',
  'E2E_WORKSPACE_ADMIN_USERNAME', 'E2E_WORKSPACE_ADMIN_PASSWORD',
  'E2E_LABEL_AUDITOR_USERNAME', 'E2E_LABEL_AUDITOR_PASSWORD',
  'E2E_FRAME_AUDITOR_USERNAME', 'E2E_FRAME_AUDITOR_PASSWORD',
  'E2E_VIEWER_USERNAME', 'E2E_VIEWER_PASSWORD',
];

async function probe(name: string, url: string) {
  let response: Response;
  try { response = await fetch(url, { signal: AbortSignal.timeout(8_000) }); }
  catch (error) { throw new Error(`E2E preflight failed: ${name} is unreachable at ${url}: ${String(error)}`); }
  if (!response.ok) throw new Error(`E2E preflight failed: ${name} returned HTTP ${response.status} at ${url}.`);
}

export default async function globalSetup(config: FullConfig) {
  if (process.env.E2E_EXTERNAL_STACK !== '1') return;
  const missing = requiredWhenExternal.filter(key => !process.env[key]);
  if (missing.length) throw new Error(`E2E preflight failed: missing required process environment variables: ${missing.join(', ')}.`);

  const frontend = config.projects[0]?.use.baseURL?.toString() ?? process.env.E2E_FRONTEND_URL!;
  const backend = process.env.E2E_BACKEND_URL ?? 'http://localhost:15000';
  const backendPeer = process.env.E2E_BACKEND_PEER_URL ?? 'http://localhost:15001';
  const keycloak = process.env.E2E_KEYCLOAK_URL ?? 'http://localhost:18080';
  await probe('Keycloak realm', `${keycloak}/realms/auditnode-e2e/.well-known/openid-configuration`);
  await probe('backend liveness', `${backend}/health/live`);
  await probe('backend readiness and migrations', `${backend}/health/ready`);
  await probe('backend OpenAPI', `${backend}/openapi/v1.json`);
  await probe('peer backend readiness', `${backendPeer}/health/ready`);
  await probe('frontend', frontend);
}
