import dotenv from 'dotenv';
dotenv.config();

const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN;
const FIGMA_BASE_URL = 'https://api.figma.com/v1';

// Default Team ID from your message
const DEFAULT_TEAM_ID = '1600493316386635894';

/**
 * Extract Figma project ID from a Figma project URL.
 */
function extractProjectId(input) {
    if (!input) return null;
    if (/^\d+$/.test(input.trim())) return input.trim();
    const match = input.match(/figma\.com\/files\/(?:team\/\d+\/)?project[s]?\/(\d+)/);
    if (match) return match[1];
    const match2 = input.match(/\/project\/(\d+)/);
    if (match2) return match2[1];
    return null;
}

async function figmaFetch(path) {
    if (!FIGMA_ACCESS_TOKEN) {
        throw new Error('FIGMA_ACCESS_TOKEN not configured on the server. Add it to your .env file.');
    }
    const res = await fetch(`${FIGMA_BASE_URL}${path}`, {
        headers: {
            'X-Figma-Token': FIGMA_ACCESS_TOKEN,
        },
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Figma API error ${res.status}: ${text}`);
    }
    return res.json();
}

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { action } = req.query;

    if (!action) {
        return res.status(400).json({ error: 'Missing action parameter' });
    }

    try {
        // ── ACTION: team-projects (Para listar todos los proyectos del equipo) ──
        if (action === 'team-projects') {
            const teamId = req.query.teamId || DEFAULT_TEAM_ID;
            const data = await figmaFetch(`/teams/${teamId}/projects`);
            return res.status(200).json({ projects: data.projects || [] });
        }

        // ── ACTION: project-files ──
        if (action === 'project-files') {
            const { projectId: rawId, projectUrl } = req.query;
            const projectId = extractProjectId(rawId || projectUrl);

            if (!projectId) {
                return res.status(400).json({ error: 'No se pudo extraer el ID del proyecto.' });
            }

            const data = await figmaFetch(`/projects/${projectId}/files`);
            const files = (data.files || []).map((file) => ({
                key: file.key,
                name: file.name,
                thumbnailUrl: file.thumbnail_url || null,
                lastModified: file.last_modified || null,
                type: file.editorType || 'design',
                figmaUrl: `https://www.figma.com/design/${file.key}/${encodeURIComponent(file.name)}`,
            }));

            return res.status(200).json({
                projectId,
                projectName: data.name || null,
                files,
            });
        }

        // ── ACTION: sync-user-projects (LA MAGIA) ──
        // Busca proyectos que coincidan con el email del usuario
        if (action === 'sync-user-projects') {
            const { email } = req.query;
            if (!email) return res.status(400).json({ error: 'Falta el email para sincronizar.' });

            // 1. Obtener todos los proyectos del equipo
            const projectsData = await figmaFetch(`/teams/${DEFAULT_TEAM_ID}/projects`);
            const allProjects = projectsData.projects || [];

            // 2. Filtrar proyectos
            // Aquí intentamos coincidir el email con el nombre del proyecto
            // o buscamos proyectos que contengan parte del email
            const userProjects = allProjects.filter(p => {
                const name = p.name.toLowerCase();
                const searchEmail = email.toLowerCase();
                const emailPrefix = searchEmail.split('@')[0];

                return name.includes(searchEmail) || name.includes(emailPrefix);
            });

            // 3. Para cada proyecto encontrado, obtener sus archivos (opcional o solo el primero)
            // Por rendimiento, solo devolvemos el ID del proyecto y el nombre para que el front los cargue.
            return res.status(200).json({
                projects: userProjects.map(p => ({
                    id: p.id,
                    name: p.name,
                    figmaUrl: `https://www.figma.com/files/project/${p.id}`
                }))
            });
        }

        // ── ACTION: file-comments ──
        if (action === 'file-comments') {
            const { fileKey } = req.query;
            if (!fileKey) return res.status(400).json({ error: 'Missing fileKey parameter' });
            const data = await figmaFetch(`/files/${fileKey}/comments`);
            return res.status(200).json({ comments: data.comments || [] });
        }

        return res.status(400).json({ error: `Unknown action: ${action}` });

    } catch (err) {
        console.error('[figma-proxy] Error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
