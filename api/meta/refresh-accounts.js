import {
  assertCanManageMeta,
  assertProjectAccess,
  buildSelection,
  fetchMetaAccountsSnapshot,
  getGraphVersion,
  getSupabaseOrThrow,
  loadProjectConnection,
  parseJsonBody,
  sanitizeConnection,
  verifyCurrentUser,
} from '../../server/utils/metaOAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = parseJsonBody(req);
    const projectId = typeof body?.projectId === 'string' ? body.projectId.trim() : '';

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const supabase = getSupabaseOrThrow();
    const { user, profile } = await verifyCurrentUser(req, supabase);

    assertCanManageMeta(profile);
    await assertProjectAccess({ supabase, projectId, userId: user.id });

    const connection = await loadProjectConnection(supabase, projectId);
    if (!connection) {
      return res.status(404).json({ error: 'No Meta connection found for this project' });
    }

    if (!connection.user_access_token) {
      return res.status(400).json({ error: 'Meta user token is missing. Reconnect Meta.' });
    }

    const snapshot = await fetchMetaAccountsSnapshot({
      userAccessToken: connection.user_access_token,
      graphVersion: getGraphVersion(),
    });

    const selection = buildSelection({
      pageAccounts: snapshot.pageAccounts,
      adAccounts: snapshot.adAccounts,
      selectedPageId: connection.selected_page_id,
      selectedAdAccountId: connection.selected_ad_account_id,
    });

    const { error: updateError } = await supabase
      .from('project_meta_connections')
      .update({
        meta_user_id: snapshot.metaUserId || connection.meta_user_id,
        meta_user_name: snapshot.metaUserName || connection.meta_user_name,
        page_accounts: snapshot.pageAccounts,
        ad_accounts: snapshot.adAccounts,
        granted_scopes: snapshot.grantedScopes,
        last_synced_at: new Date().toISOString(),
        ...selection,
      })
      .eq('project_id', projectId);

    if (updateError) {
      throw Object.assign(new Error(`Could not refresh Meta accounts: ${updateError.message}`), { status: 500 });
    }

    const updated = await loadProjectConnection(supabase, projectId);
    return res.status(200).json({
      ...sanitizeConnection(updated),
      warning: snapshot.adAccountsWarning || null,
    });
  } catch (error) {
    const status = error?.status || 500;
    return res.status(status).json({
      error: error?.message || 'Failed to refresh Meta accounts',
    });
  }
}

