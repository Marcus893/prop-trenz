// Transaction Card component for list view
import React from 'react';

import { useTranslation } from 'next-i18next';
import { TransactionWithProgress, TransactionStage } from '@/lib/transactions/types';
import { ProgressBar } from './ProgressBar';
import { MapPin, Calendar, DollarSign, MoreVertical, Trash2, Pause, Play, Lock, Crown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es, zhCN, enUS } from 'date-fns/locale';
import { useRouter } from 'next/router';
import { useSubscription } from '@/lib/subscription';

interface TransactionCardProps {
  transaction: TransactionWithProgress;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: string) => void;
}

const STAGE_LABELS: Record<TransactionStage, string> = {
  search: 'Search',
  analysis: 'Analysis',
  offer: 'Offer',
  due_diligence: 'Due Diligence',
  financing: 'Financing',
  closing: 'Closing',
  post_closing: 'Post-Closing',
  listing: 'Listing',
  gather_required_documents: 'Gather Documents',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  on_hold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
};

// Badge colors for transaction types
const TYPE_COLORS: Record<string, string> = {
  purchase: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  sale: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  rent: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

export function TransactionCard({ transaction, onDelete, onStatusChange }: TransactionCardProps) {
  const { t } = useTranslation('transactions');
  const router = useRouter();
  const [showMenu, setShowMenu] = React.useState(false);
  const { openUpgradeModal } = useSubscription();

  const locale = router.locale === 'es' ? es : router.locale === 'zh' ? zhCN : enUS;
  const isLocked = transaction.is_locked ?? false;

  const formatPrice = (price?: number) => {
    if (!price) return null;
    return new Intl.NumberFormat(router.locale, {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const displayPrice = transaction.accepted_price || transaction.offer_price || transaction.listing_price;
  const displayAddress = transaction.property_address || t('untitled_property');
  const displayLocation = [transaction.neighborhood, transaction.city].filter(Boolean).join(', ');

  const goToDetail = () => {
    if (isLocked) {
      openUpgradeModal();
    } else {
      router.push(`/transactions/${transaction.id}`);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={goToDetail}
      onKeyDown={(e) => { if (e.key === 'Enter') goToDetail(); }}
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer relative ${
        isLocked ? 'opacity-75' : ''
      }`}
    >
      {/* Locked overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100/80 to-gray-200/80 dark:from-gray-700/80 dark:to-gray-800/80 rounded-lg flex items-center justify-center z-10">
          <div className="text-center p-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 mb-2">
              <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('transaction_locked', 'Transaction Locked')}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); openUpgradeModal(); }}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors"
            >
              <Crown className="w-4 h-4" />
              {t('unlock_now', 'Unlock Now')}
            </button>
          </div>
        </div>
      )}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {displayAddress}
            </h3>
          {displayLocation && (
            <p className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
              <MapPin className="w-4 h-4 mr-1" />
              {displayLocation}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 ml-2">
          {/* Transaction type badge */}
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${TYPE_COLORS[transaction.transaction_type || 'other']}`}>
            {t(`types.${transaction.transaction_type}`, transaction.transaction_type || 'Other')}
          </span>

          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[transaction.status]}`}>
            {t(`status.${transaction.status}`, transaction.status)}
          </span>

          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <MoreVertical className="w-5 h-5 text-gray-500" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                  {transaction.status === 'active' && onStatusChange && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onStatusChange(transaction.id, 'on_hold'); setShowMenu(false); }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      {t('actions.pause')}
                    </button>
                  )}
                  {transaction.status === 'on_hold' && onStatusChange && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onStatusChange(transaction.id, 'active'); setShowMenu(false); }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {t('actions.resume')}
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm(t('confirm_delete'))) { onDelete(transaction.id); } setShowMenu(false); }}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('actions.delete')}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <ProgressBar
        completed={transaction.completed_checklist_items}
        total={transaction.total_checklist_items}
        size="sm"
        className="mb-3"
      />

      {/* Stage and Price */}
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center text-gray-600 dark:text-gray-400">
          <span className="font-medium">{t(`stages.${transaction.current_stage}.name`, STAGE_LABELS[transaction.current_stage])}</span>
        </div>
        {displayPrice && (
          <div className="flex items-center text-gray-900 dark:text-white font-semibold">
            <DollarSign className="w-4 h-4 mr-1" />
            {formatPrice(displayPrice)}
          </div>
        )}
      </div>

      {/* Updated time */}
      <div className="flex items-center text-xs text-gray-400 mt-2">
        <Calendar className="w-3 h-3 mr-1" />
        {t('updated')} {formatDistanceToNow(new Date(transaction.updated_at), { addSuffix: true, locale })}
      </div>
    </div>
  );
}

export default TransactionCard;
