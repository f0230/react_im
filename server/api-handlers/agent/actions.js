/**
 * Agent Actions Handler
 *
 * Handles all write/query operations that the VPS Hermes agent needs:
 *
 *   POST  action=post-message      → Insert bot message into team_messages, reset buffer
 *   POST  action=log-run           → Create/update an agent_run audit record
 *   POST  action=complete-run      → Mark agent_run as completed/failed + save stats
 *   GET   action=pending-channels  → List channels with activity but no recent bot response
 *   POST  action=reset-buffer      → Reset message_count after bot responds
 *
 * Auth: Bearer AGENT_SECRET
 */

import { getSupabaseAdmin } from '../../utils/supabaseServer.js';
import { validateAgentSecret } from './auth.js';

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body); } catch { return {}; }
}

function getParam(req, key) {
  return (
    req.query?.[key] ??
    (() => {
      try { return new URL(req.url, 'http://localhost').searchParams.get(key); } catch { return null; }
    })()
  );
}

// ─── post-message ─────────────────────────────────────────────────────────────
// Inserts a bot message into team_messages and resets the buffer counter.

async function handlePostMessage(req, res, supabase) {
  const body = parseBody(req);
  const channelId = body.channel_id;
  const text      = (body.body || body.text || '').trim();
  const replyToId = body.reply_to_id || null;
  const runId     = body.run_id || null;

  if (!channelId) return res.status(400).json({ error: 'Missing channel_id' });
  if (!text)      return res.status(400).json({ error: 'Missing body/text' });

  const agentName      = process.env.AGENT_DISPLAY_NAME || 'dte';
  const agentProfileId = process.env.AGENT_PROFILE_ID   || null;

  if (!agentProfileId) {
    return res.status(500).json({ error: 'AGENT_PROFILE_ID is not configured' });
  }

  // Insert the bot message
  const { data: message, error: insertError } = await supabase
    .from('team_messages')
    .insert({
      channel_id:   channelId,
      author_id:    agentProfileId,
      author_name:  agentName,
      body:         text.slice(0, 5000),
      message_type: 'text',
      reply_to_id:  replyToId,
    })
    .select('id, created_at')
    .single();

  if (insertError) {
    console.error('[agent/actions] post-message insert error:', insertError);
    return res.status(500).json({ error: insertError.message });
  }

  // Reset the buffer counter and update last_bot_response_at in parallel
  const now = new Date().toISOString();
  const updateOps = [
    supabase
      .from('agent_context')
      .update({
        message_count_since_response: 0,
        last_bot_response_at:         now,
        updated_at:                   now,
      })
      .eq('channel_id', channelId),
  ];

  // If we have a run_id, record which message was the response
  if (runId && message?.id) {
    updateOps.push(
      supabase
        .from('agent_runs')
        .update({ response_message_id: message.id })
        .eq('id', runId)
    );
  }

  await Promise.allSettled(updateOps);

  return res.status(200).json({
    ok:         true,
    message_id: message?.id ?? null,
    created_at: message?.created_at ?? null,
  });
}

// ─── log-run ──────────────────────────────────────────────────────────────────
// Creates a new agent_run record at the start of an invocation.

async function handleLogRun(req, res, supabase) {
  const body = parseBody(req);

  const {
    channel_id,
    project_id,
    trigger_type,
    trigger_message_id,
    model_orchestrator,
    model_classifier,
  } = body;

  if (!channel_id)    return res.status(400).json({ error: 'Missing channel_id' });
  if (!trigger_type)  return res.status(400).json({ error: 'Missing trigger_type' });

  const validTriggers = ['mention', 'keyword', 'cron', 'manual'];
  if (!validTriggers.includes(trigger_type)) {
    return res.status(400).json({ error: `trigger_type must be one of: ${validTriggers.join(', ')}` });
  }

  const { data: run, error } = await supabase
    .from('agent_runs')
    .insert({
      channel_id,
      project_id:          project_id ?? null,
      trigger_type,
      trigger_message_id:  trigger_message_id ?? null,
      status:              'running',
      model_orchestrator:  model_orchestrator ?? null,
      model_classifier:    model_classifier ?? null,
    })
    .select('id, created_at')
    .single();

  if (error) {
    console.error('[agent/actions] log-run insert error:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true, run_id: run.id, created_at: run.created_at });
}

// ─── complete-run ─────────────────────────────────────────────────────────────
// Updates an agent_run with the final outcome, stats and tool call log.

async function handleCompleteRun(req, res, supabase) {
  const body = parseBody(req);
  const { run_id, status, tokens_used, cost_usd, classifier_decision, tool_calls_log, error_message } = body;

  if (!run_id) return res.status(400).json({ error: 'Missing run_id' });

  const validStatuses = ['completed', 'failed', 'skipped'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  const { error } = await supabase
    .from('agent_runs')
    .update({
      status,
      tokens_used:          tokens_used   ?? 0,
      cost_usd:             cost_usd      ?? 0,
      classifier_decision:  classifier_decision ?? null,
      tool_calls_log:       tool_calls_log ?? [],
      error_message:        error_message ?? null,
      completed_at:         new Date().toISOString(),
    })
    .eq('id', run_id);

  if (error) {
    console.error('[agent/actions] complete-run update error:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
}

// ─── pending-channels ─────────────────────────────────────────────────────────
// Returns channels that have new activity but no recent bot response.
// Used by the VPS cron job to decide which channels Hermes should review.

async function handlePendingChannels(req, res, supabase) {
  const windowHours = Number(getParam(req, 'window_hours') ?? 24);
  const minMessages = Number(getParam(req, 'min_messages') ?? 1);

  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('agent_context')
    .select(`
      channel_id,
      project_id,
      message_count_since_response,
      last_message_at,
      last_bot_response_at,
      team_channels!inner(name, slug)
    `)
    .gte('last_message_at', cutoff)
    .gte('message_count_since_response', minMessages)
    .order('last_message_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[agent/actions] pending-channels error:', error);
    return res.status(500).json({ error: error.message });
  }

  const channels = (data || []).map(row => ({
    channel_id:                   row.channel_id,
    project_id:                   row.project_id,
    channel_name:                 row.team_channels?.name,
    channel_slug:                 row.team_channels?.slug,
    message_count_since_response: row.message_count_since_response,
    last_message_at:              row.last_message_at,
    last_bot_response_at:         row.last_bot_response_at,
    // Simple staleness score: more messages + older last response = higher priority
    priority_score: row.message_count_since_response +
      (row.last_bot_response_at
        ? Math.floor((Date.now() - new Date(row.last_bot_response_at).getTime()) / 3600000)
        : 24),
  })).sort((a, b) => b.priority_score - a.priority_score);

  return res.status(200).json({ ok: true, channels, count: channels.length });
}

// ─── Main dispatcher ──────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const auth = validateAgentSecret(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(500).json({ error: 'Supabase admin not configured' });

  const action = getParam(req, 'action');

  try {
    switch (action) {
      case 'post-message':
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
        return await handlePostMessage(req, res, supabase);

      case 'log-run':
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
        return await handleLogRun(req, res, supabase);

      case 'complete-run':
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
        return await handleCompleteRun(req, res, supabase);

      case 'pending-channels':
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        return await handlePendingChannels(req, res, supabase);

      default:
        return res.status(400).json({
          error:     'Missing or unknown action',
          available: ['post-message', 'log-run', 'complete-run', 'pending-channels'],
        });
    }
  } catch (err) {
    console.error(`[agent/actions/${action}] unhandled error:`, err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
