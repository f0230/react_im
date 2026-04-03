/**
 * GET/POST /api/blotato-sync-accounts
 * Sincroniza las cuentas conectadas desde Blotato API (/users/me/accounts)
 * y actualiza el cache en project_blotato_config
 */

import { getSupabaseAdmin } from '../server/utils/supabaseServer.js';

const BLOTATO_API_BASE = 'https://backend.blotato.com/v2';

function getQueryParam(req, name) {
  const value = req?.query?.[name];
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function getTokenFromRequest(req) {
  const header = req?.headers?.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Obtener projectId de query o body
  const projectId = getQueryParam(req, 'projectId') || req.body?.projectId;
  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  const supabase = getSupabaseAdmin();
  
  // Autenticación
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Verificar acceso al proyecto
  const { data: hasAccess, error: accessError } = await supabase
    .rpc('fn_has_project_access', { p_id: projectId, u_id: authData.user.id });
  
  if (accessError) {
    return res.status(500).json({ error: 'Failed to verify project access', detail: accessError.message });
  }
  
  if (!hasAccess) {
    return res.status(403).json({ error: 'Forbidden: no project access' });
  }

  const apiKey = process.env.BLOTATO_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'BLOTATO_API_KEY not configured in environment' });
  }

  try {
    // Llamar a Blotato API - Obtener cuentas
    const accountsRes = await fetch(`${BLOTATO_API_BASE}/users/me/accounts`, {
      headers: { 
        'blotato-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!accountsRes.ok) {
      const errorText = await accountsRes.text();
      return res.status(accountsRes.status).json({ 
        error: 'Blotato API error', 
        detail: errorText 
      });
    }

    const accountsData = await accountsRes.json();
    const accounts = accountsData.items || [];

    // Para Facebook y LinkedIn, obtener subaccounts (páginas)
    const enrichedAccounts = await Promise.all(
      accounts.map(async (account) => {
        if (['facebook', 'linkedin'].includes(account.platform)) {
          try {
            const subRes = await fetch(
              `${BLOTATO_API_BASE}/users/me/accounts/${account.id}/subaccounts`,
              { headers: { 'blotato-api-key': apiKey } }
            );
            if (subRes.ok) {
              const subData = await subRes.json();
              return { ...account, subaccounts: subData.items || [] };
            }
          } catch (e) {
            console.warn(`Failed to fetch subaccounts for ${account.id}:`, e);
          }
        }
        return account;
      })
    );

    // Guardar en base de datos
    const { error: upsertError } = await supabase
      .from('project_blotato_config')
      .upsert({
        project_id: projectId,
        connected_accounts: enrichedAccounts,
        updated_at: new Date().toISOString()
      }, { onConflict: 'project_id' });

    if (upsertError) {
      throw upsertError;
    }

    return res.status(200).json({
      ok: true,
      accounts: enrichedAccounts,
      count: enrichedAccounts.length
    });

  } catch (error) {
    console.error('Blotato sync error:', error);
    return res.status(500).json({ 
      error: 'Failed to sync accounts', 
      detail: error.message 
    });
  }
}
