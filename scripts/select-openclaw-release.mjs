#!/usr/bin/env node
import { pathToFileURL } from "node:url";

function versionParts(release) {
  const tag = release?.tag_name ?? release?.tagName;
  const match = typeof tag === "string" && /^v?(\d+)\.(\d+)\.(\d+)(?:-([1-9]\d*))?$/.exec(tag);
  return match ? match.slice(1).map((part) => BigInt(part ?? "0")) : null;
}

export function selectOpenClawRelease(releases) {
  if (!Array.isArray(releases)) {
    throw new Error("Expected a GitHub releases JSON array");
  }

  // Publication order can put a backport first. Numeric corrections follow their
  // base release, unlike SemVer prereleases, on both source and app tracks.
  const stableReleases = releases.filter((release) =>
    release && release.draft !== true && release.prerelease !== true && versionParts(release),
  ).sort((left, right) => {
    const a = versionParts(left);
    const b = versionParts(right);
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) return a[i] > b[i] ? -1 : 1;
    }
    return 0;
  });
  const latestStable = stableReleases[0] ?? null;
  const latestStableSource = latestStable
    ? stableSourceSelection(latestStable)
    : null;
  const latestAppStable = {};
  const appLagStableReleases = {};
  const suffixes = { "aarch64-darwin": ".zip", "x86_64-linux": "-amd64.deb" };
  for (const [system, suffix] of Object.entries(suffixes)) {
    latestAppStable[system] = null;
    appLagStableReleases[system] = [];
    for (const release of stableReleases) {
      const tagName = release.tag_name ?? release.tagName;
      // Match the public universal ZIP or amd64 DEB exactly, never a thin ZIP,
      // debug-symbol archive, AppImage, or artifact for a different architecture.
      const appName = `OpenClaw-${tagName.replace(/^v/, "")}${suffix}`;
      const appAsset = (release.assets ?? []).find(
        (asset) => asset?.name === appName && Boolean(asset?.browser_download_url),
      );
      if (!appAsset) {
        appLagStableReleases[system].push({ tagName, reason: `missing-${system}-artifact` });
        continue;
      }
      latestAppStable[system] = {
        version: tagName.replace(/^v/, ""),
        url: appAsset.browser_download_url,
      };
      break;
    }
  }

  return {
    latestStable: latestStableSource
      ? { tagName: latestStableSource.tagName }
      : null,
    latestStableSource,
    latestAppStable,
    appLagStableReleases,
  };
}

function stableSourceSelection(release) {
  const tagName = release.tag_name ?? release.tagName;
  if (!tagName) {
    return null;
  }

  return {
    tagName,
    releaseVersion: tagName.replace(/^v/, ""),
  };
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const input = await readStdin();
  const releases = JSON.parse(input);
  const selection = selectOpenClawRelease(releases);
  process.stdout.write(`${JSON.stringify(selection, null, 2)}\n`);
}
