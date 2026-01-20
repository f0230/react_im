import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ProjectDetailLayout = () => {
  const { t } = useTranslation();
  const { projectId } = useParams();
  const basePath = projectId ? `/dashboard/projects/${projectId}` : '/dashboard/projects';
  return (
    <div className="font-product text-neutral-900 pb-16">
      <div className="flex flex-wrap items-center gap-2">
        {[
          { to: `${basePath}/services`, label: t('dashboard.projects.detail.tabs.services') },
          { to: `${basePath}/reports`, label: t('dashboard.projects.detail.tabs.reports') },
          { to: `${basePath}/invoices`, label: t('dashboard.projects.detail.tabs.invoices') },
        ].map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `rounded-full px-4 py-2 text-xs font-semibold transition ${
                isActive
                  ? 'bg-black text-white'
                  : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`
            }
            end
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default ProjectDetailLayout;
