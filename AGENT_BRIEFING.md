# @dte Agent — VPS Implementation Briefing

This document is the complete spec for the Hermes agent service that runs on the VPS.
The DTE backend (Vercel) is already built and ready. This service is the brain.

---

## What this service does

`dte-agent` is an ambient agent that lives inside the Grupo DTE team chat.
It is NOT a chatbot that responds to every message.
It is an **observer + orchestrator** that:

1. Is notified on every new message (via Supabase webhook → DTE buffer API)
2. Accumulates context silently in the background
3. Responds only when triggered: `@dte` mention, detected keywords, or a cron scan
4. Before responding, enriches its context with project data and Notion (tasks, campaigns, meetings)
5. Uses Hermes as the orchestrator — a tool-calling loop that can take multiple actions before posting

---

## Repository structure to build

```
dte-agent/
├── main.py                  # FastAPI entrypoint (webhook receiver + health check)
├── orchestrator.py          # Main Hermes agent loop (tool calling)
├── classifier.py            # Cheap model: should the agent respond? yes/no
├── workers/
│   ├── __init__.py
│   ├── base.py              # BaseWorker ABC
│   ├── content.py           # Calls DTE /api/content for copy generation
│   └── notion.py            # Direct Notion reads (if DTE API isn't enough)
├── tools/
│   ├── __init__.py
│   ├── registry.py          # All tool definitions in OpenAI function format
│   └── executor.py          # Dispatches tool calls from Hermes → real functions
├── dte_client.py            # HTTP client for all DTE API calls
├── config.py                # Pydantic Settings (reads .env)
├── scheduler.py             # APScheduler cron: scans pending channels
├── prompts/
│   ├── orchestrator.txt     # System prompt for @dte (Hermes)
│   └── classifier.txt       # System prompt for the classifier
└── requirements.txt
```

---

## Environment variables (.env on VPS)

```env
# DTE Backend
DTE_API_URL=https://app.grupodte.com
AGENT_SECRET=<same value as in DTE .env>

# Hermes (OpenAI-compatible endpoint already running on this VPS)
HERMES_BASE_URL=http://127.0.0.1:18789/v1
HERMES_API_KEY=<your key>
HERMES_MODEL=NousResearch/Hermes-3-Llama-3.1-70B-Instruct

# Classifier (cheap model — can be Anthropic Haiku or a small local model)
CLASSIFIER_PROVIDER=anthropic          # or 'openai', 'hermes'
CLASSIFIER_MODEL=claude-haiku-4-5-20251001
CLASSIFIER_API_KEY=<anthropic key>

# Cron
CRON_INTERVAL_MINUTES=30              # how often to scan pending channels
CRON_MIN_MESSAGES=3                   # min new messages before cron considers a channel

# Server
PORT=8100
```

---

## DTE API Reference

All calls require: `Authorization: Bearer <AGENT_SECRET>`
Base URL: `https://app.grupodte.com`

### GET /api/agent/context?channel_id=<uuid>

Returns the full enriched context package for a channel.

```json
{
  "channel": { "id": "...", "name": "GRUPO DTE", "slug": "grupo-dte", "project_id": "..." },
  "project": {
    "id": "...", "name": "...", "description": "...", "objective": "...", "status": "active",
    "notion_tasks_db_id": "...", "notion_campaigns_db_id": "...", "notion_db_id": "..."
  },
  "team": [
    { "id": "...", "name": "Fede", "email": "fede@...", "project_role": "lead", "platform_role": "admin" }
  ],
  "notion": {
    "available": true,
    "tasks": [{ "id": "...", "title": "...", "status": "In Progress", "assignees": ["Fede"], "due_date": "2026-06-01" }],
    "campaigns": [{ "id": "...", "title": "...", "status": "Active", "platform": "Instagram", "start_date": "..." }],
    "meetings": [{ "id": "...", "title": "...", "date": "...", "summary": "..." }]
  },
  "context": {
    "message_buffer": [
      { "id": "...", "author_name": "Fede", "body": "bro que andas?", "created_at": "..." }
    ],
    "buffer_summary": null,
    "message_count_since_response": 7,
    "last_message_at": "...",
    "last_bot_response_at": "..."
  }
}
```

