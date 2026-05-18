import { Node, Edge } from '@xyflow/react';

/**
 * Topologically sorts the Model nodes of a workflow into dependency "waves".
 *
 * A model B depends on model A when A's Output feeds (directly or through that
 * Output node) one of B's reference inputs — i.e. Model A → Output → Model B.
 * Models within the same wave have no dependency on each other and can run in
 * parallel. Any models caught in a cycle are appended as a final wave.
 *
 * Returns an array of waves, each wave being an array of model node ids.
 */
export function topoSortModels(nodes: Node[], edges: Edge[]): string[][] {
  const modelIds = nodes
    .filter((n) => n.type === 'model')
    .map((n) => n.id);
  const modelSet = new Set(modelIds);
  if (modelIds.length === 0) return [];

  // Map each Output node → the model node that produces it.
  const outputToModel = new Map<string, string>();
  for (const edge of edges) {
    const source = nodes.find((n) => n.id === edge.source);
    const target = nodes.find((n) => n.id === edge.target);
    if (source?.type === 'model' && target?.type === 'output') {
      outputToModel.set(target.id, source.id);
    }
  }

  // deps: model → set of model ids it depends on.
  const deps = new Map<string, Set<string>>();
  modelIds.forEach((id) => deps.set(id, new Set()));

  for (const edge of edges) {
    if (!modelSet.has(edge.target)) continue;
    const source = nodes.find((n) => n.id === edge.source);
    if (!source) continue;
    // Reference input coming from another model's Output.
    if (source.type === 'output') {
      const upstreamModel = outputToModel.get(source.id);
      if (upstreamModel && upstreamModel !== edge.target) {
        deps.get(edge.target)!.add(upstreamModel);
      }
    }
    // Direct model → model wiring (rare, but handle it).
    if (source.type === 'model' && source.id !== edge.target) {
      deps.get(edge.target)!.add(source.id);
    }
  }

  // Kahn's algorithm, grouping by level.
  const waves: string[][] = [];
  const resolved = new Set<string>();
  let remaining = [...modelIds];

  while (remaining.length > 0) {
    const wave = remaining.filter((id) =>
      [...deps.get(id)!].every((d) => resolved.has(d) || !modelSet.has(d)),
    );

    if (wave.length === 0) {
      // Cycle — flush whatever is left as a final wave.
      waves.push(remaining);
      break;
    }

    waves.push(wave);
    wave.forEach((id) => resolved.add(id));
    remaining = remaining.filter((id) => !resolved.has(id));
  }

  return waves;
}
