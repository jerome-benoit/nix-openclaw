import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const helper = fileURLToPath(new URL("./lib/pin-app.sh", import.meta.url));
const pins = JSON.parse(readFileSync(new URL("../nix/sources/openclaw-app.json", import.meta.url), "utf8"));

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "app-pins-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const appFile = join(dir, "pins.json");
  writeFileSync(appFile, JSON.stringify(pins));
  return (command, selected) => spawnSync("bash", ["-euo", "pipefail", "-c", `
    . "$1"
    log() { printf '%s\\n' "$*" >&2; }
    ${command}
  `, "pin-app-test", helper], {
    env: { ...process.env, app_file: appFile, selected: JSON.stringify(selected) },
    encoding: "utf8",
  });
}

test("missing desktop assets preserve both pins and do not report an app update", (t) => {
  const run = fixture(t);
  const selected = { "aarch64-darwin": null, "x86_64-linux": null };
  assert.equal(run('app_pins_changed "$selected"', selected).status, 1);
  const result = run('materialize_app_pins "$selected"', selected);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), pins);
});
