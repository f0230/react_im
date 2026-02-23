import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function extractFileKey(url) {
    if (!url) return null;
    const match = url.match(/(?:file|design)\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const payload = req.body;

    // Figma webhook verification (optional but recommended)
    // const passcode = process.env.FIGMA_WEBHOOK_PASSCODE;
    // if (passcode && payload.passcode !== passcode) {
    //     return res.status(401).json({ error: 'Unauthorized' });
    // }

    const { event_type, file_key, comment, triggered_by, file_name, comment_id } = payload;

    if (event_type !== 'FILE_COMMENT') {
        return res.status(200).json({ status: 'ignored' });
    }

    try {
        // 1. Find the project(s) associated with this file_key
        // We search in projects where figma_url contains the file_key
        const { data: projects, error: projectError } = await supabase
            .from('projects')
            .select('id, title, name, project_name, client_id, figma_url')
            .filter('figma_url', 'ilike', `%${file_key}%`);

        if (projectError) throw projectError;
        if (!projects || projects.length === 0) {
            console.log(`No project found for Figma file_key: ${file_key}`);
            return res.status(200).json({ status: 'no_project_found' });
        }

        const project = projects[0];
        const projectTitle = project.title || project.name || project.project_name || 'Proyecto sin título';

        // 2. Get recipients for the notification
        // - Admins
        // - Workers assigned to the project
        // - The client

        // Get client's user_id
        const { data: clientData } = await supabase
            .from('clients')
            .select('user_id')
            .eq('id', project.client_id)
            .single();

        const clientUserId = clientData?.user_id;

        // Get assigned workers
        const { data: assignments } = await supabase
            .from('project_assignments')
            .select('worker_id')
            .eq('project_id', project.id);

        const workerIds = assignments?.map(a => a.worker_id) || [];

        // Get admins
        const { data: admins } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'admin');

        const adminIds = admins?.map(a => a.id) || [];

        // Combine unique recipients
        const recipientIds = Array.from(new Set([
            ...adminIds,
            ...workerIds,
            ...(clientUserId ? [clientUserId] : [])
        ]));

        // Filter out the person who made the comment if we can match them by email/handle
        // Figma payload doesn't easily give us the Supabase user_id of the commenter
        // unless we have a mapping. For now, we notify everyone.

        const authorName = triggered_by?.handle || 'Alguien';
        const commentText = Array.isArray(comment)
            ? comment.map(c => c.text).join(' ')
            : (typeof comment === 'string' ? comment : 'ha dejado un comentario');

        // 3. Create notifications
        const notificationsToInsert = recipientIds.map(recipientId => ({
            recipient_id: recipientId,
            type: 'figma_comment',
            title: `Nuevo comentario en Figma: ${projectTitle}`,
            body: `${authorName}: ${commentText.substring(0, 100)}${commentText.length > 100 ? '...' : ''}`,
            data: {
                project_id: project.id,
                figma_file_key: file_key,
                figma_url: project.figma_url,
                comment_id: comment_id,
                external_author: authorName
            }
        }));

        const { error: insertError } = await supabase
            .from('notifications')
            .insert(notificationsToInsert);

        if (insertError) throw insertError;

        return res.status(200).json({ status: 'success', notifications_created: notificationsToInsert.length });

    } catch (error) {
        console.error('Error in figma-webhook handler:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
