#!/usr/bin/env bash
set -euo pipefail
task_sdk_version=8.0.426
task_sdk_root=/workspace/.tools/dotnet
task_sdk_hash=8141d01bdc53f604aed3bb661b604707a64209f8a947cd81bf95b4f518951593d77864069191f54ea5e84362a409da6b0f69074bf893b283d7e0cf93e2bf20a8
if [[ ! -x "$task_sdk_root/dotnet" ]] || [[ "$("$task_sdk_root/dotnet" --version)" != "$task_sdk_version" ]]; then
  task_sdk_archive=$(mktemp /tmp/nationclash-dotnet.XXXXXX.tar.gz)
  trap 'rm -f "$task_sdk_archive"' EXIT
  curl --fail --show-error --silent --location --retry 2 --max-time 180 \
    "https://builds.dotnet.microsoft.com/dotnet/Sdk/$task_sdk_version/dotnet-sdk-$task_sdk_version-linux-x64.tar.gz" \
    --output "$task_sdk_archive"
  printf '%s  %s\n' "$task_sdk_hash" "$task_sdk_archive" | sha512sum --check --status
  mkdir -p "$task_sdk_root"
  tar -xzf "$task_sdk_archive" -C "$task_sdk_root"
fi
export DOTNET_CLI_HOME=/workspace/.tools/dotnet-home
export DOTNET_NOLOGO=1 DOTNET_CLI_TELEMETRY_OPTOUT=1
task_repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$task_repo_root"
"$task_sdk_root/dotnet" run --project Tests/Combat/Combat.Tests.csproj --configuration Release
"$task_sdk_root/dotnet" build Tests/Compatibility/Combat.Core.csproj --configuration Release --nologo
python3 -m unittest discover -s Tests/Tools -v
