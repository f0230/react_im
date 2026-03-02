import { getSupabaseAdmin } from '../server/utils/supabaseServer.js';

function getTokenFromRequest(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim() || null;
}

function parseLimit(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 6;
  return Math.max(1, Math.min(20, Math.trunc(numeric)));
}

function getQueryParam(req, key) {
  if (req.query && Object.prototype.hasOwnProperty.call(req.query, key)) {
    return req.query[key];
  }
  try {
    const url = new URL(req.url, 'http://localhost');
    return url.searchParams.get(key);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const projectId = getQueryParam(req, 'projectId');
  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: 'Server configuration error: missing Supabase credentials' });
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized: invalid token' });
    }

    const userId = authData.user.id;
    const { data: accessData, error: accessError } = await supabase
      .rpc('fn_has_project_access', { p_id: projectId, u_id: userId });

    if (accessError) {
      return res.status(500).json({ error: 'Failed to verify project access', detail: accessError.message });
    }

    if (!accessData) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const limit = parseLimit(getQueryParam(req, 'limit'));
    const { data, error } = await supabase
      .from('project_reports')
      .select('id, period_start, period_end, ai_context_text, created_at')
      .eq('project_id', projectId)
      .not('ai_context_text', 'is', null)
      .order('period_end', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return res.status(500).json({ error: 'Failed to load report context', detail: error.message });
    }

    const reports = (data || []).map((item) => ({
      id: item.id,
      period_start: item.period_start,
      period_end: item.period_end,
      created_at: item.created_at,
      ai_context_text: item.ai_context_text,
    }));

    const context = reports
      .map((item, index) => `Informe ${index + 1}\n${item.ai_context_text}`)
      .join('\n\n---\n\n');

    return res.status(200).json({
      projectId,
      count: reports.length,
      context,
      reports,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
}
