// ProgressBar component for overall transaction progress
import React from 'react';
import { useTranslation } from 'next-i18next';

interface ProgressBarProps {
  completed: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProgressBar({
  completed,
  total,
  label,
  showPercentage = true,
  showCount = true,
  size = 'md',
  className = '',
}: ProgressBarProps) {
  const { t } = useTranslation('transactions');
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const heights = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  // Color based on progress
  const getProgressColor = () => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-green-400';
    if (percentage >= 50) return 'bg-blue-500';
    if (percentage >= 25) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label || t('overall_progress')}
        </span>
        {showPercentage && (
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {percentage}%
          </span>
        )}
      </div>

      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${heights[size]} overflow-hidden`}>
        <div
          className={`${getProgressColor()} ${heights[size]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {showCount && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('progress.items_complete', { completed, total })}
        </p>
      )}
    </div>
  );
}

export default ProgressBar;
