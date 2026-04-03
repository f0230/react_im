/**
 * Hook para gestionar cuentas de Blotato
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchProjectAccounts, syncBlotatoAccounts } from '@/services/blotatoService';

export function useBlotatoAccounts(projectId) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  const loadAccounts = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const accountsData = await fetchProjectAccounts(projectId);
      setAccounts(accountsData || []);
      setError(null);
    } catch (err) {
      console.error('Error loading Blotato accounts:', err);
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
      setAccounts(result.accounts || []);

      return result;
    } catch (err) {
      console.error('Error syncing Blotato accounts:', err);
      setError(err.message);
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Agrupar cuentas por plataforma
  const accountsByPlatform = accounts.reduce((acc, account) => {
    const platform = account.platform;
    if (!acc[platform]) acc[platform] = [];
    acc[platform].push(account);
    return acc;
  }, {});

  return {
    accounts,
    accountsByPlatform,
    loading,
    syncing,
    error,
    sync,
    reload: loadAccounts
  };
}
