import {
  assertCanManageMeta,
  assertProjectAccess,
  buildSelection,
  getQueryParam,
  getSupabaseOrThrow,
  loadProjectConnection,
  parseJsonBody,
  sanitizeConnection,
  verifyCurrentUser,
} from '../../server/utils/metaOAuth.js';

function normalizeNullableText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function resolveProjectId(req, body = {}) {
  return (
    getQueryParam(req, 'projectId')
    || normalizeNullableText(body?.projectId)
  );
}

export default async function handler(req, res) {
  const method = req.method || 'GET';
  if (!['GET', 'POST', 'DELETE'].includes(method)) {
    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = parseJsonBody(req);
    const projectId = resolveProjectId(req, body);

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const supabase = getSupabaseOrThrow();
    const { user, profile } = await verifyCurrentUser(req, supabase);
    await assertProjectAccess({ supabase, projectId, userId: user.id });

    if (method === 'GET') {
      const connection = await loadProjectConnection(supabase, projectId);
      return res.status(200).json(sanitizeConnection(connection));
    }

    assertCanManageMeta(profile);

    if (method === 'DELETE') {
      const { error: deleteError } = await supabase
        .from('project_meta_connections')
        .delete()
        .eq('project_id', projectId);

      if (deleteError) {
        throw Object.assign(new Error(`Could not disconnect Meta integration: ${deleteError.message}`), { status: 500 });
      }

      return res.status(200).json({
        disconnected: true,
        projectId,
      });
    }

    const connection = await loadProjectConnection(supabase, projectId);
    if (!connection) {
      return res.status(404).json({ error: 'No Meta connection found for this project' });
    }

    const pageAccounts = Array.isArray(connection.page_accounts) ? connection.page_accounts : [];
    const adAccounts = Array.isArray(connection.ad_accounts) ? connection.ad_accounts : [];

    const hasPageSelection = Object.prototype.hasOwnProperty.call(body, 'selectedPageId');
    const hasAdSelection = Object.prototype.hasOwnProperty.call(body, 'selectedAdAccountId');

    if (!hasPageSelection && !hasAdSelection) {
      return res.status(400).json({ error: 'Nothing to update. Provide selectedPageId and/or selectedAdAccountId' });
    }

    const selectedPageId = hasPageSelection
      ? normalizeNullableText(body.selectedPageId)
      : connection.selected_page_id;
    const selectedAdAccountId = hasAdSelection
      ? normalizeNullableText(body.selectedAdAccountId)
      : connection.selected_ad_account_id;

    if (selectedPageId && !pageAccounts.some((item) => item?.id === selectedPageId)) {
      return res.status(400).json({ error: 'selectedPageId is not part of available pages' });
    }

    if (selectedAdAccountId && !adAccounts.some((item) => item?.id === selectedAdAccountId)) {
      return res.status(400).json({ error: 'selectedAdAccountId is not part of available ad accounts' });
    }

    const selection = buildSelection({
      pageAccounts,
      adAccounts,
      selectedPageId,
      selectedAdAccountId,
    });

    const { error: updateError } = await supabase
      .from('project_meta_connections')
      .update({
        ...selection,
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', projectId);

    if (updateError) {
      throw Object.assign(new Error(`Could not update Meta selection: ${updateError.message}`), { status: 500 });
    }

    const updated = await loadProjectConnection(supabase, projectId);
    return res.status(200).json(sanitizeConnection(updated));
  } catch (error) {
    const status = error?.status || 500;
    return res.status(status).json({
      error: error?.message || 'Meta connection request failed',
    });
  }
}

