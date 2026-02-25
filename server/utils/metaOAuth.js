import crypto from 'node:crypto';
import { getSupabaseAdmin } from './supabaseServer.js';

const DEFAULT_GRAPH_VERSION = 'v21.0';
const DEFAULT_OAUTH_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'read_insights',
  'pages_manage_posts',
  'ads_read',
  'ads_management',
  'business_management',
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_insights',
];

const STATE_TTL_MS = 10 * 60 * 1000;

function normalizeText(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeNullableText(value) {
  const text = normalizeText(value);
  return text.length > 0 ? text : null;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function getSupabaseOrThrow() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw Object.assign(new Error('Supabase server credentials are not configured'), { status: 500 });
  }
  return supabase;
}

export function getRequestBaseUrl(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5173';
  const proto = req.headers['x-forwarded-proto'] || (String(host).includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export function getAppBaseUrl(req) {
  const configured = normalizeText(process.env.VITE_APP_URL);
  if (configured) return configured;
  return getRequestBaseUrl(req);
}

export function getMetaRedirectUri(req) {
  return `${getRequestBaseUrl(req)}/api/meta/callback`;
}

export function getGraphVersion() {
  return normalizeText(process.env.META_GRAPH_VERSION) || DEFAULT_GRAPH_VERSION;
}

export function getRequiredMetaConfig() {
  const appId = normalizeText(process.env.META_APP_ID);
  const appSecret = normalizeText(process.env.META_APP_SECRET);

  if (!appId || !appSecret) {
    throw Object.assign(
      new Error('META_APP_ID / META_APP_SECRET are required'),
      { status: 500 }
    );
  }

  return { appId, appSecret };
}

export function getRequestedScopes() {
  const raw = normalizeText(process.env.META_OAUTH_SCOPES);
  const source = raw
    ? raw.split(/[\s,]+/g).filter(Boolean)
    : DEFAULT_OAUTH_SCOPES;

  return Array.from(new Set(source.map((scope) => normalizeText(scope)).filter(Boolean)));
}

export function getBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

export function getQueryParam(req, key) {
  const direct = req?.query?.[key];
  if (typeof direct === 'string') return direct;
  if (Array.isArray(direct) && direct.length > 0) return String(direct[0]);

  try {
    const url = new URL(req.url, getRequestBaseUrl(req));
    const value = url.searchParams.get(key);
    return value;
  } catch {
    return null;
  }
}

export function parseJsonBody(req) {
  if (!req?.body) return {};
  if (typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export async function verifyCurrentUser(req, supabase) {
  const token = getBearerToken(req);
  if (!token) {
    throw Object.assign(new Error('Missing or invalid Authorization header'), { status: 401 });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user) {
    throw Object.assign(new Error('Unauthorized: invalid token'), { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, is_client_leader, client_id, full_name, email')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw Object.assign(new Error('Forbidden: profile not found'), { status: 403 });
  }

  return { user: authData.user, profile };
}

export async function getProfileById(supabase, userId) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, is_client_leader, client_id, full_name, email')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) {
    throw Object.assign(new Error('Profile not found for state user'), { status: 403 });
  }
  return profile;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '')
  );
}

export async function assertProjectAccess({ supabase, projectId, userId }) {
  if (!isUuid(projectId)) {
    throw Object.assign(new Error('Invalid projectId'), { status: 400 });
  }
  if (!isUuid(userId)) {
    throw Object.assign(new Error('Invalid userId'), { status: 400 });
  }

  const { data, error } = await supabase.rpc('fn_has_project_access', {
    p_id: projectId,
    u_id: userId,
  });

  if (error) {
    throw Object.assign(new Error(`Error checking project access: ${error.message}`), { status: 500 });
  }

  if (!data) {
    throw Object.assign(new Error('Forbidden: no access to this project'), { status: 403 });
  }
}

export function canManageMeta(profile) {
  if (!profile) return false;
  if (profile.role === 'admin' || profile.role === 'worker') return true;
  if (profile.role === 'client') return profile.is_client_leader !== false;
  return false;
}

export function assertCanManageMeta(profile) {
  if (!canManageMeta(profile)) {
    throw Object.assign(new Error('Forbidden: insufficient permissions for Meta integration'), { status: 403 });
  }
}

function getStateSecret() {
  const explicit = normalizeText(process.env.META_OAUTH_STATE_SECRET);
  if (explicit) return explicit;

  const fallback = normalizeText(process.env.META_APP_SECRET);
  if (fallback) return fallback;

  throw Object.assign(new Error('META_OAUTH_STATE_SECRET (or META_APP_SECRET) is required'), { status: 500 });
}

export function createSignedState(payload) {
  const secret = getStateSecret();
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifySignedState(state) {
  const secret = getStateSecret();
  const parts = String(state || '').split('.');
  if (parts.length !== 2) {
    throw Object.assign(new Error('Invalid OAuth state'), { status: 400 });
  }

  const [data, providedSig] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw Object.assign(new Error('Invalid OAuth state signature'), { status: 400 });
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  } catch {
    throw Object.assign(new Error('Invalid OAuth state payload'), { status: 400 });
  }

  const issuedAt = Number(payload?.iat);
  if (!Number.isFinite(issuedAt)) {
    throw Object.assign(new Error('OAuth state is missing iat'), { status: 400 });
  }

  if (Date.now() - issuedAt > STATE_TTL_MS) {
    throw Object.assign(new Error('OAuth state expired'), { status: 400 });
  }

  return payload;
}

export function readStatePayloadUnsafe(state) {
  const parts = String(state || '').split('.');
  if (!parts[0]) return null;
  try {
    return JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

async function parseGraphResponse(response) {
  const raw = await response.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { raw };
  }

  if (!response.ok) {
    const metaMessage =
      data?.error?.message ||
      data?.error?.error_user_msg ||
      `HTTP ${response.status}`;
    const error = new Error(metaMessage);
    error.status = response.status;
    error.meta = data?.error || data;
    throw error;
  }

  return data;
}

export async function exchangeCodeForUserToken({
  code,
  redirectUri,
  appId,
  appSecret,
  graphVersion,
}) {
  const tokenUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
  tokenUrl.searchParams.set('client_id', appId);
  tokenUrl.searchParams.set('client_secret', appSecret);
  tokenUrl.searchParams.set('redirect_uri', redirectUri);
  tokenUrl.searchParams.set('code', code);

  const response = await fetch(tokenUrl.toString(), { method: 'GET' });
  return parseGraphResponse(response);
}

export async function exchangeForLongLivedToken({
  userAccessToken,
  appId,
  appSecret,
  graphVersion,
}) {
  const tokenUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
  tokenUrl.searchParams.set('grant_type', 'fb_exchange_token');
  tokenUrl.searchParams.set('client_id', appId);
  tokenUrl.searchParams.set('client_secret', appSecret);
  tokenUrl.searchParams.set('fb_exchange_token', userAccessToken);

  const response = await fetch(tokenUrl.toString(), { method: 'GET' });
  return parseGraphResponse(response);
}

export async function graphGet({ path, accessToken, params = {}, graphVersion = getGraphVersion() }) {
  const url = new URL(`https://graph.facebook.com/${graphVersion}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url.toString(), { method: 'GET' });
  return parseGraphResponse(response);
}

export function normalizePages(data) {
  return asArray(data)
    .map((row) => {
      const instagram = row?.instagram_business_account || row?.connected_instagram_account || null;
      return {
        id: normalizeText(String(row?.id || '')),
        name: normalizeText(row?.name) || 'Untitled Page',
        access_token: normalizeText(row?.access_token),
        instagram_id: normalizeNullableText(instagram?.id),
        instagram_username: normalizeNullableText(instagram?.username || instagram?.name),
      };
    })
    .filter((row) => row.id && row.access_token);
}

export function normalizeAdAccounts(data) {
  return asArray(data)
    .map((row) => {
      const id = normalizeNullableText(row?.id || row?.account_id);
      if (!id) return null;

      return {
        id,
        account_id: normalizeNullableText(row?.account_id) || id.replace(/^act_/, ''),
        name: normalizeNullableText(row?.name) || id,
        currency: normalizeNullableText(row?.currency),
        status: row?.account_status ?? null,
      };
    })
    .filter(Boolean);
}

function normalizeScopes(data) {
  return asArray(data)
    .filter((item) => item?.status === 'granted' && normalizeText(item?.permission))
    .map((item) => normalizeText(item.permission));
}

export async function fetchMetaAccountsSnapshot({ userAccessToken, graphVersion }) {
  const [me, pages, permissions] = await Promise.all([
    graphGet({
      path: 'me',
      accessToken: userAccessToken,
      graphVersion,
      params: { fields: 'id,name' },
    }),
    graphGet({
      path: 'me/accounts',
      accessToken: userAccessToken,
      graphVersion,
      params: {
        fields: 'id,name,access_token,instagram_business_account{id,username,name},connected_instagram_account{id,username,name}',
        limit: '200',
      },
    }),
    graphGet({
      path: 'me/permissions',
      accessToken: userAccessToken,
      graphVersion,
      params: { limit: '200' },
    }),
  ]);

  let adAccounts = [];
  let adAccountsWarning = null;
  try {
    const adResponse = await graphGet({
      path: 'me/adaccounts',
      accessToken: userAccessToken,
      graphVersion,
      params: { fields: 'id,account_id,name,currency,account_status', limit: '200' },
    });
    adAccounts = normalizeAdAccounts(adResponse?.data);
  } catch (error) {
    adAccounts = [];
    adAccountsWarning = error?.message || 'Could not fetch ad accounts';
  }

  return {
    metaUserId: normalizeText(me?.id),
    metaUserName: normalizeNullableText(me?.name),
    pageAccounts: normalizePages(pages?.data),
    adAccounts,
    grantedScopes: normalizeScopes(permissions?.data),
    adAccountsWarning,
  };
}

export function buildSelection({
  pageAccounts,
  adAccounts,
  selectedPageId,
  selectedAdAccountId,
}) {
  const page = pageAccounts.find((item) => item.id === selectedPageId) || null;
  const adAccount = adAccounts.find((item) => item.id === selectedAdAccountId) || null;

  return {
    selected_page_id: page?.id || null,
    selected_page_name: page?.name || null,
    selected_page_access_token: page?.access_token || null,
    selected_ig_id: page?.instagram_id || null,
    selected_ig_username: page?.instagram_username || null,
    selected_ad_account_id: adAccount?.id || null,
    selected_ad_account_name: adAccount?.name || null,
  };
}

export function sanitizeConnection(row) {
  if (!row) {
    return {
      connected: false,
      availablePages: [],
      availableAdAccounts: [],
      selected: {
        pageId: null,
        pageName: null,
        igId: null,
        igUsername: null,
        adAccountId: null,
        adAccountName: null,
      },
    };
  }

  const pages = asArray(row.page_accounts).map((item) => ({
    id: item?.id || null,
    name: item?.name || null,
    instagramId: item?.instagram_id || null,
    instagramUsername: item?.instagram_username || null,
  }));

  const adAccounts = asArray(row.ad_accounts).map((item) => ({
    id: item?.id || null,
    accountId: item?.account_id || null,
    name: item?.name || null,
    currency: item?.currency || null,
    status: item?.status ?? null,
  }));

  return {
    connected: true,
    projectId: row.project_id,
    metaUser: {
      id: row.meta_user_id || null,
      name: row.meta_user_name || null,
    },
    grantedScopes: asArray(row.granted_scopes),
    lastSyncedAt: row.last_synced_at || null,
    userTokenExpiresAt: row.user_token_expires_at || null,
    availablePages: pages,
    availableAdAccounts: adAccounts,
    selected: {
      pageId: row.selected_page_id || null,
      pageName: row.selected_page_name || null,
      igId: row.selected_ig_id || null,
      igUsername: row.selected_ig_username || null,
      adAccountId: row.selected_ad_account_id || null,
      adAccountName: row.selected_ad_account_name || null,
    },
  };
}

export async function loadProjectConnection(supabase, projectId) {
  const { data, error } = await supabase
    .from('project_meta_connections')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) {
    throw Object.assign(new Error(`Could not load project connection: ${error.message}`), { status: 500 });
  }

  return data;
}

export function buildDashboardReportsUrl({ appBaseUrl, projectId, metaStatus, reason }) {
  const url = new URL('/dashboard/reports', appBaseUrl);
  if (projectId) {
    url.searchParams.set('projectId', projectId);
  }
  if (metaStatus) {
    url.searchParams.set('meta', metaStatus);
  }
  if (reason) {
    url.searchParams.set('reason', reason);
  }
  return url.toString();
}
