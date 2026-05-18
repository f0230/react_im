import { Node, Edge } from '@xyflow/react';
import { supabase } from './supabaseClient';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  nodes: Node[];
  edges: Edge[];
  created_at: string;
}

/** Strips transient Output runtime state so templates start clean. */
function cleanNodes(nodes: Node[]): Node[] {
  return nodes.map((n) => {
    if (n.type === 'output') {
      return {
        ...n,
        data: {
          status: 'idle',
          resultUrl: null,
          resultType: null,
          taskId: null,
          provider: null,
        },
      };
    }
    return n;
  });
}

export async function listTemplates(): Promise<WorkflowTemplate[]> {
  const { data, error } = await supabase
    .from('studio_templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[studio-templates] List failed:', error.message);
    return [];
  }
  return (data ?? []) as WorkflowTemplate[];
}

export async function saveTemplate(
  name: string,
  nodes: Node[],
  edges: Edge[],
  description?: string,
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('studio_templates').insert({
    name: name.trim(),
    description: description?.trim() || null,
    nodes: cleanNodes(nodes),
    edges,
    created_by: user?.id ?? null,
  });
  if (error) {
    console.warn('[studio-templates] Save failed:', error.message);
    return false;
  }
  return true;
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const { error } = await supabase.from('studio_templates').delete().eq('id', id);
  if (error) {
    console.warn('[studio-templates] Delete failed:', error.message);
    return false;
  }
  return true;
}
