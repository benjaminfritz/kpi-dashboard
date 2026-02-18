import React from 'react';

export const ProgressBar: React.FC<{ label: string; value: number; max: number; color: string }> = ({ label, value, max, color }) => {
  const safeMax = max > 0 ? max : 1;
  const rawPercentage = (value / safeMax) * 100;
  const percentage = Number.isFinite(rawPercentage)
    ? Math.min(Math.max(rawPercentage, 0), 100)
    : 0;
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs font-medium mb-1.5">
        <span className="text-gray-500 dark:text-slate-400">{label}</span>
        <span className="text-gray-900 dark:text-slate-100">{value}</span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};
