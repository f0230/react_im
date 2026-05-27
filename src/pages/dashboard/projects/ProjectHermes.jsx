import React from 'react';
import { useParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import HermesChat from '@/components/HermesChat';
import ProjectDetailLayout from './ProjectDetailLayout';

const ProjectHermes = () => {
  const { projectId } = useParams();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f2f2f2] px-4 py-6 font-product md:px-10 md:py-8">
      <div className="mx-auto max-w-[1280px]">
        <ProjectDetailLayout />

        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden flex flex-col" style={{ height: 'calc(100dvh - 220px)', minHeight: '400px' }}>
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-neutral-100 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center text-white">
              <Sparkles size={15} />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900 leading-tight">Hermes</p>
              <p className="text-xs text-neutral-400 leading-tight">Asistente del proyecto</p>
            </div>
          </div>

          <HermesChat
            channelId={projectId}
            userId={user.id}
            placeholder="Preguntale algo a Hermes sobre este proyecto…"
            className="flex-1 min-h-0"
          />
        </div>
      </div>
    </div>
  );
};

export default ProjectHermes;
