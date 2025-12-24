// Stage Progress visual indicator
import React from 'react';
import { useTranslation } from 'next-i18next';
import { TransactionStage, STAGE_ORDER, isStageCompleted, isCurrentStage } from '@/lib/transactions/types';
import { CheckCircle } from 'lucide-react';

interface StageProgressProps {
  currentStage: TransactionStage;
  onStageClick?: (stage: TransactionStage) => void;
  compact?: boolean;
}

const STAGE_ICONS: Record<TransactionStage, string> = {
  search: '🔍',
  analysis: '📊',
  offer: '📝',
  due_diligence: '🔎',
  financing: '🏦',
  closing: '🔑',
  post_closing: '🏠',
};

export function StageProgress({ currentStage, onStageClick, compact = false }: StageProgressProps) {
  const { t } = useTranslation('transactions');

  return (
    <div className="w-full">
      {/* Desktop view */}
      <div className={`hidden ${compact ? 'md:flex' : 'sm:flex'} items-center justify-between`}>
        {STAGE_ORDER.map((stage, index) => {
          const isCompleted = isStageCompleted(currentStage, stage);
          const isCurrent = isCurrentStage(currentStage, stage);
          // Make stages clickable whenever an onStageClick handler exists (allow jumping to any stage)
          const isClickable = Boolean(onStageClick);

          return (
            <React.Fragment key={stage}>
              {/* Stage indicator */}
              <button
                onClick={() => isClickable && onStageClick!(stage)}
                disabled={!isClickable}
                className={`
                  flex flex-col items-center p-2 rounded-lg transition-all
                  ${isClickable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800' : 'cursor-default'}
                  ${isCurrent ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                `}
              >
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-lg
                    ${isCompleted ? 'bg-green-100 dark:bg-green-900' : ''}
                    ${isCurrent ? 'bg-blue-100 dark:bg-blue-900' : ''}
                    ${!isCompleted && !isCurrent ? 'bg-gray-100 dark:bg-gray-800' : ''}
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <span>{STAGE_ICONS[stage]}</span>
                  )}
                </div>
                <span
                  className={`
                    text-xs mt-1 font-medium text-center
                    ${isCurrent ? 'text-blue-600 dark:text-blue-400' : ''}
                    ${isCompleted ? 'text-green-600 dark:text-green-400' : ''}
                    ${!isCompleted && !isCurrent ? 'text-gray-500 dark:text-gray-400' : ''}
                  `}
                >
                  {t(`stages.${stage}.short_name`, stage)}
                </span>
              </button>

              {/* Connector line */}
              {index < STAGE_ORDER.length - 1 && (
                <div
                  className={`
                    flex-1 h-0.5 mx-1
                    ${isStageCompleted(currentStage, STAGE_ORDER[index + 1]) || isCurrentStage(currentStage, STAGE_ORDER[index + 1])
                      ? 'bg-green-400'
                      : 'bg-gray-300 dark:bg-gray-600'
                    }
                  `}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile view - compact dropdown or simplified */}
      <div className={`${compact ? 'md:hidden' : 'sm:hidden'}`}>
        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{STAGE_ICONS[currentStage]}</span>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t(`stages.${currentStage}.name`, currentStage)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('stage_progress', { current: STAGE_ORDER.indexOf(currentStage) + 1, total: STAGE_ORDER.length })}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            {STAGE_ORDER.map((stage, index) => {
              const isCompleted = isStageCompleted(currentStage, stage);
              const isCurrent = isCurrentStage(currentStage, stage);
              const clickable = Boolean(onStageClick);

              return (
                <button
                  key={stage}
                  onClick={() => clickable && onStageClick!(stage)}
                  aria-label={t(`stages.${stage}.name`, stage)}
                  className={`
                    w-2 h-2 rounded-full
                    ${isCompleted ? 'bg-green-500' : ''}
                    ${isCurrent ? 'bg-blue-500' : ''}
                    ${!isCompleted && !isCurrent ? 'bg-gray-300 dark:bg-gray-600' : ''}
                    ${clickable ? 'cursor-pointer' : 'cursor-default'}
                  `}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StageProgress;
