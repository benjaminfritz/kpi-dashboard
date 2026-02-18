import React from 'react';

interface KpiCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  hideOutline?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, icon, children, hideOutline = false }) => {
  const outlineClasses = hideOutline ? '' : 'border border-semantic-borderSubtle/70 dark:border-neutral-50/70';

  return (
    <div className={`relative overflow-hidden rounded-md bg-semantic-backgroundNeutral p-spacing-24 shadow-tokenShadow28 transition-transform duration-300 hover:-translate-y-0.5 dark:bg-neutral-85 ${outlineClasses}`}>
      <div className="absolute inset-x-0 top-0 h-1 bg-brand-vodafone" />
      <div className="mb-spacing-20 flex items-center justify-between">
        <h3 className="font-vodafone text-[1.125rem] font-light text-semantic-textNeutral dark:text-neutral-5">{title}</h3>
        <div className="rounded-sm bg-neutral-5 p-spacing-8 text-brand-red dark:bg-neutral-95 dark:text-brand-redTint">{icon}</div>
      </div>
      <div className="space-y-spacing-16">
        {children}
      </div>
    </div>
  );
};
