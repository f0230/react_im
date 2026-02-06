import { supabase } from '@/lib/supabaseClient';

export const REACTION_TABLES = {
    team: 'team_message_reactions',
    client: 'client_message_reactions',
    whatsapp: 'whatsapp_message_reactions',
};

const groupByMessage = (rows) => {
    const grouped = {};
    (rows || []).forEach((row) => {
        if (!grouped[row.message_id]) grouped[row.message_id] = [];
        grouped[row.message_id].push(row);
    });
    return grouped;
};

export const fetchReactionsForMessages = async ({ table, messageIds }) => {
    if (!table || !Array.isArray(messageIds) || messageIds.length === 0) return {};
    const { data, error } = await supabase
        .from(table)
        .select('id, message_id, user_id, emoji, created_at')
        .in('message_id', messageIds);

    if (error) throw error;
    return groupByMessage(data || []);
};

export const toggleReaction = async ({ table, messageId, userId, emoji }) => {
    if (!table || !messageId || !userId || !emoji) return null;

    const { data: existing, error: findError } = await supabase
        .from(table)
        .select('id')
        .match({ message_id: messageId, user_id: userId, emoji })
        .maybeSingle();

    if (findError) throw findError;

    if (existing?.id) {
        const { error: deleteError } = await supabase
            .from(table)
            .delete()
            .eq('id', existing.id);
        if (deleteError) throw deleteError;
        return { action: 'deleted', id: existing.id };
    }

    const { data: inserted, error: insertError } = await supabase
        .from(table)
        .insert({ message_id: messageId, user_id: userId, emoji })
        .select('id, message_id, user_id, emoji, created_at')
        .single();

    if (insertError) throw insertError;
    return { action: 'inserted', row: inserted };
};
