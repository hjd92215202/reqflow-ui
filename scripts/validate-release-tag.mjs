import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const tag = process.env.GITHUB_REF_NAME
const commit = process.env.GITHUB_SHA
const isDevelopment = tag?.startsWith('dev-v') ?? false
const tagPattern = isDevelopment ? /^dev-v(\d+\.\d+\.\d+)$/ : /^v(\d+\.\d+\.\d+)$/
const tagMatch = tag?.match(tagPattern)

const fail = message => {
  console.error(message)
  process.exit(1)
}

if (!tagMatch || !commit) {
  fail(`Invalid release tag or missing commit SHA: ${tag || '(empty)'}`)
}

const sourceBranch = isDevelopment ? 'origin/dev' : 'origin/main'
const isAncestorOf = branch =>
  spawnSync('git', ['merge-base', '--is-ancestor', commit, branch], { stdio: 'ignore' }).status ===
  0

if (!isAncestorOf(sourceBranch)) {
  fail(`Tag ${tag} must point to a commit contained in ${sourceBranch}`)
}

if (isDevelopment && isAncestorOf('origin/main')) {
  fail(`Development tag ${tag} must point to a dev-only commit that is not in origin/main`)
}

const packageVersion = JSON.parse(readFileSync('package.json', 'utf8')).version
const tauriVersion = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8')).version
const cargoToml = readFileSync('src-tauri/Cargo.toml', 'utf8')
const cargoVersion = cargoToml.match(/^\[package\][\s\S]*?^version\s*=\s*"([^"]+)"/m)?.[1]
const versions = { packageJson: packageVersion, tauriConfig: tauriVersion, cargo: cargoVersion }

if (Object.values(versions).some(version => version !== tagMatch[1])) {
  fail(
    `Tag version ${tagMatch[1]} must match package.json, tauri.conf.json, and Cargo.toml: ${JSON.stringify(versions)}`
  )
}

console.log(`Validated ${isDevelopment ? 'development' : 'stable'} tag ${tag} at ${commit}`)
