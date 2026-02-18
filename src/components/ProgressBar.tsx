import React from 'react';

export const ProgressBar: React.FC<{ label: string; value: number; max: number; color: string }> = ({ label, value, max, color }) => {
  const safeMax = max > 0 ? max : 1;
  const rawPercentage = (value / safeMax) * 100;
  const percentage = Number.isFinite(rawPercentage)
    ? Math.min(Math.max(rawPercentage, 0), 100)
    : 0;
  
  return (
    <div className="w-full">
      <div className="mb-spacing-4 flex justify-between text-xs font-medium">
        <span className="text-neutral-60 dark:text-neutral-25">{label}</span>
        <span className="font-light text-semantic-textNeutral dark:text-neutral-5">{value}</span>
      </div>
      <div className="h-spacing-8 w-full overflow-hidden rounded-tokenFull bg-neutral-25 dark:bg-neutral-85">
        <div 
          className={`h-full rounded-tokenFull transition-all duration-1000 ease-out ${color}`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};
