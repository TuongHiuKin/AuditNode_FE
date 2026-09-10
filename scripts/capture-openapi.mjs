import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const backendUrl = process.env.E2E_BACKEND_URL
const output = path.resolve(process.argv[2] ?? 'artifacts/release-openapi.json')

if (!backendUrl) {
  throw new Error('E2E_BACKEND_URL is required to capture the runtime OpenAPI document.')
}

const response = await fetch(`${backendUrl.replace(/\/$/, '')}/openapi/v1.json`)
if (!response.ok) {
  throw new Error(`OpenAPI capture failed with HTTP ${response.status}.`)
}

const document = await response.json()
if (typeof document?.openapi !== 'string' || typeof document?.paths !== 'object') {
  throw new Error('The captured response is not an OpenAPI document.')
}

await mkdir(path.dirname(output), { recursive: true })
await writeFile(output, `${JSON.stringify(document)}\n`, 'utf8')
console.log(`Captured ${document.openapi} contract from ${backendUrl} at ${output}.`)
