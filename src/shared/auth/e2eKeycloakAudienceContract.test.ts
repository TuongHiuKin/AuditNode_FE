import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readProjectFile = (path: string) =>
  readFileSync(resolve(process.cwd(), path), 'utf8')

const readYamlSetting = (source: string, setting: string) => {
  const match = source.match(new RegExp(`^\\s*${setting}:\\s*(\\S+)\\s*$`, 'm'))

  expect(match, `${setting} must be configured in the E2E compose stack`).not.toBeNull()
  return match?.[1]
}

describe('E2E Keycloak token contract', () => {
  it('keeps the API audience distinct from the BFF authorized party', () => {
    const compose = readProjectFile('e2e/stack/docker-compose.yml')
    const audience = readYamlSetting(compose, 'Keycloak__Audience')
    const bffClientId = readYamlSetting(compose, 'Keycloak__BffClientId')

    expect(audience).toBe('auditnode-api')
    expect(bffClientId).toBe('auditnode-bff')
    expect(audience).not.toBe(bffClientId)
  })

  it('idempotently maps the API audience into BFF access tokens', () => {
    const bootstrap = readProjectFile('e2e/stack/bootstrap-keycloak.mjs')
    const mapperBootstrap = bootstrap.match(
      /const audienceMapper = \{[\s\S]+?const adminClients =/,
    )?.[0]

    expect(mapperBootstrap).toBeDefined()
    expect(mapperBootstrap).toContain("protocolMapper: 'oidc-audience-mapper'")
    expect(mapperBootstrap).toContain("'included.custom.audience': 'auditnode-api'")
    expect(mapperBootstrap).not.toContain("'included.client.audience'")
    expect(mapperBootstrap).toContain("'access.token.claim': 'true'")
    expect(mapperBootstrap).toContain('protocolMappers.find(')
    expect(mapperBootstrap).toContain('if (existingMapper)')
    expect(mapperBootstrap).toContain('protocol-mappers/models/${existingMapper.id}')
    expect(mapperBootstrap).toMatch(/if \(existingMapper\)[\s\S]+?method:\s*'PUT'/)
    expect(mapperBootstrap).toMatch(/else \{[\s\S]+?method:\s*'POST'/)
  })
})
