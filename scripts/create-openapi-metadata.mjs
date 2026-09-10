import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const [artifactInput, backendCommit, metadataInput] = process.argv.slice(2)

if (!artifactInput || !metadataInput) {
  throw new Error('Usage: node scripts/create-openapi-metadata.mjs <artifact> <backend-sha> <metadata>.')
}

if (!/^[0-9a-f]{40}$/.test(backendCommit ?? '')) {
  throw new Error('Backend commit must be a full lowercase 40-character SHA.')
}

const artifact = path.resolve(artifactInput)
const metadata = path.resolve(metadataInput)

if (path.dirname(artifact) !== path.dirname(metadata)) {
  throw new Error('OpenAPI artifact and metadata must be written to the same directory.')
}

const bytes = await readFile(artifact)
const sha256 = createHash('sha256').update(bytes).digest('hex')
const value = {
  schemaVersion: 1,
  backendCommit,
  openApiDocument: '/openapi/v1.json',
  artifact: path.basename(artifact),
  sha256,
}

await writeFile(metadata, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
console.log(`Pinned runtime OpenAPI ${sha256} to backend ${backendCommit}.`)
