#!/bin/bash

set -euo pipefail

if [ "$#" -gt 1 ]; then
    echo "Illegal number of parameters, expected usage: ./test-endpoints.sh [service-url]"
    echo "Parameter 'service-url' will default to 'localhost:3000' if missing."
    exit 1
fi

_fail_if_command_unavailable() {
    if ! command -v $1 &>/dev/null; then
        echo "Error: this script requires the following command: $1"
        exit 1
    fi
}

function _ensure_service_up() {
    local url="${SERVICE_URL}/ping"
    local timeout_s=30
    local end_at_s=$(($(date +%s) + $timeout_s))

    while [ $(date +%s) -lt $end_at_s ]; do
        echo "Trying to contact the authorization server..."
        local status_code="$(curl -s -o /dev/null -w '%{http_code}' "$url")"
        if [ "$status_code" == '200' ]; then
            return 0
        fi
        sleep 1
    done

    echo "Failed to receive HTTP 200 OK"
    exit 1
}

_fail_if_command_unavailable "jq"
_fail_if_command_unavailable "curl"

SERVICE_URL=${1:-localhost:3000}
_ensure_service_up

echo "Starting test, will try to contact the authorization server for max 30s..."

CLIENT_ID=$(jq -r '.client_credentials.client_id' configs/config.json)
CLIENT_SECRET=$(jq -r '.client_credentials.client_secret' configs/config.json)
FCM_PROJECT_NUMBER=$(jq -r '.fcm_config.expected_fcm_project_number' configs/config.json)

echo "Fetching access token..."

ACCESS_TOKEN=$(curl -f --request POST \
    --url "${SERVICE_URL}/access_token" \
    --header 'Content-Type: application/x-www-form-urlencoded' \
    --data grant_type=client_credentials \
    --data "client_id=$CLIENT_ID" \
    --data "client_secret=$CLIENT_SECRET" \
    --data "scope=https://www.googleapis.com/auth/firebase.messaging" | jq -r '.access_token')

echo "Fetching FCM token..."

FCM_TOKEN=$(curl -f --request POST \
    --url "${SERVICE_URL}/fcm-token" \
    --header "Authorization: Bearer $ACCESS_TOKEN" \
    --header 'Content-Type: application/x-www-form-urlencoded' \
    --data "fcm_project_number=$FCM_PROJECT_NUMBER" \
    --data grant_type=client_credentials | jq -r '.access_token')

echo "Successfully fetched FCM token ($FCM_TOKEN)"
