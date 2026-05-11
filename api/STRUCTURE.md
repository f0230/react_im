# API Structure - Consolidated Serverless Functions

## Summary
- **Before**: 13 individual serverless functions (one per file)
- **After**: 6 consolidated serverless functions (one per folder)
- **Status**: Under Vercel limit (12 functions max)

## Functions

### 1. `/api/cal/` - Calendar & Scheduling
- **Handler**: `cal/index.js`
- **Original files**: `cal/index.js`
- **Routes**: Calendar availability, scheduling
- **Query params**: `?action=`

### 2. `/api/integrations/` - Third-party Integrations
- **Handler**: `integrations/index.js`
- **Services**:
  - `figma.js` → Figma OAuth, webhooks, comments
  - `meta.js` → Meta/Facebook Graph API
  - `whatsapp.js` → WhatsApp Business API
  - `notion.js` → Notion database API
- **Query params**: `?service=<figma|meta|whatsapp|notion>`
- **Backward compatibility**: `vercel.json` rewrites handle legacy URLs
  - `/api/figma*` → `/api/integrations?service=figma`
  - `/api/meta*` → `/api/integrations?service=meta`
  - `/api/whatsapp*` → `/api/integrations?service=whatsapp`
  - `/api/notion*` → `/api/integrations?service=notion`

### 3. `/api/content/` - Content Generation & Planning
- **Handler**: `content/index.js`
- **Services**:
  - `copywriter.js` → Post copywriter (AI brand docs)
  - `planner.js` → Services content planner
- **Query params**: `?type=<copywriter|planner>`
- **Backward compatibility**: `vercel.json` rewrites
  - `/api/post-copywriter` → `/api/content?type=copywriter`
  - `/api/services-content-planner` → `/api/content?type=planner`

### 4. `/api/studio-ai/` - Studio & AI Tools
- **Handler**: `studio-ai/index.js`
- **Services**:
  - `studio.js` → KIE API proxy (image generation, Veo, Market)
  - `blotato.js` → Blotato social media scheduler
- **Query params**: `?tool=<studio|blotato>`
- **Backward compatibility**: `vercel.json` rewrites
  - `/api/studio*` → `/api/studio-ai?tool=studio`
  - `/api/blotato*` → `/api/studio-ai?tool=blotato`

### 5. `/api/messaging/` - Messaging & Notifications
- **Handler**: `messaging/index.js`
- **Services**:
  - `chat.js` → ClawBot team chat (context management, summarization)
  - `notifications.js` → Email/Slack notifications, webhooks
- **Query params**: `?type=<chat|notifications>`
- **Backward compatibility**: `vercel.json` rewrites
  - `/api/clawbot-team-chat` → `/api/messaging?type=chat`
  - `/api/notifications` → `/api/messaging?type=notifications`

### 6. `/api/utils/` - Utilities & Admin
- **Handler**: `utils/index.js`
- **Services**:
  - `credits.js` → KIE credits management
  - `reports.js` → Reports pipeline (AI context, data ingestion)
- **Query params**: `?action=<credits|reports>`
- **Backward compatibility**: `vercel.json` rewrites
  - `/api/kie-credits` → `/api/utils?action=credits`
  - `/api/reports*` → `/api/utils?action=reports`

## Migration Notes

### URL Changes
All requests are backward-compatible via `vercel.json` rewrites. No frontend code changes required.

### For New Integrations
When adding a new handler to an existing category:
1. Create the handler file in the appropriate folder (e.g., `api/integrations/newservice.js`)
2. Import it in the folder's `index.js` router
3. Add a case in the switch statement

Example:
```javascript
// api/integrations/index.js
import newServiceHandler from './newservice.js';

switch (service) {
  case 'newservice':
    return await newServiceHandler(req, res);
  // ...
}
```

### Debugging
Enable detailed logging by checking the error responses from routers:
```javascript
// Each router logs: [folder/service] error
console.error(`[integrations/${service}]`, error);
```

## File Organization
```
api/
├── cal/
│   └── index.js
├── content/
│   ├── index.js (router)
│   ├── copywriter.js
│   └── planner.js
├── integrations/
│   ├── index.js (router)
│   ├── figma.js
│   ├── meta.js
│   ├── notion.js
│   └── whatsapp.js
├── messaging/
│   ├── index.js (router)
│   ├── chat.js
│   └── notifications.js
├── studio-ai/
│   ├── index.js (router)
│   ├── blotato.js
│   └── studio.js
└── utils/
    ├── index.js (router)
    ├── credits.js
    └── reports.js
```