### POST /api/agent/buffer-update

Called automatically by Supabase Database Webhook. You don't need to call this manually.
But you can call it to test or seed the buffer.

```json
// Body (Supabase webhook format)
{
  "type": "INSERT",
  "table": "team_messages",
  "record": {
    "id": "...", "channel_id": "...", "body": "@dte qué campañas tenemos?",
    "author_name": "Fede", "author_id": "...", "message_type": "text", "created_at": "..."
  }
}

// Response
{ "ok": true, "channel_id": "...", "buffer_size": 8, "message_count": 8,
  "triggers": [{"type": "mention", "urgency": "high"}],
  "urgency": "high", "invoke_agent_now": true }
```

### POST /api/agent/post-message

Posts the agent's response to a channel.

```json
// Body
{ "channel_id": "...", "body": "Fede, vi que tenemos 2 campañas activas...", "reply_to_id": null, "run_id": "..." }

// Response
{ "ok": true, "message_id": "...", "created_at": "..." }
```

### POST /api/agent/log-run

Creates an agent_run audit record at the start of a run.

```json
// Body
{ "channel_id": "...", "project_id": "...", "trigger_type": "mention",
  "trigger_message_id": "...", "model_orchestrator": "Hermes-3-70B", "model_classifier": "claude-haiku-4-5" }

// Response
{ "ok": true, "run_id": "...", "created_at": "..." }
```

### POST /api/agent/complete-run

Finalizes the audit record.

```json
// Body
{ "run_id": "...", "status": "completed", "tokens_used": 1240, "cost_usd": 0.0031,
  "classifier_decision": { "should_respond": true, "reason": "...", "urgency": "high" },
  "tool_calls_log": [{"tool": "get_notion_tasks", "args": {...}, "result_size": 5}] }
```

### GET /api/agent/pending-channels?window_hours=24&min_messages=3

Returns channels that need cron attention.

```json
{
  "ok": true,
  "channels": [
    { "channel_id": "...", "channel_name": "GRUPO DTE", "project_id": "...",
      "message_count_since_response": 12, "last_message_at": "...", "priority_score": 18 }
  ]
}
```

### POST /api/content?type=copywriter (for copy generation tool)

Auth: same AGENT_SECRET (the content endpoint also accepts it via the agent API auth).

```json
// Body
{ "projectId": "...", "brief": "Post sobre el lanzamiento de campaña Meta", "selectedPlatforms": ["instagram"] }

// Response
{ "ok": true, "output": { "copy": "...", "hook": "...", "cta": "...", "hashtags": ["#..."] } }
```

---

## Orchestrator pattern

The agent runs in three tiers:

```
TIER 1 — CLASSIFIER (cheap, always runs when agent is triggered)
  Input:  message_buffer (last N messages as plain text)
  Output: { should_respond: bool, reason: str, urgency: 'low'|'medium'|'high',
            suggested_action: 'answer'|'create_task'|'summarize'|'none' }
  Cost:   ~$0.001 per check

  IF should_respond = false → log run as 'skipped', exit

TIER 2 — CONTEXT ENRICHMENT (zero cost, runs in parallel)
  - Fetch /api/agent/context (already has Notion embedded)
  - Build the context_package for Hermes

TIER 3 — HERMES ORCHESTRATOR (runs only when classifier says yes)
  Input:  system_prompt + context_package + tool definitions
  Loop:
    → Hermes responds
    → If finish_reason == 'tool_calls': execute tools, loop back
    → If finish_reason == 'stop': post response, exit loop
  Cost:   ~$0.01-0.05 per full run
```

---

## Tool definitions (pass to Hermes)

