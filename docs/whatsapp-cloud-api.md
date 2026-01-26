# WhatsApp Cloud API (Vercel + Supabase)

## 1) Meta setup (Cloud API)
1. Meta Developers -> Your app (Business).
2. Add product: WhatsApp.
3. In WhatsApp -> Getting Started, create/select:
   - WhatsApp Business Account (WABA)
   - Phone number
4. Generate a System User token (recommended for production):
   - Business Settings -> Users -> System Users -> Add
   - Assign the System User to the app and WABA
   - Generate token with scopes:
     - whatsapp_business_messaging
     - whatsapp_business_management
5. Webhook:
   - Object: whatsapp_business_account
   - Callback URL: `https://<your-domain>/api/whatsapp-webhook`
   - Verify Token: any fixed string (save it as env var)
   - Subscribe to field: messages

## 2) Environment variables (Vercel)
Set these in Vercel project settings:
```
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=...
WHATSAPP_API_VERSION=v18.0
META_APP_SECRET=... (optional, for signature validation)
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
```

## 3) Supabase tables
Run the SQL in `supabase_schema_whatsapp.sql`.
Then run `supabase/whatsapp-ai-toggle.sql` to add the `ai_enabled` toggle
with default `true` (bot ON).

## 4) Endpoints
- GET `/api/whatsapp-webhook`
  - Used by Meta to verify the webhook.
- POST `/api/whatsapp-webhook`
  - Receives inbound messages and statuses.
  - Stores them in `whatsapp_messages` and updates `whatsapp_threads` (if Supabase env vars exist).
- POST `/api/whatsapp-send`
  - Sends outbound messages.
- POST `/api/whatsapp-ai-toggle`
  - Toggles AI bot per WhatsApp thread and optionally notifies n8n.

## 5) AI tool description (agent)
Use this tool ONLY when the user explicitly asks to stop or resume the bot.
It updates `whatsapp_threads.ai_enabled` and notifies n8n for orchestration.

Name: `whatsapp_ai_toggle`
Description: "Disable or enable the WhatsApp AI bot for a specific thread ONLY when the user explicitly requests it. Do not change the bot state proactively. Required: wa_id. Optional: action ('disable'|'enable') or ai_enabled (boolean), client_id, thread_id, reason."
Endpoint: `POST /api/whatsapp-ai-toggle`

### Example: send a text message
```
curl -X POST https://<your-domain>/api/whatsapp-send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5989XXXXXXXX",
    "text": "Hola! Este es un mensaje de prueba"
  }'
```

### Example: send a template
```
curl -X POST https://<your-domain>/api/whatsapp-send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5989XXXXXXXX",
    "template": {
      "name": "mi_template",
      "language": "es",
      "components": []
    }
  }'
```

## Notes
- WhatsApp requires template messages outside the 24h window.
- If you set META_APP_SECRET, the webhook will validate signatures when possible.
