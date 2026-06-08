#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Stripe Webhook – Local Development Forward
# ──────────────────────────────────────────────────────────────────────────────
# This script forwards Stripe webhook events to your local dev server.
#
# Prerequisites:
#   1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
#      brew install stripe/stripe-cli/stripe
#
#   2. Login once:
#      stripe login
#
# Usage:
#   ./scripts/stripe-webhook.sh
#
# The script will print a webhook signing secret (whsec_...).
# Copy it to your .env.local as STRIPE_WEBHOOK_SECRET.
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

PORT="${PORT:-3000}"
ENDPOINT="http://localhost:${PORT}/api/webhooks/stripe"

echo "╭───────────────────────────────────────────────╮"
echo "│  Stripe Webhook Forward → Local Dev           │"
echo "╰───────────────────────────────────────────────╯"
echo ""
echo "→ Forwarding events to: $ENDPOINT"
echo "→ Copy the 'whsec_...' secret below to .env.local"
echo ""

stripe listen --forward-to "$ENDPOINT"
