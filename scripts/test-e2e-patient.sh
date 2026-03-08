#!/usr/bin/env bash
set -euo pipefail

API_ROOT="${API_ROOT:-http://localhost:5000}"
API_BASE_URL="${API_BASE_URL:-$API_ROOT/api/v1}"
HEALTH_URL="${HEALTH_URL:-$API_ROOT/health}"

DOCTOR_EMAIL="${DOCTOR_EMAIL:-dr.maley@gmail.com}"
DOCTOR_PASSWORD="${DOCTOR_PASSWORD:-password123}"
SECRETARY_EMAIL="${SECRETARY_EMAIL:-fatou@gmail.com}"
SECRETARY_PASSWORD="${SECRETARY_PASSWORD:-password123}"

PATIENT_PASSWORD="${PATIENT_PASSWORD:-BaraFall123!}"
PATIENT_EMAIL="${PATIENT_EMAIL:-bara.fall.$(date +%s)@gmail.com}"

PATIENT_PRENOM="${PATIENT_PRENOM:-Bara}"
PATIENT_NOM="${PATIENT_NOM:-Fall}"
PATIENT_NAME="${PATIENT_NAME:-$PATIENT_PRENOM $PATIENT_NOM}"
TS_NANO="$(date +%s%N)"
PATIENT_TEL="${PATIENT_TEL:-2217${TS_NANO: -8}}"

REPORT_FILE="${REPORT_FILE:-/tmp/test-e2e-patient-$(date +%s).log}"

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

  tmp=$(mktemp)

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

log_step() {
  local label="$1"
  {
    echo
    echo "=== $label ==="
    echo "HTTP $RESP_STATUS"
    echo "$RESP_BODY"
  } | tee -a "$REPORT_FILE"
}

assert_status() {
  local expected="$1"
  local context="$2"
  if [[ "$RESP_STATUS" != "$expected" ]]; then
    echo "[FAIL] $context expected HTTP $expected, got $RESP_STATUS" | tee -a "$REPORT_FILE"
    exit 1
  fi
}

assert_json_expr() {
  local expr="$1"
  local context="$2"
  if ! printf '%s' "$RESP_BODY" | jq -e "$expr" >/dev/null 2>&1; then
    echo "[FAIL] $context (jq expr failed: $expr)" | tee -a "$REPORT_FILE"
    exit 1
  fi
}

require_cmd curl
require_cmd jq
require_cmd date

echo "E2E patient test started at $(date -Iseconds)" | tee "$REPORT_FILE"
echo "API_BASE_URL=$API_BASE_URL" | tee -a "$REPORT_FILE"
echo "PATIENT_EMAIL=$PATIENT_EMAIL" | tee -a "$REPORT_FILE"
echo "DOCTOR_EMAIL=$DOCTOR_EMAIL" | tee -a "$REPORT_FILE"
echo "SECRETARY_EMAIL=$SECRETARY_EMAIL" | tee -a "$REPORT_FILE"

# 1) Health check
request GET "$HEALTH_URL"
log_step "health"
assert_status "200" "health"
assert_json_expr '.status == "OK"' "health payload"

# 2) Register patient
REGISTER_PAYLOAD="$(
  jq -nc \
    --arg email "$PATIENT_EMAIL" \
    --arg password "$PATIENT_PASSWORD" \
    --arg name "$PATIENT_NAME" \
    --arg prenom "$PATIENT_PRENOM" \
    --arg nom "$PATIENT_NOM" \
    --arg tel "$PATIENT_TEL" \
    '{email:$email,password:$password,name:$name,role:"patient",prenom:$prenom,nom:$nom,telephone:$tel}'
)"
request POST "$API_BASE_URL/auth/register" "$REGISTER_PAYLOAD"
log_step "auth.register"
assert_status "201" "auth.register"
assert_json_expr '.success == true' "auth.register success"

