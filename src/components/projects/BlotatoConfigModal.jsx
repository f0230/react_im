import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Save,
  Loader2,
  Users
} from 'lucide-react';
import { useBlotatoAccounts } from '@/hooks/useBlotatoAccounts';
import { PlatformIcon } from './PlatformIcon';

export function BlotatoConfigModal({ projectId, isOpen, onClose }) {
  const {
    allAccounts,
    assignedAccounts,
    loading,
    syncing,
    saving,
    error,
    sync,
    saveAssignments,
  } = useBlotatoAccounts(projectId);

  // Local selection state (independent until saved)
  const [selected, setSelected] = useState(new Set());
  const [saveSuccess, setSaveSuccess] = useState(false);

  const selectableTargets = allAccounts.flatMap((account) => {
    if (['facebook', 'linkedin'].includes(account.platform) && account.subaccounts?.length > 0) {
      return account.subaccounts.map((subaccount) => ({
        key: `${account.id}::${subaccount.id}`,
        accountId: account.id,
        platform: account.platform,
        username: account.username,
        fullname: account.fullname,
        profileImageUrl: account.profileImageUrl,
        label: subaccount.name,
        helper: `Page ID: ${subaccount.id}`,
        targetConfig: { pageId: subaccount.id, pageName: subaccount.name },
      }));
    }

    return [{
      key: account.id,
      accountId: account.id,
      platform: account.platform,
      username: account.username,
      fullname: account.fullname,
      profileImageUrl: account.profileImageUrl,
      label: account.fullname || account.username,
      helper: account.username ? `@${account.username}` : `Account ID: ${account.id}`,
      targetConfig: {},
    }];
  });

  const targetsByPlatform = selectableTargets.reduce((acc, target) => {
    if (!acc[target.platform]) acc[target.platform] = [];
    acc[target.platform].push(target);
    return acc;
  }, {});

  // Sync local state when modal opens or assignedAccountIds changes
  useEffect(() => {
    if (isOpen) {
      const selectedKeys = assignedAccounts.map((account) => {
        const pageId = account?.targetConfig?.pageId;
        return pageId ? `${account.id}::${pageId}` : account.id;
      });
      setSelected(new Set(selectedKeys));
      setSaveSuccess(false);
    }
  }, [isOpen, assignedAccounts]);

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSaveSuccess(false);
  };

  const handleSync = async () => {
    try {
      await sync();
    } catch {
      // Error shown via hook
    }
  };

  const handleSave = async () => {
    try {
      const selectedTargets = selectableTargets
        .filter((target) => selected.has(target.key))
        .map((target) => ({
          id: target.accountId,
          platform: target.platform,
          username: target.username || '',
          fullname: target.fullname || '',
          profileImageUrl: target.profileImageUrl || '',
          targetConfig: target.targetConfig || {},
        }));

      await saveAssignments(selectedTargets);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch {
      // Error shown via hook
    }
  };

  const assignedKeys = assignedAccounts
    .map((account) => {
      const pageId = account?.targetConfig?.pageId;
      return pageId ? `${account.id}::${pageId}` : account.id;
    })
    .sort();
  const hasChanges = JSON.stringify([...selected].sort()) !== JSON.stringify(assignedKeys);

  if (!isOpen) return null;

  const platforms = Object.keys(targetsByPlatform);

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 8 }}
          onClick={e => e.stopPropagation()}
          className="flex w-full max-w-lg max-h-[min(88vh,760px)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
            <div>
              <h2 className="text-base font-black text-neutral-800">Cuentas del Proyecto</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Seleccioná qué cuentas Blotato se usan en este proyecto
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
            >
              <X size={16} className="text-neutral-400" />
            </button>
          </div>

          {/* Sync row */}
          <div className="flex items-center justify-between px-6 py-3 bg-neutral-50 border-b border-neutral-100">
            <span className="text-xs text-neutral-500 font-medium">
              {allAccounts.length > 0
                ? `${selectableTargets.length} destino${selectableTargets.length !== 1 ? 's' : ''} disponible${selectableTargets.length !== 1 ? 's' : ''} en Blotato`
                : 'Sincronizá para ver las cuentas disponibles'}
            </span>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-black transition-colors"
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
          </div>

          {/* Account list */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={22} className="animate-spin text-neutral-300" />
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 text-rose-500 text-sm p-5 bg-rose-50 m-4 rounded-xl">
                <AlertCircle size={14} />
                {error}
              </div>
            ) : selectableTargets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mb-3">
                  <Users size={20} className="text-neutral-300" />
                </div>
                <p className="text-sm font-bold text-neutral-400">Sin cuentas disponibles</p>
                <p className="text-xs text-neutral-400 mt-1 max-w-[220px] leading-relaxed">
                  Presioná "Sincronizar" para cargar las cuentas conectadas en Blotato
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {platforms.map(platform => (
                  <div key={platform}>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <PlatformIcon platform={platform} size={13} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 capitalize">
                        {platform}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {targetsByPlatform[platform].map(target => {
                        const isSelected = selected.has(target.key);
                        return (
                          <button
                            type="button"
                            key={target.key}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              toggle(target.key);
                            }}
                            className={`w-full cursor-pointer flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                              isSelected
                                ? 'bg-black border-black'
                                : 'bg-white border-neutral-150 hover:border-neutral-300'
                            }`}
                          >
                            {/* Avatar */}
                            {target.profileImageUrl ? (
                              <img
                                src={target.profileImageUrl}
                                alt=""
                                className="w-9 h-9 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-black ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'
                              }`}>
                                {(target.fullname || target.username || '?')[0].toUpperCase()}
                              </div>
                            )}

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-neutral-800'}`}>
                                {target.label}
                              </p>
                              <p className={`text-[11px] ${isSelected ? 'text-white/60' : 'text-neutral-400'}`}>
                                {target.helper}
                              </p>
                            </div>

                            {/* Checkmark */}
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                              isSelected
                                ? 'border-white bg-white'
                                : 'border-neutral-200'
                            }`}>
                              {isSelected && <CheckCircle2 size={14} className="text-black" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Select all / none shortcuts */}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setSelected(new Set(selectableTargets.map((target) => target.key)))}
                    className="text-[11px] font-bold text-neutral-400 hover:text-neutral-700 transition-colors"
                  >
                    Seleccionar todas
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(new Set())}
                    className="text-[11px] font-bold text-neutral-400 hover:text-neutral-700 transition-colors"
                  >
                    Deseleccionar todas
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between gap-3">
            <a
              href="https://help.blotato.com/api/start"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-neutral-400 hover:text-neutral-600 flex items-center gap-1 transition-colors"
            >
              <ExternalLink size={10} />
              Docs Blotato
            </a>

            <div className="flex items-center gap-2">
              {saveSuccess && (
                <motion.span
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-600"
                >
                  <CheckCircle2 size={13} />
                  Guardado
                </motion.span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-bold text-neutral-500 hover:text-neutral-700 transition-colors"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="flex items-center gap-2 px-5 py-2 bg-black text-white rounded-xl text-sm font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-800 transition-all shadow-sm"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}

export default BlotatoConfigModal;
