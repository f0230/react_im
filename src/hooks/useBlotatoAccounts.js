/**
 * Hook para gestionar cuentas de Blotato y su asignación por proyecto.
 *
 * allAccounts       → todas las cuentas Blotato (caché global del proyecto)
 * assignedAccounts  → cuentas asignadas específicamente a este proyecto
 * accountsForPosting→ si hay asignadas, usa esas; si no, usa todas (fallback)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  fetchProjectConfig,
  syncBlotatoAccounts,
  saveAssignedAccounts
} from '@/services/blotatoService';

export function useBlotatoAccounts(projectId) {
  const [allAccounts, setAllAccounts] = useState([]);
  const [assignedAccountIds, setAssignedAccountIds] = useState([]);
  const [assignedAccounts, setAssignedAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadConfig = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const {
        allAccounts: all,
        assignedAccountIds: assigned,
        assignedAccounts: assignedTargets
      } = await fetchProjectConfig(projectId);
      setAllAccounts(all);
      setAssignedAccountIds(assigned);
      setAssignedAccounts(
        assignedTargets?.length
          ? assignedTargets
          : all.filter((account) => assigned.includes(account.id)).map((account) => ({
              id: account.id,
              platform: account.platform,
              username: account.username || '',
              fullname: account.fullname || '',
              profileImageUrl: account.profileImageUrl || '',
              targetConfig: {},
            }))
      );
      setError(null);
    } catch (err) {
      console.error('Error loading Blotato config:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const sync = useCallback(async () => {
    if (!projectId) return;
    try {
      setSyncing(true);
      setError(null);
      const result = await syncBlotatoAccounts(projectId);
      setAllAccounts(result.accounts || []);
      return result;
    } catch (err) {
      console.error('Error syncing Blotato accounts:', err);
      setError(err.message);
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [projectId]);

  const saveAssignments = useCallback(async (accountTargets) => {
    if (!projectId) return;
    try {
      setSaving(true);
      setError(null);
      await saveAssignedAccounts(projectId, accountTargets);
      setAssignedAccounts(accountTargets);
      setAssignedAccountIds(Array.from(new Set((accountTargets || []).map((account) => account?.id).filter(Boolean))));
    } catch (err) {
      console.error('Error saving account assignments:', err);
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Cuentas asignadas a este proyecto
  // Para publicar: usa las asignadas; si ninguna fue configurada aún, usa todas
  const accountsForPosting = assignedAccounts.length > 0 ? assignedAccounts : allAccounts;

  // Agrupar por plataforma (todas)
  const allAccountsByPlatform = allAccounts.reduce((acc, a) => {
    if (!acc[a.platform]) acc[a.platform] = [];
    acc[a.platform].push(a);
    return acc;
  }, {});

  return {
    // Data
    allAccounts,
    assignedAccounts,
    accountsForPosting,
    assignedAccountIds,
    allAccountsByPlatform,
    // Derived
    hasAssignments: assignedAccounts.length > 0 || assignedAccountIds.length > 0,
    // Status
    loading,
    syncing,
    saving,
    error,
    // Actions
    sync,
    saveAssignments,
    reload: loadConfig
  };
}
