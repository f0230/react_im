import { createClient } from '@supabase/supabase-js';

const FIGMA_CLIENT_ID = process.env.FIGMA_CLIENT_ID;
const FIGMA_SECRET = process.env.FIGMA_SECRET;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Construir redirect URI dinámicamente según el ambiente
function getRedirectUri(req) {
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5173';
    const proto = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
    return `${proto}://${host}/api/figma-auth/callback`;
}

export default async function handler(req, res) {
    const { action } = req.params || {};
    const path = req.path || '';

    // ── STEP 1: Redirigir al usuario a Figma OAuth ──────────────────────────
    if (req.method === 'GET' && (action === 'login' || path.endsWith('/login'))) {
        const redirectUri = getRedirectUri(req);
        const params = new URLSearchParams({
            client_id: FIGMA_CLIENT_ID,
            redirect_uri: redirectUri,
            scope: 'file_read',
            response_type: 'code',
            state: 'admin_login',
        });

        const figmaAuthUrl = `https://www.figma.com/oauth?${params.toString()}`;
        return res.redirect(figmaAuthUrl);
    }

    // ── STEP 2: Callback de Figma con ?code=... ──────────────────────────────
    if (req.method === 'GET' && (action === 'callback' || path.endsWith('/callback'))) {
        const { code, error: figmaError } = req.query;

        if (figmaError || !code) {
            const appUrl = process.env.VITE_APP_URL || 'http://localhost:5173';
            return res.redirect(`${appUrl}/admin?error=figma_denied`);
        }

        try {
            const redirectUri = getRedirectUri(req);

            // 1. Intercambiar code por access_token de Figma
            const tokenRes = await fetch('https://www.figma.com/api/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: FIGMA_CLIENT_ID,
                    client_secret: FIGMA_SECRET,
                    redirect_uri: redirectUri,
                    code,
                    grant_type: 'authorization_code',
                }),
            });

            if (!tokenRes.ok) {
                const errText = await tokenRes.text();
                console.error('[figma-auth] Token exchange failed:', errText);
                throw new Error('Figma token exchange failed');
            }

            const tokenData = await tokenRes.json();
            const figmaAccessToken = tokenData.access_token;

            // 2. Obtener perfil del usuario en Figma
            const meRes = await fetch('https://api.figma.com/v1/me', {
                headers: { Authorization: `Bearer ${figmaAccessToken}` },
            });

            if (!meRes.ok) {
                throw new Error('Failed to fetch Figma user profile');
            }

            const figmaUser = await meRes.json();
            const email = figmaUser.email;

            if (!email) {
                throw new Error('No email returned from Figma');
            }

            // 3. Verificar que el usuario existe en Supabase y tiene rol admin
            if (!SUPABASE_SERVICE_KEY) {
                throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured in server environment');
            }

            const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
                auth: { autoRefreshToken: false, persistSession: false },
            });

            // Buscar en profiles si el email corresponde a un admin
            const { data: profile, error: profileError } = await supabaseAdmin
                .from('profiles')
                .select('id, role, email')
                .eq('email', email)
                .single();

            if (profileError || !profile) {
                console.warn(`[figma-auth] No profile found for email: ${email}`);
                const appUrl = process.env.VITE_APP_URL || 'http://localhost:5173';
                return res.redirect(`${appUrl}/admin?error=not_found&email=${encodeURIComponent(email)}`);
            }

            const allowedRoles = ['admin', 'worker'];
            if (!allowedRoles.includes(profile.role)) {
                console.warn(`[figma-auth] User ${email} has role '${profile.role}' — not allowed.`);
                const appUrl = process.env.VITE_APP_URL || 'http://localhost:5173';
                return res.redirect(`${appUrl}/admin?error=not_admin`);
            }

            // 4. Generar magic link para que el usuario inicie sesión en Supabase
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email,
                options: {
                    redirectTo: `${process.env.VITE_APP_URL || 'http://localhost:5173'}/dashboard`,
                    data: {
                        figma_id: figmaUser.id,
                        figma_handle: figmaUser.handle,
                        login_method: 'figma',
                    },
                },
            });

            if (linkError || !linkData?.properties?.hashed_token) {
                console.error('[figma-auth] Magic link error:', linkError);
                throw new Error('Failed to generate login link');
            }

            // 5. Redirigir al usuario al magic link de Supabase
            //    Supabase se encarga de autenticar y redirigir a /dashboard
            const { action_link } = linkData;
            return res.redirect(action_link);

        } catch (err) {
            console.error('[figma-auth] Error:', err.message);
            const appUrl = process.env.VITE_APP_URL || 'http://localhost:5173';
            return res.redirect(`${appUrl}/admin?error=server_error`);
        }
    }

    // Ruta no reconocida
    return res.status(404).json({ error: 'Not found' });
}