```python
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_project_context",
            "description": "Returns full project info, team members, and Notion data (tasks, campaigns, meetings). Always call this first to understand the project state before responding.",
            "parameters": {
                "type": "object",
                "properties": {
                    "channel_id": {"type": "string", "description": "UUID of the channel"}
                },
                "required": ["channel_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "post_message",
            "description": "Send a message to the team channel as @dte. Use this to respond, summarize, or alert the team. Keep messages concise (max 8 lines unless asked for more).",
            "parameters": {
                "type": "object",
                "properties": {
                    "channel_id": {"type": "string"},
                    "body": {"type": "string", "description": "The message text. Use markdown sparingly."},
                    "reply_to_id": {"type": "string", "description": "Optional: message UUID to reply to"}
                },
                "required": ["channel_id", "body"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_copy",
            "description": "Generate a social media post using the project's brand voice. Use when someone asks for a caption, text, or content for a specific platform.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_id": {"type": "string"},
                    "brief": {"type": "string", "description": "What the post should communicate. Be specific."},
                    "platforms": {"type": "array", "items": {"type": "string"}, "description": "e.g. ['instagram', 'linkedin']"}
                },
                "required": ["project_id", "brief"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "no_action",
            "description": "Call this when the conversation doesn't require @dte to intervene. Use instead of posting an unnecessary message.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reason": {"type": "string", "description": "Why no action is needed"}
                },
                "required": ["reason"]
            }
        }
    }
]
```

---

## System prompt for Hermes (prompts/orchestrator.txt)

```
Sos @dte, el agente operativo de Grupo DTE.

Existís dentro del chat interno del equipo. Tu rol es apoyar al equipo — no reemplazarlo.

## Cómo actuás
- Recibís el contexto del canal: los últimos mensajes, datos del proyecto y estado de Notion.
- Antes de responder, revisás si hay tareas abiertas, campañas activas o acuerdos previos relevantes.
- Respondés de forma concreta, sin relleno. Máximo 8 líneas salvo que te pidan más detalle.
- Usás español rioplatense, como un colega técnico y operativo.

## Cuándo hablar
- Si te mencionan (@dte): siempre respondés.
- Si detectás una pregunta sin respuesta o un bloqueo operativo: intervenís.
- Si no tenés nada concreto que aportar: usás no_action. El silencio es mejor que el ruido.

## Cuándo NO hablar
- Conversaciones sociales o casuales sin pedido operativo.
- Temas que el equipo claramente ya está manejando.
- Si ya respondiste recientemente sobre el mismo tema.

## Lo que NUNCA hacés
- Inventar datos, fechas, resultados o compromisos que no existen.
- Prometer cosas que no dependen de vos.
- Repetir información que el equipo ya tiene en pantalla.

## Herramientas disponibles
Tenés acceso a: get_project_context, post_message, generate_copy, no_action.
Usá get_project_context primero para entender el estado real del proyecto antes de responder.
```

---

## System prompt for classifier (prompts/classifier.txt)

```
Sos un clasificador de conversaciones de equipo. Tu única tarea es decidir si el agente @dte debe intervenir.

Analizás los últimos mensajes del canal y respondés SOLO con JSON válido:

{
  "should_respond": true/false,
  "reason": "una línea explicando el porqué",
  "urgency": "high" | "medium" | "low",
  "suggested_action": "answer" | "create_task" | "summarize" | "none"
}

Criterios para should_respond = true:
- Hay una pregunta directa sin respuesta en el canal
- Alguien menciona un bloqueo o problema operativo
- Se discute una tarea sin asignado o sin fecha
- Hay confusión sobre responsabilidades o próximos pasos
- Se pide contenido, copy o información concreta

Criterios para should_respond = false:
- La conversación es solo coordinación casual (horarios, saludos)
- El equipo ya resolvió el tema en los mensajes
- No hay acción concreta que el agente pueda tomar
- La última respuesta del agente ya cubrió el tema

Sé conservador: el silencio es mejor que interrumpir innecesariamente.
```

---

## main.py — FastAPI entrypoint

