import React from 'react';

interface KpiCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  hideOutline?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, icon, children, hideOutline = false }) => {
  const outlineClasses = hideOutline ? '' : 'border border-gray-100 dark:border-slate-800';

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-300 ${outlineClasses}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">{title}</h3>
        <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-lg text-gray-600 dark:text-slate-300">{icon}</div>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};
