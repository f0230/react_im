import {
  assertCanManageMeta,
  assertProjectAccess,
  buildDashboardReportsUrl,
  buildSelection,
  exchangeCodeForUserToken,
  exchangeForLongLivedToken,
  fetchMetaAccountsSnapshot,
  getAppBaseUrl,
  getGraphVersion,
  getMetaRedirectUri,
  getProfileById,
  getQueryParam,
  getRequiredMetaConfig,
  getSupabaseOrThrow,
  loadProjectConnection,
  readStatePayloadUnsafe,
  verifySignedState,
} from '../../server/utils/metaOAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const appBaseUrl = getAppBaseUrl(req);
  const fallbackRedirect = buildDashboardReportsUrl({
    appBaseUrl,
    metaStatus: 'error',
    reason: 'invalid_state',
  });

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
    } catch (longError) {
      console.warn('[meta/callback] Long-lived token exchange failed, keeping short token:', longError?.message);
    }

    if (!userAccessToken) {
      throw Object.assign(new Error('Meta token exchange failed: no access_token returned'), { status: 502 });
    }

    const snapshot = await fetchMetaAccountsSnapshot({ userAccessToken, graphVersion });
    const existing = await loadProjectConnection(supabase, projectId);

    const preservedPageId = existing?.selected_page_id || null;
    const preservedAdAccountId = existing?.selected_ad_account_id || null;

    const selection = buildSelection({
      pageAccounts: snapshot.pageAccounts,
      adAccounts: snapshot.adAccounts,
      selectedPageId: preservedPageId,
      selectedAdAccountId: preservedAdAccountId,
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
    console.error('[meta/callback] Error:', error);
    const redirect = buildDashboardReportsUrl({
      appBaseUrl,
      projectId: unsafeProjectId,
      metaStatus: 'error',
      reason: error?.meta?.code ? `meta_${error.meta.code}` : 'callback_failed',
    });
    return res.redirect(redirect || fallbackRedirect);
  }
}

