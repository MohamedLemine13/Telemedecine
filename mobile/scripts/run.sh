#!/usr/bin/env bash
# Run the Flutter patient app with the correct API base URL.
#
# Usage:
#   ./mobile/scripts/run.sh                  # auto-detect device
#   ./mobile/scripts/run.sh -d chrome        # web (no phone needed)
#   ./mobile/scripts/run.sh -d linux         # Linux desktop (needs lld)
#   ./mobile/scripts/run.sh -d <device-id>   # specific phone/emulator
#
# MACHINE_IP is read from the project root .env file.  Override by setting
# MACHINE_IP in your shell before running this script.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
MOBILE_DIR="${SCRIPT_DIR}/.."

# Load .env if it exists
ENV_FILE="${PROJECT_ROOT}/.env"
if [[ -f "${ENV_FILE}" ]]; then
  # Export only simple KEY=VALUE lines (skip comments and blank lines)
  set -a
  # shellcheck disable=SC1090
  source <(grep -E '^[A-Z_]+=.*' "${ENV_FILE}" | grep -v '^#')
  set +a
fi

# Fall back to LAN IP detection if MACHINE_IP is not set
if [[ -z "${MACHINE_IP}" ]]; then
  MACHINE_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
fi

if [[ -z "${MACHINE_IP}" ]]; then
  echo "ERROR: Could not determine MACHINE_IP. Set it in .env or export it."
  exit 1
fi

API_BASE_URL="http://${MACHINE_IP}:8080"
echo ">>> Running Flutter with API_BASE_URL=${API_BASE_URL}"

cd "${MOBILE_DIR}" || exit 1
flutter run \
  --dart-define=API_BASE_URL="${API_BASE_URL}" \
  "$@"
