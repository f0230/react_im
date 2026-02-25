import {
  assertCanManageMeta,
  assertProjectAccess,
  buildDashboardReportsUrl,
  buildSelection,
  createSignedState,
  exchangeCodeForUserToken,
  exchangeForLongLivedToken,
  fetchMetaAccountsSnapshot,
  getAppBaseUrl,
  getGraphVersion,
  getMetaRedirectUri,
  getProfileById,
  getQueryParam,
  getRequestedScopes,
  getRequiredMetaConfig,
  getSupabaseOrThrow,
  loadProjectConnection,
  parseJsonBody,
  readStatePayloadUnsafe,
  sanitizeConnection,
  verifyCurrentUser,
  verifySignedState,
} from '../server/utils/metaOAuth.js';

function resolveAction(req) {
  const fromParams = typeof req?.params?.action === 'string' ? req.params.action.trim() : '';
  if (fromParams) return fromParams;

  const fromQuery = getQueryParam(req, 'action');
  if (fromQuery) return fromQuery;

  try {
    const url = new URL(req.url, 'http://localhost');
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'api' && parts[1] === 'meta' && parts[2]) {
      return parts[2];
    }
  } catch {
    // noop
  }

  return '';
}

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

async function handleConnectUrl(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const projectId = getQueryParam(req, 'projectId');
  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  const supabase = getSupabaseOrThrow();
  const { user, profile } = await verifyCurrentUser(req, supabase);
  assertCanManageMeta(profile);
  await assertProjectAccess({ supabase, projectId, userId: user.id });

  const { appId } = getRequiredMetaConfig();
  const graphVersion = getGraphVersion();
  const redirectUri = getMetaRedirectUri(req);
  const scopes = getRequestedScopes();

  const state = createSignedState({
    projectId,
    userId: user.id,
    iat: Date.now(),
  });

  const authUrl = new URL(`https://www.facebook.com/${graphVersion}/dialog/oauth`);
  authUrl.searchParams.set('client_id', appId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes.join(','));
  authUrl.searchParams.set('state', state);

  return res.status(200).json({
    url: authUrl.toString(),
    scopes,
    projectId,
  });
}

async function handleCallback(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const appBaseUrl = getAppBaseUrl(req);
  const state = getQueryParam(req, 'state');
  const code = getQueryParam(req, 'code');
  const oauthError = getQueryParam(req, 'error');

  const unsafeStatePayload = readStatePayloadUnsafe(state);
  const unsafeProjectId = unsafeStatePayload?.projectId || null;

  if (oauthError) {
    const deniedRedirect = buildDashboardReportsUrl({
      appBaseUrl,
      projectId: unsafeProjectId,
      metaStatus: 'error',
      reason: 'denied',
    });
    return res.redirect(deniedRedirect);
  }

  if (!state || !code) {
    const missingRedirect = buildDashboardReportsUrl({
      appBaseUrl,
      projectId: unsafeProjectId,
      metaStatus: 'error',
      reason: 'missing_code_or_state',
    });
    return res.redirect(missingRedirect);
  }

  try {
    const payload = verifySignedState(state);
    const projectId = payload?.projectId;
    const userId = payload?.userId;

    if (!projectId || !userId) {
      throw Object.assign(new Error('OAuth state payload is incomplete'), { status: 400 });
    }

    const supabase = getSupabaseOrThrow();
    const profile = await getProfileById(supabase, userId);
    assertCanManageMeta(profile);
    await assertProjectAccess({ supabase, projectId, userId });

    const { appId, appSecret } = getRequiredMetaConfig();
    const graphVersion = getGraphVersion();
    const redirectUri = getMetaRedirectUri(req);

    const shortToken = await exchangeCodeForUserToken({
      code,
      redirectUri,
      appId,
      appSecret,
      graphVersion,
    });

    let userAccessToken = shortToken?.access_token;
    let expiresIn = Number(shortToken?.expires_in) || null;

    try {
      const longLived = await exchangeForLongLivedToken({
        userAccessToken,
        appId,
        appSecret,
        graphVersion,
      });

      if (longLived?.access_token) {
        userAccessToken = longLived.access_token;
        expiresIn = Number(longLived?.expires_in) || expiresIn;
      }
    } catch {
      // Keep short-lived token when exchange fails
    }

    if (!userAccessToken) {
      throw Object.assign(new Error('Meta token exchange failed: no access_token returned'), { status: 502 });
    }

    const snapshot = await fetchMetaAccountsSnapshot({ userAccessToken, graphVersion });
    const existing = await loadProjectConnection(supabase, projectId);

    const selection = buildSelection({
      pageAccounts: snapshot.pageAccounts,
      adAccounts: snapshot.adAccounts,
      selectedPageId: existing?.selected_page_id || null,
      selectedAdAccountId: existing?.selected_ad_account_id || null,
    });

    const tokenExpiry = Number.isFinite(expiresIn)
      ? new Date(Date.now() + (expiresIn * 1000)).toISOString()
      : null;

    const { error: upsertError } = await supabase
      .from('project_meta_connections')
      .upsert(
        {
          project_id: projectId,
          connected_by: userId,
          meta_user_id: snapshot.metaUserId,
          meta_user_name: snapshot.metaUserName,
          user_access_token: userAccessToken,
          user_token_expires_at: tokenExpiry,
          page_accounts: snapshot.pageAccounts,
          ad_accounts: snapshot.adAccounts,
          granted_scopes: snapshot.grantedScopes,
          last_synced_at: new Date().toISOString(),
          ...selection,
        },
        { onConflict: 'project_id' }
      );

    if (upsertError) {
      throw Object.assign(new Error(`Could not save Meta connection: ${upsertError.message}`), { status: 500 });
    }

    const successRedirect = buildDashboardReportsUrl({
      appBaseUrl,
      projectId,
      metaStatus: 'connected',
      reason: snapshot.adAccountsWarning ? 'ads_fetch_warning' : null,
    });
    return res.redirect(successRedirect);
  } catch (error) {
    const redirect = buildDashboardReportsUrl({
      appBaseUrl,
      projectId: unsafeProjectId,
      metaStatus: 'error',
      reason: error?.meta?.code ? `meta_${error.meta.code}` : 'callback_failed',
    });
    return res.redirect(redirect);
  }
}

async function handleProjectConnection(req, res) {
  const method = req.method || 'GET';
  if (!['GET', 'POST', 'DELETE'].includes(method)) {
    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

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

    return res.status(200).json({ disconnected: true, projectId });
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
}

async function handleRefreshAccounts(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = parseJsonBody(req);
  const projectId = normalizeNullableText(body?.projectId);
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
}

export default async function handler(req, res) {
  const action = resolveAction(req);

  try {
    if (action === 'connect-url') return await handleConnectUrl(req, res);
    if (action === 'callback') return await handleCallback(req, res);
    if (action === 'project-connection') return await handleProjectConnection(req, res);
    if (action === 'refresh-accounts') return await handleRefreshAccounts(req, res);

    return res.status(404).json({ error: 'Meta route not found' });
  } catch (error) {
    const status = error?.status || 500;
    return res.status(status).json({
      error: error?.message || 'Meta request failed',
    });
  }
}

