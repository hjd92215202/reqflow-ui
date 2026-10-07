# Release process

ReqFlow uses separate tag prefixes and GitHub Release channels for development and stable builds.

| Channel     | Source branch | Tag                      | GitHub Release                 | App identity              |
| ----------- | ------------- | ------------------------ | ------------------------------ | ------------------------- |
| Development | `dev`         | `dev-vMAJOR.MINOR.PATCH` | Published prerelease           | `com.reqflow.dev.preview` |
| Stable      | `main`        | `vMAJOR.MINOR.PATCH`     | Draft; publish it after review | `com.reqflow.dev`         |

Every release tag must match the version in `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`. Update all three version fields and commit that change on the intended branch before tagging.

## Development build

```bash
git switch dev
git pull --ff-only
git tag dev-v0.1.0
git push origin dev-v0.1.0
```

The workflow accepts this tag only when it points to a development-only commit in `dev`. It creates a published prerelease with `ReqFlow Development` in the title. The development bundle has its own app identifier and a `ReqFlow-dev-v...` asset name, so it can be distinguished from and installed alongside the stable app.

## Stable build

Merge the approved changes, including `.github/workflows/release.yml`, into `main` first. Then tag the desired commit on `main`:

```bash
git switch main
git pull --ff-only
git tag v0.1.0
git push origin v0.1.0
```

The workflow creates a stable GitHub Release draft with `ReqFlow` in the title and `ReqFlow-v...` asset names. Review the generated installers and release notes, then publish the draft in GitHub.

Both channels currently build Windows and universal macOS packages. Tag pushes run the workflow; ordinary branch pushes do not.
