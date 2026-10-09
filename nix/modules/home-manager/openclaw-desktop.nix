{
  config,
  lib,
  pkgs,
  ...
}:
let
  cfg = config.programs.openclaw.desktop;
in
{
  options.programs.openclaw.desktop = {
    enable = lib.mkEnableOption "OpenClaw desktop application";
    package = lib.mkPackageOption pkgs [ "openclawPackages" "openclaw-app" ] { };
  };

  config = lib.mkIf cfg.enable {
    home.packages = [ cfg.package ];
  };
}
