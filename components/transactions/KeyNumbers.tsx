// Key Numbers / Financials component
import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { Transaction } from '@/lib/transactions/types';
import { DollarSign, TrendingDown, TrendingUp, Percent, Edit2, Check, X } from 'lucide-react';

interface KeyNumbersProps {
  transaction: Transaction;
  onUpdate: (updates: Partial<Transaction>) => Promise<void>;
}

type EditableField = 'listing_price' | 'offer_price' | 'accepted_price' | 'down_payment' | 'mortgage_amount' | 'interest_rate' | 'mortgage_term_years';

export function KeyNumbers({ transaction, onUpdate }: KeyNumbersProps) {
  const { t } = useTranslation('transactions');
  const router = useRouter();
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null) return '-';
    return new Intl.NumberFormat(router.locale, {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const startEdit = (field: EditableField) => {
    const value = transaction[field];
    setEditingField(field);
    setValidationError(null);
    // For interest rate, show a human-friendly percentage (7 instead of 0.07)
    if (field === 'interest_rate' && typeof value === 'number') {
      setEditValue((value * 100).toString());
    } else {
      setEditValue(value?.toString() || '');
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
    setValidationError(null);
  };

  const saveEdit = async () => {
    if (!editingField) return;

    // Validation for interest rate
    if (editingField === 'interest_rate') {
      const cleaned = editValue.replace('%', '').trim();
      const parsed = parseFloat(cleaned);
      if (isNaN(parsed) || parsed < 0 || parsed > 100) {
        setValidationError('Enter a valid percentage between 0 and 100');
        return;
      }
    }

    setIsSaving(true);
    try {
      const numValue = parseFloat(editValue.replace('%',''));
      if (!isNaN(numValue)) {
        let finalValue: number = numValue;
        // For interest_rate, interpret user input as percent when they type a whole number (e.g., 7 -> 0.07).
        if (editingField === 'interest_rate') {
          if (Math.abs(numValue) > 1) {
            finalValue = parseFloat((numValue / 100).toFixed(4));
          } else {
            // If they entered a fractional (0.07), assume they meant decimal already; normalize to 4 decimals
            finalValue = parseFloat(numValue.toFixed(4));
          }
        }

        await onUpdate({ [editingField]: finalValue });
      }
    } finally {
      setIsSaving(false);
      setEditingField(null);
      setEditValue('');
      setValidationError(null);
    }
  };

  // Calculate derived values
  const currentPrice = transaction.accepted_price || transaction.offer_price || transaction.listing_price;
  const priceGap =
    typeof transaction.offer_price === 'number' &&
    typeof transaction.listing_price === 'number' &&
    typeof transaction.accepted_price === 'number'
      ? transaction.listing_price - transaction.accepted_price
      : null;
  const negotiatedDiscount = transaction.accepted_price && transaction.listing_price
    ? ((transaction.listing_price - transaction.accepted_price) / transaction.listing_price) * 100
    : null;
  const monthlyPayment = transaction.mortgage_amount && transaction.interest_rate && transaction.mortgage_term_years
    ? calculateMonthlyPayment(transaction.mortgage_amount, transaction.interest_rate, transaction.mortgage_term_years)
    : null;

  const renderEditableField = (
    field: EditableField,
    label: string,
    icon: React.ReactNode,
    format: (value: number) => string = formatPrice
  ) => {
    const isEditing = editingField === field;
    const value = transaction[field] as number | undefined;

    return (
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          {icon}
          <span className="text-sm">{label}</span>
        </div>
        
        {isEditing ? (
          <div className="flex items-center gap-1">
            {editingField === 'interest_rate' ? (
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={editValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEditValue(v);
                    // run quick validation
                    const cleaned = v.replace('%', '').trim();
                    const parsed = parseFloat(cleaned);
                    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
                      setValidationError('Enter a valid percentage between 0 and 100');
                    } else {
                      setValidationError(null);
                    }
                  }}
                  className="w-32 pr-8 px-2 py-1 text-sm text-right border border-blue-500 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                />
                <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                {validationError && (
                  <div className="text-xs text-red-600 mt-1">{validationError}</div>
                )}
              </div>
            ) : (
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-32 px-2 py-1 text-sm text-right border border-blue-500 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit();
                  if (e.key === 'Escape') cancelEdit();
                }}
              />
            )}

            <button
              onClick={saveEdit}
              disabled={isSaving || !!validationError}
              className="p-1 text-green-600 hover:text-green-700"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={cancelEdit}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => startEdit(field)}
            className="flex items-center gap-1 font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 group"
          >
            <span>
              {(() => {
                // Treat null/undefined as empty; for specific fields (interest_rate, mortgage_term_years)
                // treat 0 as empty when creating a new transaction so the UI shows '-' like other fields.
                if (value === undefined || value === null) return '-';
                if (field === 'interest_rate' && value === 0) return '-';
                if (field === 'mortgage_term_years' && (value === 0 || value === null)) return '-';
                return format(value);
              })()}
            </span>
            <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t('numbers.title')}
        </h3>
      </div>

      <div className="p-4 space-y-1">
        {/* Price section */}
        <div className="pb-3 border-b border-gray-100 dark:border-gray-700">
          {renderEditableField(
            'listing_price',
            t('numbers.listing_price'),
            <DollarSign className="w-4 h-4" />
          )}
          {renderEditableField(
            'offer_price',
            t('numbers.offer_price'),
            <TrendingDown className="w-4 h-4" />
          )}
          {renderEditableField(
            'accepted_price',
            t('numbers.accepted_price'),
            <DollarSign className="w-4 h-4" />
          )}
          
          {/* Calculated: Price gap */}
          {priceGap !== null && (
            <div className="flex items-center justify-between py-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400 italic">
                {t('numbers.price_gap')}
              </span>
              <span className={priceGap > 0 ? 'text-green-600' : 'text-red-600'}>
                {priceGap > 0 ? '-' : '+'}{formatPrice(Math.abs(priceGap))}
              </span>
            </div>
          )}
          
          {/* Calculated: Negotiated discount */}
          {negotiatedDiscount !== null && (
            <div className="flex items-center justify-between py-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400 italic">
                {t('numbers.negotiated_discount')}
              </span>
              <span className="text-green-600">
                {negotiatedDiscount.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* Financing section */}
        <div className="pt-2">
          {renderEditableField(
            'down_payment',
            t('numbers.down_payment'),
            <TrendingDown className="w-4 h-4" />
          )}
          {renderEditableField(
            'mortgage_amount',
            t('numbers.mortgage_amount'),
            <DollarSign className="w-4 h-4" />
          )}
          {renderEditableField(
            'interest_rate',
            t('numbers.interest_rate'),
            <Percent className="w-4 h-4" />,
            (v) => `${(v * 100).toFixed(2)}%`
          )}
          {renderEditableField(
            'mortgage_term_years',
            t('numbers.mortgage_term'),
            <TrendingUp className="w-4 h-4" />,
            (v) => `${v} ${t('numbers.years')}`
          )}

          {/* Calculated: Monthly payment */}
          {monthlyPayment && (
            <div className="flex items-center justify-between py-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400 font-medium">
                {t('numbers.monthly_payment')}
              </span>
              <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                {formatPrice(monthlyPayment)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to calculate monthly mortgage payment
function calculateMonthlyPayment(principal: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 12;
  const numPayments = years * 12;
  
  if (monthlyRate === 0) return principal / numPayments;
  
  const payment = principal * 
    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  return Math.round(payment);
}

export default KeyNumbers;
