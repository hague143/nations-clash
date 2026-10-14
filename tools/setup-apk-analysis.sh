#!/usr/bin/env bash
set -euo pipefail
task_repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
task_analysis_venv=/workspace/.tools/apk-analysis-venv
if [[ ! -x "$task_analysis_venv/bin/python" ]]; then
  python3 -m venv "$task_analysis_venv"
fi
"$task_analysis_venv/bin/python" -m pip install --disable-pip-version-check --no-cache-dir \
  --requirement "$task_repo_root/tools/apk-analysis-requirements.txt"
"$task_analysis_venv/bin/python" -m pip check
