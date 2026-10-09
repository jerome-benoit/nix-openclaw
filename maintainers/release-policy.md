# Release Policy

`nix-openclaw` publishes one user-facing package, `openclaw`, with component outputs for maintainers and modules.

## Desired State

- `openclaw-gateway` tracks the newest stable upstream OpenClaw source release that satisfies the Nix package contract.
- `openclaw-app` tracks the newest stable public desktop artifact separately for
  each platform: `OpenClaw-*.zip` on Darwin, `OpenClaw-*-amd64.deb` on Linux.
- These tracks are independent. Source and app versions may differ.
- Select each track by the highest stable version, not GitHub publication order: later-published backports must not downgrade either track. Numeric correction suffixes sort after their base release.

## Non-Negotiables

- Do not hold back the packaged gateway because a newer source release lacks desktop assets for either platform.
- Do not treat source/app version mismatch as a failure.
- Do not make upstream's full Vitest suite a promotion gate; upstream owns source test health.
- Do verify the Nix-owned package contract: npm-shrinkwrapped gateway build,
  generated config materialization during pin updates, package contents, gateway
  smoke startup, module activation, and newest available public desktop app
  artifact.
- Darwin uses the upstream universal `.zip`; verify the unpacked contents contain
  an `.app`. Linux uses the official amd64 `.deb`, not an AppImage or a rebuilt
  app. Missing assets preserve only that platform's existing pin.

## Freshness Check

The package is fresh only when all are true:

- `nix/sources/openclaw-source.nix` matches GitHub's newest stable OpenClaw source tag.
- `nix/sources/openclaw-app.json` matches the newest stable public ZIP for Darwin
  and the newest stable public amd64 DEB for Linux.

If newer stable source releases lack a platform's desktop assets, report that
platform's upstream publishing miss and preserve its newest public artifact.
The selector passes structured platform selections to `update-pins.sh apply`;
materialization hashes ZIP contents and DEB bytes independently on either CI
host. A Linux-only desktop release must trigger promotion without rewriting the
Darwin artifact, and missing desktop assets must not hold back gateway updates.

## Mirrored Release Tags

A `v<OpenClaw version>` tag in `nix-openclaw` is a user-facing install target
for the complete Nix package state of that upstream OpenClaw version. It points
at a `nix-openclaw` commit, not at the upstream `openclaw/openclaw` commit.

Create a mirrored release tag only when all of these are true:

- `nix/sources/openclaw-source.nix` pins `releaseTag = "v<version>"`.
- Every platform in `nix/sources/openclaw-app.json` pins `version = "<version>"`.
- Each desktop URL points at the matching upstream universal ZIP or amd64 DEB.
- The generated config, runtime plugin locks, Nix patches, and package files for
  that package state are committed.
- Repository `CI` has passed on `main` for that exact commit, covering the Linux
  and macOS package contract.

Do not create a mirrored `v<OpenClaw version>` tag while source and any desktop pins
diverge, while release generation is incomplete, or while CI is failing. App lag
can still be reported as upstream release-contract lag, but it is not a tagged
user-facing release.

Automation may create missing mirrored tags and lightweight GitHub Releases after
green `CI` on `main`. Generated release notes must link to the matching upstream
OpenClaw release so users can click through from the Nix package state to the
source release. New annotated tags should include the same upstream release URL
in the tag message.

Before publishing, move the completed `Unreleased` notes under a dated version
heading such as `## 2026.9.4 - 2026-09-11` and open a new `Unreleased` section.
The publisher includes the section matching the pinned source version in the
GitHub Release body, so later CI runs preserve the packaging notes.

Automation must not move an existing public tag. If a tag is wrong, a maintainer
decides whether it is still safe to delete/retag immediately or whether to
publish a corrective follow-up tag instead. If an upstream asset disappears or a
hash invalidates after a tag is published, repair the package state first; do
not move the public tag automatically.