# 3) Login patient
LOGIN_PATIENT_PAYLOAD="$(
  jq -nc \
    --arg email "$PATIENT_EMAIL" \
    --arg password "$PATIENT_PASSWORD" \
    '{email:$email,password:$password}'
)"
request POST "$API_BASE_URL/auth/login" "$LOGIN_PATIENT_PAYLOAD"
log_step "auth.login(patient)"
assert_status "200" "auth.login(patient)"
PATIENT_TOKEN="$(printf '%s' "$RESP_BODY" | jq -r '.data.accessToken // empty')"
PATIENT_ID="$(printf '%s' "$RESP_BODY" | jq -r '.data.user.patientId // empty')"
if [[ -z "$PATIENT_TOKEN" || -z "$PATIENT_ID" ]]; then
  echo "[FAIL] Missing patient token or patientId after login" | tee -a "$REPORT_FILE"
  exit 1
fi
echo "PATIENT_ID=$PATIENT_ID" | tee -a "$REPORT_FILE"

# 4) Patient profile and dashboard
request GET "$API_BASE_URL/auth/me" "" "$PATIENT_TOKEN"
log_step "auth.me(patient)"
assert_status "200" "auth.me(patient)"

request GET "$API_BASE_URL/patient/profile" "" "$PATIENT_TOKEN"
log_step "patient.profile.get"
assert_status "200" "patient.profile.get"

request GET "$API_BASE_URL/patient/dashboard/summary" "" "$PATIENT_TOKEN"
log_step "patient.dashboard.summary"
assert_status "200" "patient.dashboard.summary"

# 5) Login secretary
LOGIN_SECRETARY_PAYLOAD="$(
  jq -nc \
    --arg email "$SECRETARY_EMAIL" \
    --arg password "$SECRETARY_PASSWORD" \
    '{email:$email,password:$password}'
)"
request POST "$API_BASE_URL/auth/login" "$LOGIN_SECRETARY_PAYLOAD"
log_step "auth.login(secretaire)"
assert_status "200" "auth.login(secretaire)"
SECRETARY_TOKEN="$(printf '%s' "$RESP_BODY" | jq -r '.data.accessToken // empty')"
if [[ -z "$SECRETARY_TOKEN" ]]; then
  echo "[FAIL] Missing secretary token after login" | tee -a "$REPORT_FILE"
  exit 1
fi

# 6) Resolve doctor's id from secretary scope
request GET "$API_BASE_URL/secretaire/dashboard/medecins" "" "$SECRETARY_TOKEN"
log_step "secretaire.dashboard.medecins"
assert_status "200" "secretaire.dashboard.medecins"
MEDECIN_ID="$(printf '%s' "$RESP_BODY" | jq -r '.data[0].medecin.id // empty')"
if [[ -z "$MEDECIN_ID" ]]; then
  echo "[FAIL] Secretary has no assigned doctor. Seed data and secretary assignment are required." | tee -a "$REPORT_FILE"
  exit 1
fi
echo "MEDECIN_ID=$MEDECIN_ID" | tee -a "$REPORT_FILE"

# 7) Create rendez-vous
DATE_RDV="$(date -d '+2 day' +%F)"
request GET "$API_BASE_URL/rendez-vous/creneaux-disponibles?medecinId=$MEDECIN_ID&date=$DATE_RDV"
log_step "rendez-vous.creneaux-disponibles"
assert_status "200" "rendez-vous.creneaux-disponibles"
HEURE_RDV="$(printf '%s' "$RESP_BODY" | jq -r '.data[0] // "09:00"')"
echo "DATE_RDV=$DATE_RDV HEURE_RDV=$HEURE_RDV" | tee -a "$REPORT_FILE"

CREATE_RDV_PAYLOAD="$(
  jq -nc \
    --argjson medecin_id "$MEDECIN_ID" \
    --arg date "$DATE_RDV" \
    --arg heure "$HEURE_RDV" \
    '{medecin_id:$medecin_id,date:$date,heure:$heure,type:"en_ligne",motif:"Test E2E patient"}'
)"
request POST "$API_BASE_URL/rendez-vous" "$CREATE_RDV_PAYLOAD" "$PATIENT_TOKEN"
log_step "rendez-vous.create(patient)"
assert_status "201" "rendez-vous.create(patient)"
assert_json_expr '.success == true' "rendez-vous.create success"

