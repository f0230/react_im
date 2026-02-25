import crypto from 'node:crypto';
import {
  assertCanManageMeta,
  assertProjectAccess,
  createSignedState,
  getGraphVersion,
  getMetaRedirectUri,
  getQueryParam,
  getRequestedScopes,
  getRequiredMetaConfig,
  getSupabaseOrThrow,
  verifyCurrentUser,
} from '../../server/utils/metaOAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
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
      nonce: crypto.randomUUID(),
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
  } catch (error) {
    const status = error?.status || 500;
    return res.status(status).json({
      error: error?.message || 'Failed to build Meta OAuth URL',
    });
  }
}

