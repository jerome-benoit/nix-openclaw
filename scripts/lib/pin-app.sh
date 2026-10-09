# Sourced by update-pins.sh; Darwin hashes are unpacked, Linux hashes are raw.
app_pins_changed() {
  jq -e --argjson selected "$1" '
    to_entries | any(. as $pin |
      $selected[$pin.key] != null and
      ($selected[$pin.key].version != $pin.value.version or
       $selected[$pin.key].url != $pin.value.url))
  ' "$app_file" >/dev/null
}

materialize_app_pins() {
  local selected="$1" pins system version url hash expected_url
  pins=$(cat "$app_file")
  for system in aarch64-darwin x86_64-linux; do
    if [[ "$(jq -r --arg system "$system" '.[$system] == null' <<<"$selected")" == true ]]; then
      log "No public $system desktop artifact; preserving its existing pin"
      continue
    fi
    version=$(jq -r --arg system "$system" '.[$system].version' <<<"$selected")
    url=$(jq -r --arg system "$system" '.[$system].url' <<<"$selected")
    if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[1-9][0-9]*)?$ ]]; then
      echo "Invalid $system desktop version: $version" >&2
      return 1
    fi
    expected_url="https://github.com/openclaw/openclaw/releases/download/v${version}/OpenClaw-${version}"
    case "$system" in
      aarch64-darwin)
        expected_url+=".zip"
        ;;
      x86_64-linux)
        expected_url+="-amd64.deb"
        ;;
    esac
    if [[ "$url" != "$expected_url" ]]; then
      echo "Invalid $system desktop artifact URL: $url" >&2
      return 1
    fi
    case "$system" in
      aarch64-darwin) hash=$(unpacked_zip_hash "$url") ;;
      x86_64-linux)
        hash=$(nix --extra-experimental-features "nix-command flakes" store prefetch-file --json "$url" | jq -er '.hash')
        ;;
    esac
    [[ -n "$hash" ]] || { echo "Missing $system artifact hash" >&2; return 1; }
    pins=$(jq --arg system "$system" --arg version "$version" --arg url "$url" --arg hash "$hash" \
      '.[$system] = {version: $version, url: $url, hash: $hash}' <<<"$pins")
  done
  printf '%s\n' "$pins"
}
