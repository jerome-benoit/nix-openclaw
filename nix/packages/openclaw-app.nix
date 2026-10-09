{
  lib,
  stdenvNoCC,
  fetchzip,
  fetchurl,
  dpkg,
  autoPatchelfHook,
  wrapGAppsHook3,
  gtk3,
  webkitgtk_4_1,
  libayatana-appindicator,
  xdotool,
  gst_all_1,
}:
let
  system = stdenvNoCC.hostPlatform.system;
  artifacts = builtins.fromJSON (builtins.readFile ../sources/openclaw-app.json);
  artifact = artifacts.${system} or (throw "Unsupported OpenClaw desktop platform: ${system}");
  isDarwin = stdenvNoCC.hostPlatform.isDarwin;
in
stdenvNoCC.mkDerivation {
  pname = "openclaw-app";
  inherit (artifact) version;

  src =
    if isDarwin then
      fetchzip {
        inherit (artifact) url hash;
        stripRoot = false;
      }
    else
      fetchurl { inherit (artifact) url hash; };

  dontUnpack = true;
  dontConfigure = true;
  dontBuild = true;
  env.STDENV_SETUP = "${stdenvNoCC}/setup";
  # The public Darwin bundle is signed; never strip or patch its contents.
  dontFixup = isDarwin;

  nativeBuildInputs = lib.optionals (!isDarwin) [
    dpkg
    autoPatchelfHook
    wrapGAppsHook3
  ];
  buildInputs = lib.optionals (!isDarwin) [
    gtk3
    webkitgtk_4_1
    libayatana-appindicator
    xdotool
    gst_all_1.gstreamer
    gst_all_1.gst-plugins-base
    gst_all_1.gst-plugins-good
    gst_all_1.gst-plugins-bad
    gst_all_1.gst-libav
  ];
  # The tray backend and global shortcuts dlopen these libraries.
  runtimeDependencies = lib.optionals (!isDarwin) [
    libayatana-appindicator
    xdotool
  ];

  installPhase =
    if isDarwin then
      "${../scripts/openclaw-app-install.sh}"
    else
      "bash ${../scripts/openclaw-app-linux-install.sh}";

  meta =
    with lib;
    {
      description = "OpenClaw desktop companion";
      homepage = "https://github.com/openclaw/openclaw";
      license = licenses.mit;
      platforms = builtins.attrNames artifacts;
    }
    // lib.optionalAttrs (!isDarwin) { mainProgram = "openclaw-desktop"; };
}
