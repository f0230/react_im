import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import LoadingFallback from '@/components/ui/LoadingFallback';
import { useAuth } from '@/context/AuthContext';
import { resolveShortLink } from '@/services/shortLinkService';

/**
 * Resolves /s/:code to its target dashboard path and redirects.
 * Short links require an authenticated session (RLS); if there is none,
 * send the user to login and come back to the short link afterwards.
 */
const ShortLinkRedirect = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.id) {
      navigate(`/admin?redirect=${encodeURIComponent(`/s/${code}`)}`, { replace: true });
      return;
    }

    let active = true;
    (async () => {
      const target = await resolveShortLink(code);
      if (!active) return;
      if (target) {
        navigate(target, { replace: true });
      } else {
        setNotFound(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [code, user?.id, authLoading, navigate]);

  if (notFound) {
    return (
      <div className="font-product min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-10">
        <h2 className="text-xl font-semibold text-neutral-700">Link no encontrado</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-400">
          Este enlace abreviado no existe o fue eliminado.
        </p>
        <button
          type="button"
          onClick={() => navigate('/dashboard', { replace: true })}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Ir al inicio
        </button>
      </div>
    );
  }

  return <LoadingFallback type="spinner" />;
};

export default ShortLinkRedirect;
