#!/usr/bin/env node
import assert from "node:assert/strict";
import { selectOpenClawRelease } from "./select-openclaw-release.mjs";

const releases = [
  {
    tag_name: "v2026.5.3-1",
    draft: false,
    prerelease: false,
    assets: [],
  },
  {
    tag_name: "v2026.5.3",
    draft: false,
    prerelease: false,
    assets: [],
  },
  {
    tag_name: "v2026.5.2-beta.1",
    draft: false,
    prerelease: true,
    assets: [
      {
        name: "OpenClaw-2026.5.2-beta.1.zip",
        browser_download_url:
          "https://github.com/openclaw/openclaw/releases/download/v2026.5.2-beta.1/OpenClaw-2026.5.2-beta.1.zip",
      },
    ],
  },
  {
    tag_name: "v2026.5.2",
    draft: false,
    prerelease: false,
    assets: [
      {
        name: "OpenClaw-2026.5.2.dmg",
        browser_download_url:
          "https://github.com/openclaw/openclaw/releases/download/v2026.5.2/OpenClaw-2026.5.2.dmg",
      },
      {
        name: "OpenClaw-2026.5.2.dSYM.zip",
        browser_download_url:
          "https://github.com/openclaw/openclaw/releases/download/v2026.5.2/OpenClaw-2026.5.2.dSYM.zip",
      },
      {
        name: "OpenClaw-2026.5.2.zip",
        browser_download_url:
          "https://github.com/openclaw/openclaw/releases/download/v2026.5.2/OpenClaw-2026.5.2.zip",
      },
    ],
  },
];

const selection = selectOpenClawRelease(releases);

assert.equal(selection.latestStable.tagName, "v2026.5.3-1");
assert.equal(selection.latestStableSource.tagName, "v2026.5.3-1");
assert.equal(selection.latestStableSource.releaseVersion, "2026.5.3-1");
assert.equal(selection.latestAppStable["aarch64-darwin"].version, "2026.5.2");
assert.equal(
  selection.latestAppStable["aarch64-darwin"].url,
  "https://github.com/openclaw/openclaw/releases/download/v2026.5.2/OpenClaw-2026.5.2.zip",
);
assert.deepEqual(
  selection.appLagStableReleases["aarch64-darwin"].map((release) => release.tagName),
  ["v2026.5.3-1", "v2026.5.3"],
);

const none = selectOpenClawRelease([
  {
    tag_name: "v2026.5.3",
    draft: false,
    prerelease: false,
    assets: [],
  },
]);

assert.equal(none.latestStable.tagName, "v2026.5.3");
assert.equal(none.latestStableSource.tagName, "v2026.5.3");
assert.equal(none.latestStableSource.releaseVersion, "2026.5.3");
assert.equal(none.latestAppStable["aarch64-darwin"], null);
assert.deepEqual(none.appLagStableReleases["aarch64-darwin"], [
  { tagName: "v2026.5.3", reason: "missing-aarch64-darwin-artifact" },
]);

const appVersion = "2026.5.3-1";
const universalAppName = `OpenClaw-${appVersion}.zip`;
const appAssets = [
  universalAppName,
  `OpenClaw-${appVersion}-arm64.zip`,
  `OpenClaw-${appVersion}-x86_64.zip`,
  `OpenClaw-${appVersion}.dSYM.zip`,
].map((name) => ({
  name,
  browser_download_url: `https://github.com/openclaw/openclaw/releases/download/v${appVersion}/${name}`,
}));

function permutations(items) {
  return items.length === 0
    ? [[]]
    : items.flatMap((item, index) =>
        permutations(items.filter((_, otherIndex) => otherIndex !== index)).map(
          (rest) => [item, ...rest],
        ),
      );
}

for (const assets of permutations(appAssets)) {
  const result = selectOpenClawRelease([{ ...releases[0], assets }]);
  assert.ok(result.latestAppStable["aarch64-darwin"].url.endsWith(universalAppName));
  assert.equal(result.latestAppStable["aarch64-darwin"].url, appAssets[0].browser_download_url);
  assert.equal(result.latestAppStable["aarch64-darwin"].version, appVersion);
  assert.deepEqual(result.appLagStableReleases["aarch64-darwin"], []);
}

const thinOnlyRelease = { ...releases[0], assets: appAssets.slice(1) };
const appLag = selectOpenClawRelease([thinOnlyRelease, releases[3]]);
assert.equal(appLag.latestStableSource.releaseVersion, appVersion);
assert.deepEqual(appLag.latestAppStable["aarch64-darwin"], selection.latestAppStable["aarch64-darwin"]);
assert.deepEqual(appLag.appLagStableReleases["aarch64-darwin"], [
  { tagName: `v${appVersion}`, reason: "missing-aarch64-darwin-artifact" },
]);

