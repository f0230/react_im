import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ProjectInvoices = () => {
  const { t } = useTranslation();
  const { projectId } = useParams();
  return (
    <div className="font-product text-neutral-900 pb-16">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
            {t('dashboard.projects.detail.label')}
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mt-2">
            {t('dashboard.projects.detail.tabs.invoices')}
          </h1>
        </div>
        {projectId && (
          <Link
            to={`/dashboard/projects/${projectId}`}
            className="rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition"
          >
            {t('dashboard.projects.detail.back')}
          </Link>
        )}
      </div>
      <p className="text-sm text-neutral-500">{t('dashboard.projects.detail.empty')}</p>
    </div>
  );
};

export default ProjectInvoices;
