#!/usr/bin/env bash
set -euo pipefail

API_ROOT="${API_ROOT:-http://localhost:5000}"
API_BASE_URL="${API_BASE_URL:-$API_ROOT/api/v1}"
HEALTH_URL="${HEALTH_URL:-$API_ROOT/health}"

PATIENT_EMAIL="${PATIENT_EMAIL:-patient1@gmail.com}"
PATIENT_PASSWORD="${PATIENT_PASSWORD:-password123}"
PHONE_NUMBER="${PHONE_NUMBER:-774468922}"

# Space-separated methods: wave orange_money
METHODS="${METHODS:-wave orange_money}"

RESP_STATUS=""
RESP_BODY=""

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd"
    exit 1
  fi
}

request() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local token="${4:-}"
  local tmp

  tmp="$(mktemp)"

  if [[ -n "$body" && -n "$token" ]]; then
    curl -sS -X "$method" "$url" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $token" \
      -d "$body" \
      -w '\nHTTP_STATUS:%{http_code}' > "$tmp"
  elif [[ -n "$body" ]]; then
    curl -sS -X "$method" "$url" \
      -H "Content-Type: application/json" \
      -d "$body" \
      -w '\nHTTP_STATUS:%{http_code}' > "$tmp"
  elif [[ -n "$token" ]]; then
    curl -sS -X "$method" "$url" \
      -H "Authorization: Bearer $token" \
      -w '\nHTTP_STATUS:%{http_code}' > "$tmp"
  else
    curl -sS -X "$method" "$url" \
      -w '\nHTTP_STATUS:%{http_code}' > "$tmp"
  fi

  RESP_STATUS="$(grep 'HTTP_STATUS:' "$tmp" | tail -n1 | cut -d: -f2)"
  RESP_BODY="$(sed '/HTTP_STATUS:/d' "$tmp")"
  rm -f "$tmp"
}

assert_status() {
  local expected="$1"
  local context="$2"
  if [[ "$RESP_STATUS" != "$expected" ]]; then
    echo "[FAIL] $context expected HTTP $expected, got $RESP_STATUS"
    echo "$RESP_BODY"
    exit 1
  fi
}

require_cmd curl
require_cmd jq

echo "== Test mobile money (Wave/Orange Money) =="
echo "API: $API_BASE_URL"
echo "Patient: $PATIENT_EMAIL"
echo "Numero test: $PHONE_NUMBER"

request GET "$HEALTH_URL"
assert_status "200" "health"

LOGIN_PAYLOAD="$(
  jq -nc \
    --arg email "$PATIENT_EMAIL" \
    --arg password "$PATIENT_PASSWORD" \
    '{email:$email,password:$password}'
)"
request POST "$API_BASE_URL/auth/login" "$LOGIN_PAYLOAD"
assert_status "200" "auth.login(patient)"
PATIENT_TOKEN="$(printf '%s' "$RESP_BODY" | jq -r '.data.accessToken // empty')"
if [[ -z "$PATIENT_TOKEN" ]]; then
  echo "[FAIL] Token patient introuvable"
  echo "$RESP_BODY"
  exit 1
fi

request GET "$API_BASE_URL/patient/mes-rendez-vous" "" "$PATIENT_TOKEN"
assert_status "200" "patient.mes-rendez-vous"
RDV_ID="$(printf '%s' "$RESP_BODY" | jq -r '.data[] | select(.statut == "confirme") | .id' | head -n1)"
if [[ -z "$RDV_ID" ]]; then
  echo "[FAIL] Aucun rendez-vous 'confirme' trouve pour ce patient."
  echo "Confirme d'abord un rendez-vous, puis relance le script."
  exit 1
fi

echo "Rendez-vous teste: $RDV_ID"
echo

for methode in $METHODS; do
  echo "---- Methode: $methode ----"

  INIT_PAYLOAD="$(
    jq -nc \
      --argjson rendezVousId "$RDV_ID" \
      --arg methode "$methode" \
      '{rendezVousId:$rendezVousId,methode:$methode}'
  )"

  request POST "$API_BASE_URL/paiements/initier" "$INIT_PAYLOAD" "$PATIENT_TOKEN"
  if [[ "$RESP_STATUS" != "201" ]]; then
    echo "[FAIL] Initiation $methode (HTTP $RESP_STATUS)"
    echo "$RESP_BODY"
    continue
  fi

  PAIEMENT_ID="$(printf '%s' "$RESP_BODY" | jq -r '.data.id // empty')"
  CHECKOUT_URL="$(printf '%s' "$RESP_BODY" | jq -r '.data.paymentSession.checkoutUrl // empty')"
  TOKEN="$(printf '%s' "$RESP_BODY" | jq -r '.data.paymentSession.token // empty')"

  echo "Paiement ID: $PAIEMENT_ID"
  echo "Token: $TOKEN"
  echo "Checkout URL: $CHECKOUT_URL"
  echo
  echo "Action manuelle:"
  echo "1) Ouvre le Checkout URL"
  echo "2) Choisis $methode"
  echo "3) Saisis le numero $PHONE_NUMBER"
  echo "4) Valide le paiement sur le telephone"
  read -r -p "Appuie sur Entree apres validation sur le telephone..."

  FINAL_STATE=""
  for attempt in 1 2 3 4 5 6; do
    request POST "$API_BASE_URL/paiements/$PAIEMENT_ID/payer" "{}" "$PATIENT_TOKEN"
    if [[ "$RESP_STATUS" != "200" ]]; then
      echo "Tentative $attempt: verification impossible (HTTP $RESP_STATUS)"
      echo "$RESP_BODY"
      sleep 4
      continue
    fi

    FINAL_STATE="$(printf '%s' "$RESP_BODY" | jq -r '.data.statut // .data.paymentSession.status // "pending"')"
    echo "Tentative $attempt: statut=$FINAL_STATE"

    if [[ "$FINAL_STATE" == "paye" || "$FINAL_STATE" == "echoue" || "$FINAL_STATE" == "failed" || "$FINAL_STATE" == "cancelled" ]]; then
      break
    fi
    sleep 4
  done

  request GET "$API_BASE_URL/paiements/$PAIEMENT_ID" "" "$PATIENT_TOKEN"
  if [[ "$RESP_STATUS" == "200" ]]; then
    DB_STATUS="$(printf '%s' "$RESP_BODY" | jq -r '.data.statut // "inconnu"')"
    echo "Statut final en base: $DB_STATUS"
  else
    echo "Impossible de lire le paiement final (HTTP $RESP_STATUS)"
    echo "$RESP_BODY"
  fi

  echo
done

echo "== Fin du test mobile money =="