```python
from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from config import settings
from orchestrator import run_agent
from scheduler import start_scheduler

app = FastAPI(title="dte-agent")

@app.on_event("startup")
async def startup():
    start_scheduler()

@app.get("/health")
def health():
    return {"ok": True, "agent": "@dte"}

@app.post("/webhook/buffer-update")
async def buffer_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Supabase Database Webhook hits this endpoint on every team_messages INSERT.
    We forward to DTE API to update the buffer, then check if we should invoke Hermes.
    """
    body = await request.json()
    record = body.get("record", body)
    channel_id = record.get("channel_id")

    if not channel_id:
        return JSONResponse({"ok": False, "error": "no channel_id"}, status_code=400)

    # Forward to DTE buffer API
    from dte_client import DTEClient
    client = DTEClient()
    result = await client.buffer_update(record)

    # If high urgency trigger detected, run agent in background
    if result.get("invoke_agent_now"):
        trigger_msg_id = record.get("id")
        trigger_type = "mention" if any(
            t["type"] == "mention" for t in result.get("triggers", [])
        ) else "keyword"
        background_tasks.add_task(
            run_agent,
            channel_id=channel_id,
            trigger_type=trigger_type,
            trigger_message_id=trigger_msg_id,
        )

    return JSONResponse(result)

@app.post("/run")
async def manual_run(request: Request, background_tasks: BackgroundTasks):
    """Manual trigger for testing."""
    body = await request.json()
    background_tasks.add_task(
        run_agent,
        channel_id=body["channel_id"],
        trigger_type="manual",
        trigger_message_id=None,
    )
    return {"ok": True, "queued": True}
```

---

## orchestrator.py — Hermes agent loop

```python
import json
from openai import AsyncOpenAI
from dte_client import DTEClient
from classifier import Classifier
from tools.registry import TOOLS
from tools.executor import execute_tool
from config import settings

hermes = AsyncOpenAI(base_url=settings.HERMES_BASE_URL, api_key=settings.HERMES_API_KEY)
classifier = Classifier()
client = DTEClient()

SYSTEM_PROMPT = open("prompts/orchestrator.txt").read()

async def run_agent(channel_id: str, trigger_type: str, trigger_message_id: str | None):
    # 1. Fetch context
    ctx = await client.get_context(channel_id)
    if not ctx:
        return

    buffer = ctx["context"]["message_buffer"]
    if not buffer:
        return

    # 2. Classify: should we respond?
    classifier_result = await classifier.should_respond(buffer)

    run = await client.log_run(
        channel_id=channel_id,
        project_id=ctx.get("project", {}).get("id"),
        trigger_type=trigger_type,
        trigger_message_id=trigger_message_id,
        model_orchestrator=settings.HERMES_MODEL,
        model_classifier=settings.CLASSIFIER_MODEL,
    )
    run_id = run["run_id"]

    if not classifier_result["should_respond"] and trigger_type not in ("mention", "manual"):
        await client.complete_run(run_id, status="skipped",
                                  classifier_decision=classifier_result)
        return

    # 3. Build context message for Hermes
    context_text = build_context_text(ctx)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": context_text},
    ]

    tool_calls_log = []
    tokens_used = 0
    posted = False

    # 4. Hermes tool-calling loop
    for _ in range(8):  # max 8 iterations to prevent infinite loops
        response = await hermes.chat.completions.create(
            model=settings.HERMES_MODEL,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            temperature=0.3,
        )

        choice = response.choices[0]
        tokens_used += response.usage.total_tokens if response.usage else 0
        messages.append(choice.message.model_dump())

        if choice.finish_reason == "stop":
            # Final text response — post it
            final_text = choice.message.content
            if final_text and final_text.strip():
                await client.post_message(
                    channel_id=channel_id,
                    body=final_text.strip(),
                    reply_to_id=trigger_message_id,
                    run_id=run_id,
                )
                posted = True
            break

        if choice.finish_reason == "tool_calls":
            for tc in choice.message.tool_calls:
                args = json.loads(tc.function.arguments)
                result = await execute_tool(tc.function.name, args, ctx, client)

                tool_calls_log.append({
                    "tool": tc.function.name,
                    "args": args,
                    "result_preview": str(result)[:200],
                })

                # no_action = agent decided not to respond
                if tc.function.name == "no_action":
                    await client.complete_run(run_id, status="skipped",
                                              classifier_decision=classifier_result,
                                              tool_calls_log=tool_calls_log)
                    return

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result),
                })

    await client.complete_run(
        run_id=run_id,
        status="completed" if posted else "skipped",
        tokens_used=tokens_used,
        classifier_decision=classifier_result,
        tool_calls_log=tool_calls_log,
    )

def build_context_text(ctx: dict) -> str:
    project = ctx.get("project") or {}
    team    = ctx.get("team", [])
    notion  = ctx.get("notion", {})
    buffer  = ctx.get("context", {}).get("message_buffer", [])

    lines = [
        f"## Canal: {ctx['channel']['name']}",
        f"## Proyecto: {project.get('name') or project.get('title') or 'Sin proyecto'}",
        f"Descripción: {project.get('description', 'N/A')}",
        f"Estado: {project.get('status', 'N/A')}",
        f"Objetivo: {project.get('objective', 'N/A')}",
        "",
        f"## Equipo ({len(team)} miembros)",
    ]
    for m in team:
        lines.append(f"  - {m['name']} ({m['project_role']})")

    if notion.get("tasks"):
        lines.append(f"\n## Tareas en Notion ({len(notion['tasks'])} total)")
        for t in notion["tasks"][:10]:
            assignees = ", ".join(t.get("assignees") or []) or "sin asignar"
            lines.append(f"  - [{t['status'] or '?'}] {t['title']} — {assignees}")

    if notion.get("campaigns"):
        lines.append(f"\n## Campañas activas ({len(notion['campaigns'])})")
        for c in notion["campaigns"][:5]:
            lines.append(f"  - [{c['status'] or '?'}] {c['title']} ({c.get('platform') or ''})")

    if notion.get("meetings"):
        lines.append(f"\n## Últimas reuniones")
        for m in notion["meetings"][:3]:
            lines.append(f"  - {m['date'] or '?'}: {m['title']}")

    lines.append("\n## Conversación reciente del canal")
    for msg in buffer[-20:]:
        lines.append(f"[{msg['created_at'][:16]}] {msg['author_name']}: {msg['body']}")

    lines.append("\n---\nRespondé en base a este contexto. Usá las herramientas disponibles.")
    return "\n".join(lines)
```