if printf '%s' "$RESP_BODY" | grep -q '"password"'; then
  echo "[FAIL] Sensitive data leak detected in rendez-vous.create response" | tee -a "$REPORT_FILE"
  exit 1
fi

RDV_ID="$(printf '%s' "$RESP_BODY" | jq -r '.data.id // empty')"
if [[ -z "$RDV_ID" ]]; then
  echo "[FAIL] Missing RDV_ID after rendez-vous.create" | tee -a "$REPORT_FILE"
  exit 1
fi
echo "RDV_ID=$RDV_ID" | tee -a "$REPORT_FILE"

# 8) Confirm rendez-vous by secretary
request POST "$API_BASE_URL/secretaire/demandes/$RDV_ID/approuver" "{}" "$SECRETARY_TOKEN"
log_step "rendez-vous.confirmer(secretaire)"
assert_status "200" "rendez-vous.confirmer(secretaire)"

request GET "$API_BASE_URL/rendez-vous/$RDV_ID" "" "$PATIENT_TOKEN"
log_step "rendez-vous.get.after-confirm"
assert_status "200" "rendez-vous.get.after-confirm"
assert_json_expr '.data.statut == "confirme" or .data.statut == "paye"' "rendez-vous status after confirm"
if printf '%s' "$RESP_BODY" | grep -q '"password"'; then
  echo "[FAIL] Sensitive data leak detected in rendez-vous.get response" | tee -a "$REPORT_FILE"
  exit 1
fi

# 9) Payment flow
INIT_PAYLOAD="$(
  jq -nc \
    --argjson rendezVousId "$RDV_ID" \
    '{rendezVousId:$rendezVousId,methode:"wave"}'
)"
request POST "$API_BASE_URL/paiements/initier" "$INIT_PAYLOAD" "$PATIENT_TOKEN"
log_step "paiements.initiate(patient)"
assert_status "201" "paiements.initiate(patient)"
PAIEMENT_ID="$(printf '%s' "$RESP_BODY" | jq -r '.data.id // empty')"
if [[ -z "$PAIEMENT_ID" ]]; then
  echo "[FAIL] Missing PAIEMENT_ID after paiements.initiate" | tee -a "$REPORT_FILE"
  exit 1
fi
echo "PAIEMENT_ID=$PAIEMENT_ID" | tee -a "$REPORT_FILE"

PAY_PAYLOAD='{"confirmationCode":"123456"}'
request POST "$API_BASE_URL/paiements/$PAIEMENT_ID/payer" "$PAY_PAYLOAD" "$PATIENT_TOKEN"
log_step "paiements.pay(patient)"
assert_status "200" "paiements.pay(patient)"
assert_json_expr '.data.statut == "paye"' "paiements.pay status"

request GET "$API_BASE_URL/paiements/$PAIEMENT_ID" "" "$PATIENT_TOKEN"
log_step "paiements.getById(patient)"
assert_status "200" "paiements.getById(patient)"
assert_json_expr '.data.id == '"$PAIEMENT_ID"'' "paiements.getById id"
assert_json_expr '.data.statut == "paye"' "paiements.getById status"

request GET "$API_BASE_URL/patient/mes-paiements" "" "$PATIENT_TOKEN"
log_step "patient.mes-paiements.after"
assert_status "200" "patient.mes-paiements.after"
assert_json_expr '.data | map(.id) | index('"$PAIEMENT_ID"') != null' "patient.mes-paiements contains paiement"

request GET "$API_BASE_URL/patient/mes-rendez-vous" "" "$PATIENT_TOKEN"
log_step "patient.mes-rdv.after"
assert_status "200" "patient.mes-rdv.after"
assert_json_expr '.data | map(.id) | index('"$RDV_ID"') != null' "patient.mes-rdv contains rdv"
assert_json_expr '.data[] | select(.id == '"$RDV_ID"') | .statut == "paye"' "patient.mes-rdv status paye"

echo
echo "[PASS] E2E patient flow succeeded." | tee -a "$REPORT_FILE"
echo "Report: $REPORT_FILE" | tee -a "$REPORT_FILE"
