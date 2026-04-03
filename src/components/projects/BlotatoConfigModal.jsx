import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useBlotatoAccounts } from '@/hooks/useBlotatoAccounts';
import { PlatformIcon } from './PlatformIcon';

export function BlotatoConfigModal({ projectId, isOpen, onClose }) {
  const {
    accounts,
    accountsByPlatform,
    loading,
    syncing,
    error,
    sync,
  } = useBlotatoAccounts(projectId);

  const [expandedPlatforms, setExpandedPlatforms] = useState({});

  const handleSync = async () => {
    try {
      await sync();
    } catch {
      // Error is already stored in the hook
    }
  };

  const togglePlatform = (platform) => {
    setExpandedPlatforms(prev => ({
      ...prev,
      [platform]: !prev[platform]
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-neutral-100">
            <div>
              <h2 className="text-lg font-bold text-neutral-800">Cuentas Blotato</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Cuentas de redes sociales conectadas a Blotato
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
            >
              <X size={18} className="text-neutral-400" />
            </button>
          </div>

          <div className="p-5 max-h-[70vh] overflow-y-auto">
            {/* Accounts Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-neutral-700">
                  Cuentas Conectadas
                </label>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-black transition-colors"
                >
                  <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Sincronizando...' : 'Sincronizar'}
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw size={20} className="animate-spin text-neutral-300" />
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 text-rose-500 text-sm p-3 bg-rose-50 rounded-xl">
                  <AlertCircle size={14} />
                  {error}
                </div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-6 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                  <p className="text-sm text-neutral-400">No hay cuentas sincronizadas</p>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Presiona "Sincronizar" para cargar tus cuentas de Blotato
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(accountsByPlatform).map(([platform, platformAccounts]) => (
                    <div key={platform} className="border border-neutral-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => togglePlatform(platform)}
                        className="w-full flex items-center justify-between p-3 bg-neutral-50 hover:bg-neutral-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <PlatformIcon platform={platform} size={16} />
                          <span className="text-sm font-semibold text-neutral-700 capitalize">
                            {platform}
                          </span>
                          <span className="text-[10px] text-neutral-400 bg-white px-1.5 py-0.5 rounded-full">
                            {platformAccounts.length}
                          </span>
                        </div>
                        {expandedPlatforms[platform] ? (
                          <ChevronDown size={14} className="text-neutral-400" />
                        ) : (
                          <ChevronRight size={14} className="text-neutral-400" />
                        )}
                      </button>

                      <AnimatePresence>
                        {expandedPlatforms[platform] && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-2 space-y-1">
                              {platformAccounts.map((account) => (
                                <div
                                  key={account.id}
                                  className="flex items-center gap-3 p-2 bg-white rounded-lg"
                                >
                                  {account.profileImageUrl ? (
                                    <img
                                      src={account.profileImageUrl}
                                      alt=""
                                      className="w-8 h-8 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center">
                                      <span className="text-xs font-bold text-neutral-500">
                                        {(account.fullname || account.username || '?')[0].toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-neutral-800 truncate">
                                      {account.fullname || account.username}
                                    </p>
                                    <p className="text-[10px] text-neutral-400">
                                      @{account.username}
                                    </p>
                                  </div>

                                  {account.subaccounts?.length > 0 && (
                                    <div className="text-[10px] text-neutral-400">
                                      {account.subaccounts.length} página(s)
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex justify-between items-center">
            <a
              href="https://help.blotato.com/api/start"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-neutral-400 hover:text-neutral-600 flex items-center gap-1"
            >
              <ExternalLink size={10} />
              Docs de Blotato API
            </a>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-black text-white rounded-xl text-sm font-semibold hover:bg-neutral-800 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default BlotatoConfigModal;