---

## scheduler.py — Cron job

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dte_client import DTEClient
from orchestrator import run_agent
from config import settings

scheduler = AsyncIOScheduler()
client = DTEClient()

async def cron_scan():
    """Scan all channels with pending activity and run the agent if needed."""
    result = await client.get_pending_channels(
        window_hours=24,
        min_messages=settings.CRON_MIN_MESSAGES,
    )
    channels = result.get("channels", [])

    for ch in channels:
        await run_agent(
            channel_id=ch["channel_id"],
            trigger_type="cron",
            trigger_message_id=None,
        )

def start_scheduler():
    scheduler.add_job(cron_scan, "interval", minutes=settings.CRON_INTERVAL_MINUTES)
    scheduler.start()
```

---

## tools/executor.py

```python
from dte_client import DTEClient

async def execute_tool(name: str, args: dict, ctx: dict, client: DTEClient) -> dict:
    match name:
        case "get_project_context":
            # Already fetched — return from ctx (avoid redundant API call)
            return {
                "project": ctx.get("project"),
                "team": ctx.get("team"),
                "notion": ctx.get("notion"),
            }

        case "post_message":
            result = await client.post_message(
                channel_id=args["channel_id"],
                body=args["body"],
                reply_to_id=args.get("reply_to_id"),
            )
            return {"ok": result.get("ok"), "message_id": result.get("message_id")}

        case "generate_copy":
            result = await client.generate_copy(
                project_id=args["project_id"],
                brief=args["brief"],
                platforms=args.get("platforms", ["instagram"]),
            )
            return result.get("output", {})

        case "no_action":
            return {"no_action": True, "reason": args.get("reason", "")}

        case _:
            return {"error": f"Unknown tool: {name}"}
