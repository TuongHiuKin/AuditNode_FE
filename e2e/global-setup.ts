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
  const commandLine = process.argv.join(' ');
  const selected = (name: string) => commandLine.includes(`--project=${name}`)
    || commandLine.includes(`--project ${name}`);

  if (selected('smoke-production') || process.env.E2E_PRODUCTION_FRONTEND_URL || process.env.E2E_PRODUCTION_BACKEND_URL) {
    const frontend = process.env.E2E_PRODUCTION_FRONTEND_URL ?? config.projects[0]?.use.baseURL?.toString();
    const backend = process.env.E2E_PRODUCTION_BACKEND_URL;
    if (!frontend || !backend) throw new Error('Production smoke requires E2E_PRODUCTION_FRONTEND_URL and E2E_PRODUCTION_BACKEND_URL.');
    await probe('production frontend', frontend);
    await probe('production liveness', `${backend}/health/live`);
    await probe('production readiness', `${backend}/health/ready`);
    return;
  }

  if (selected('smoke-staging') || process.env.E2E_STAGING_FRONTEND_URL || process.env.E2E_STAGING_BACKEND_URL) {
    const frontend = process.env.E2E_STAGING_FRONTEND_URL ?? config.projects[0]?.use.baseURL?.toString();
    const backend = process.env.E2E_STAGING_BACKEND_URL;
    if (!frontend || !backend) throw new Error('Staging smoke requires E2E_STAGING_FRONTEND_URL and E2E_STAGING_BACKEND_URL.');
    await probe('staging frontend', frontend);
    await probe('staging liveness', `${backend}/health/live`);
    await probe('staging readiness', `${backend}/health/ready`);
    return;
  }

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
