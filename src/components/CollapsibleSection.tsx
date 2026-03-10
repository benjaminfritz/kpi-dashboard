import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  titleClassName?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = true,
  className = '',
  titleClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="flex w-full items-center justify-between gap-spacing-12 text-left"
      >
        <h4 className={`${titleClassName} mb-0`}>{title}</h4>
        <ChevronDown
          size={16}
          className={`shrink-0 text-neutral-60 transition-transform dark:text-neutral-25 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
          aria-hidden="true"
        />
      </button>
      {isOpen && (
        <div id={contentId} className="mt-spacing-8">
          {children}
        </div>
      )}
    </div>
  );
};