```

---

## dte_client.py

```python
import httpx
from config import settings

class DTEClient:
    def __init__(self):
        self.base = settings.DTE_API_URL
        self.headers = {
            "Authorization": f"Bearer {settings.AGENT_SECRET}",
            "Content-Type": "application/json",
        }

    async def get_context(self, channel_id: str) -> dict | None:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(f"{self.base}/api/agent/context",
                            params={"channel_id": channel_id}, headers=self.headers)
            return r.json() if r.is_success else None

    async def buffer_update(self, record: dict) -> dict:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(f"{self.base}/api/agent/buffer-update",
                             json={"record": record}, headers=self.headers)
            return r.json()

    async def post_message(self, channel_id: str, body: str,
                           reply_to_id: str | None = None, run_id: str | None = None) -> dict:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(f"{self.base}/api/agent/post-message",
                             json={"channel_id": channel_id, "body": body,
                                   "reply_to_id": reply_to_id, "run_id": run_id},
                             headers=self.headers)
            return r.json()

    async def log_run(self, **kwargs) -> dict:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(f"{self.base}/api/agent/log-run",
                             json=kwargs, headers=self.headers)
            return r.json()

    async def complete_run(self, run_id: str, **kwargs) -> dict:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(f"{self.base}/api/agent/complete-run",
                             json={"run_id": run_id, **kwargs}, headers=self.headers)
            return r.json()

    async def get_pending_channels(self, window_hours=24, min_messages=3) -> dict:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"{self.base}/api/agent/pending-channels",
                            params={"window_hours": window_hours, "min_messages": min_messages},
                            headers=self.headers)
            return r.json()

    async def generate_copy(self, project_id: str, brief: str, platforms: list) -> dict:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(f"{self.base}/api/content",
                             params={"type": "copywriter"},
                             json={"projectId": project_id, "brief": brief,
                                   "selectedPlatforms": platforms},
                             headers=self.headers)
            return r.json() if r.is_success else {}
```

---

## Supabase Database Webhook setup

In the Supabase dashboard:
1. Go to **Database → Webhooks → Create a new hook**
2. Name: `agent-buffer-update`
3. Table: `team_messages`
4. Events: `INSERT` only
5. Webhook URL: `https://<your-vps-ip>:8100/webhook/buffer-update`
6. HTTP Headers:
   - `Authorization: Bearer <AGENT_SECRET>`
7. Save

This will call the VPS FastAPI server on every new message.

---

## n8n cron (alternative to APScheduler)

If you prefer n8n for the cron instead of APScheduler:

1. Create a new workflow in n8n
2. Trigger: **Schedule** → every 30 minutes
3. Node: **HTTP Request**
   - URL: `https://<vps-ip>:8100/run`  (or call DTE pending-channels directly)
   - Method: POST
   - Auth: Bearer AGENT_SECRET
   - Body: `{ "scan_all": true }`
4. Optionally add a Slack/email notification if the agent fails

---

## requirements.txt

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
httpx==0.27.0
openai==1.40.0
anthropic==0.34.0
apscheduler==3.10.4
pydantic-settings==2.4.0
python-dotenv==1.0.1
```

---

## First run checklist

- [ ] `AGENT_SECRET` matches between DTE `.env` (Vercel) and VPS `.env`
- [ ] `AGENT_PROFILE_ID` is a valid UUID from `profiles` table (role = 'worker', email = agent@grupodte.com)
- [ ] `AGENT_DISPLAY_NAME=dte` matches what you use in the chat (`@dte`)
- [ ] Supabase Database Webhook is configured and pointing to the VPS
- [ ] Supabase migration `20260527_agent_infrastructure.sql` has been run
- [ ] Hermes is running and reachable at `HERMES_BASE_URL`
- [ ] Test: `curl -X POST https://app.grupodte.com/api/agent/context?channel_id=<uuid> -H "Authorization: Bearer <secret>"`
- [ ] Test: `curl -X POST http://localhost:8100/run -d '{"channel_id":"<uuid>"}' -H "Content-Type: application/json"`
