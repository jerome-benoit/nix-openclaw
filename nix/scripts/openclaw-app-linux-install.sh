#!/usr/bin/env bash
set -euo pipefail
. "$STDENV_SETUP"

runHook preInstall
dpkg-deb --extract "$src" unpacked
install -Dm755 unpacked/usr/bin/openclaw-desktop "$out/bin/openclaw-desktop"
# Tauri resolves resources relative to the real executable as ../lib/OpenClaw.
mkdir -p "$out/lib" "$out/share"
cp -R unpacked/usr/lib/OpenClaw "$out/lib/OpenClaw"
cp -R unpacked/usr/share/icons unpacked/usr/share/applications "$out/share/"
substituteInPlace "$out/share/applications/OpenClaw.desktop" \
  --replace-fail 'Exec=openclaw-desktop' "Exec=$out/bin/openclaw-desktop"
runHook postInstall
