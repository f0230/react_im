import {
  assertCanManageMeta,
  assertProjectAccess,
  buildDashboardReportsUrl,
  buildSelection,
  createSignedState,
  exchangeCodeForUserToken,
  exchangeForLongLivedToken,
  fetchMetaAccountsSnapshot,
  graphGet,
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

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function sumInsightMetric(rows, metricName) {
  if (!Array.isArray(rows)) return 0;
  const row = rows.find((item) => String(item?.name || '') === metricName);
  if (!row || !Array.isArray(row.values)) return 0;

  return row.values.reduce((sum, item) => {
    const value = item?.value;
    if (typeof value === 'number') return sum + value;
    if (typeof value === 'string') return sum + toNumber(value);
    if (value && typeof value === 'object') {
      return sum + Object.values(value).reduce((acc, entry) => acc + toNumber(entry), 0);
    }
    return sum;
  }, 0);
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

async function handleReportSummary(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const projectId = getQueryParam(req, 'projectId');
  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  const supabase = getSupabaseOrThrow();
  const { user } = await verifyCurrentUser(req, supabase);
  await assertProjectAccess({ supabase, projectId, userId: user.id });

  const connection = await loadProjectConnection(supabase, projectId);
  if (!connection) {
    return res.status(200).json({
      connected: false,
      projectId,
      generatedAt: new Date().toISOString(),
      page: null,
      ads: null,
    });
  }

  const graphVersion = getGraphVersion();
  const result = {
    connected: true,
    projectId,
    generatedAt: new Date().toISOString(),
    page: {
      selectedId: connection.selected_page_id || null,
      selectedName: connection.selected_page_name || null,
      fanCount: null,
      followersCount: null,
      impressions7d: null,
      reach7d: null,
      engagedUsers7d: null,
      error: null,
    },
    ads: {
      selectedId: connection.selected_ad_account_id || null,
      selectedName: connection.selected_ad_account_name || null,
      impressions7d: null,
      reach7d: null,
      clicks7d: null,
      spend7d: null,
      currency: null,
      error: null,
    },
  };

  if (connection.selected_page_id && connection.selected_page_access_token) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const since = now - (7 * 24 * 60 * 60);

      const [pageInfo, pageInsights] = await Promise.all([
        graphGet({
          path: connection.selected_page_id,
          accessToken: connection.selected_page_access_token,
          graphVersion,
          params: { fields: 'id,name,fan_count,followers_count' },
        }),
        graphGet({
          path: `${connection.selected_page_id}/insights`,
          accessToken: connection.selected_page_access_token,
          graphVersion,
          params: {
            metric: 'page_impressions,page_reach,page_engaged_users',
            period: 'day',
            since,
            until: now,
          },
        }),
      ]);

      result.page.selectedName = pageInfo?.name || result.page.selectedName;
      result.page.fanCount = toNumber(pageInfo?.fan_count) || 0;
      result.page.followersCount = toNumber(pageInfo?.followers_count) || 0;
      result.page.impressions7d = sumInsightMetric(pageInsights?.data, 'page_impressions');
      result.page.reach7d = sumInsightMetric(pageInsights?.data, 'page_reach');
      result.page.engagedUsers7d = sumInsightMetric(pageInsights?.data, 'page_engaged_users');
    } catch (error) {
      result.page.error = error?.message || 'No se pudieron cargar métricas de página';
    }
  }

  if (connection.selected_ad_account_id && connection.user_access_token) {
    try {
      const normalizedId = String(connection.selected_ad_account_id).startsWith('act_')
        ? String(connection.selected_ad_account_id)
        : `act_${connection.selected_ad_account_id}`;

      const adsData = await graphGet({
        path: `${normalizedId}/insights`,
        accessToken: connection.user_access_token,
        graphVersion,
        params: {
          fields: 'impressions,reach,clicks,spend',
          date_preset: 'last_7d',
          level: 'account',
          limit: '1',
        },
      });

      const row = Array.isArray(adsData?.data) ? adsData.data[0] : null;
      const adAccountList = Array.isArray(connection.ad_accounts) ? connection.ad_accounts : [];
      const accountMeta = adAccountList.find((item) => item?.id === connection.selected_ad_account_id);

      result.ads.selectedName = accountMeta?.name || result.ads.selectedName;
      result.ads.currency = accountMeta?.currency || null;
      result.ads.impressions7d = toNumber(row?.impressions);
      result.ads.reach7d = toNumber(row?.reach);
      result.ads.clicks7d = toNumber(row?.clicks);
      result.ads.spend7d = toNumber(row?.spend);
    } catch (error) {
      result.ads.error = error?.message || 'No se pudieron cargar métricas de Ads';
    }
  }

  return res.status(200).json(result);
}

export default async function handler(req, res) {
  const action = resolveAction(req);

  try {
    if (action === 'connect-url') return await handleConnectUrl(req, res);
    if (action === 'callback') return await handleCallback(req, res);
    if (action === 'project-connection') return await handleProjectConnection(req, res);
    if (action === 'refresh-accounts') return await handleRefreshAccounts(req, res);
    if (action === 'report-summary') return await handleReportSummary(req, res);

    return res.status(404).json({ error: 'Meta route not found' });
  } catch (error) {
    const status = error?.status || 500;
    return res.status(status).json({
      error: error?.message || 'Meta request failed',
    });
  }
}