const thinOnly = selectOpenClawRelease([thinOnlyRelease]);
assert.equal(thinOnly.latestStableSource.releaseVersion, appVersion);
assert.equal(thinOnly.latestAppStable["aarch64-darwin"], null);
assert.deepEqual(thinOnly.appLagStableReleases["aarch64-darwin"], appLag.appLagStableReleases["aarch64-darwin"]);

console.log("release selection: ok");

function release(version, hasApp = true) {
  return {
    tag_name: `v${version}`,
    draft: false,
    prerelease: false,
    assets: hasApp ? [{
      name: `OpenClaw-${version}.zip`,
      browser_download_url: `https://github.com/openclaw/openclaw/releases/download/v${version}/OpenClaw-${version}.zip`,
    }] : [],
  };
}

// GitHub lists a newly published backport before a higher stable version.
const backportFirst = [release("2026.7.35"), release("2026.9.5"), release("2026.9.4")];
const backportSelection = selectOpenClawRelease(backportFirst);
assert.equal(backportSelection.latestStableSource.releaseVersion, "2026.9.5");
assert.equal(backportSelection.latestAppStable["aarch64-darwin"].version, "2026.9.5");
assert.deepEqual(backportSelection.appLagStableReleases["aarch64-darwin"], []);
assert.equal(backportFirst[0].tag_name, "v2026.7.35", "selection must not reorder caller input");

for (const rows of permutations([
  release("2026.9.5-2", false),
  release("2026.9.5-10", false),
  release("2026.9.5"),
  release("2026.7.35"),
])) {
  const result = selectOpenClawRelease(rows);
  assert.equal(result.latestStableSource.releaseVersion, "2026.9.5-10");
  assert.equal(result.latestAppStable["aarch64-darwin"].version, "2026.9.5");
  assert.deepEqual(result.appLagStableReleases["aarch64-darwin"].map(({ tagName }) => tagName), ["v2026.9.5-10", "v2026.9.5-2"]);
}

const invalidReleases = [
  { tag_name: "latest", assets: [] },
  { tag_name: "v2027.1.1-beta.1", prerelease: false, assets: [] },
  { ...release("2027.1.1"), draft: true },
  { ...release("2027.1.2"), prerelease: true },
  { assets: [] },
  null,
];
assert.equal(selectOpenClawRelease([...invalidReleases, release("2026.9.5")]).latestStableSource.releaseVersion, "2026.9.5");
assert.equal(selectOpenClawRelease(invalidReleases).latestStableSource, null);
assert.equal(selectOpenClawRelease([release("2026.9.9"), release("2026.10.1")]).latestStableSource.releaseVersion, "2026.10.1");
assert.equal(selectOpenClawRelease([{ tagName: "v2026.9.5" }]).latestStableSource.releaseVersion, "2026.9.5");

const linuxVersion = "2026.9.5-2";
const linuxAsset = {
  name: `OpenClaw-${linuxVersion}-amd64.deb`,
  browser_download_url: `https://github.com/openclaw/openclaw/releases/download/v${linuxVersion}/OpenClaw-${linuxVersion}-amd64.deb`,
};
const mixed = selectOpenClawRelease([
  release("2026.9.9", false),
  { ...release(linuxVersion, false), assets: [linuxAsset] },
  release("2026.9.5"),
]);
assert.equal(mixed.latestStableSource.releaseVersion, "2026.9.9");
assert.equal(mixed.latestAppStable["x86_64-linux"].version, linuxVersion);
assert.equal(mixed.latestAppStable["x86_64-linux"].url, linuxAsset.browser_download_url);
assert.equal(mixed.latestAppStable["aarch64-darwin"].version, "2026.9.5");
assert.deepEqual(mixed.appLagStableReleases["x86_64-linux"].map(({tagName}) => tagName), ["v2026.9.9"]);
for (const name of [`OpenClaw-${linuxVersion}-arm64.deb`, `OpenClaw-${linuxVersion}-amd64.AppImage`]) {
  const result = selectOpenClawRelease([{ ...release(linuxVersion, false), assets: [{ ...linuxAsset, name }] }]);
  assert.equal(result.latestAppStable["x86_64-linux"], null);
  assert.equal(result.latestStableSource.releaseVersion, linuxVersion);
}

