// Transaction detail page - Stage-based dashboard
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { Layout } from '@/components/Layout';
import {
  ProgressBar,
  StageProgress,
  StageChecklist,
  StageCosts,
  TransactionNotes,
  KeyNumbers,
} from '@/components/transactions';
import {
  TransactionFullData,
  TransactionStage,
  ChecklistItem,
  TransactionCost,
  NoteType,
  getNextStage,
  getPreviousStage,
} from '@/lib/transactions/types';
import { useAuth } from '@/lib/auth';
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Calendar,
  Check,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es, zhCN, enUS } from 'date-fns/locale';

export default function TransactionDetailPage() {
  const { t } = useTranslation('transactions');
  const { session } = useAuth();
  const router = useRouter();
  const { id } = router.query;

  const [transaction, setTransaction] = useState<TransactionFullData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'costs' | 'timeline'>('overview');

  // Address edit state
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [neighborhoodInput, setNeighborhoodInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isTogglingSkip, setIsTogglingSkip] = useState(false);


  const locale = router.locale === 'es' ? es : router.locale === 'zh' ? zhCN : enUS;

  const fetchTransaction = useCallback(async () => {
    if (!session?.access_token || !id) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/transactions/${id}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transaction');
      }

      const data = await response.json();
      setTransaction(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token, id]);

  // Lightweight costs refresh to sync recalculated estimates without re-fetching the whole transaction
  const fetchCosts = useCallback(async () => {
    if (!session?.access_token || !id) return;
    try {
      const res = await fetch(`/api/transactions/${id}/costs`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const costs = await res.json();
      setTransaction((prev) => (prev ? { ...prev, costs } : prev));
    } catch (e) {
      // ignore; we'll refresh full transaction on next error
    }
  }, [session?.access_token, id]);

  useEffect(() => {
    if (session?.access_token && id) {
      fetchTransaction();
    }
  }, [session?.access_token, id, fetchTransaction]);

  // Realtime subscriptions: refresh transaction when checklist, costs, or transaction record changes
  useEffect(() => {
    if (!id || !session?.access_token) return;

    // Subscribe to Postgres changes for checklist, costs, and the transaction row itself
    const checklistSub = supabase
      .channel(`realtime:transaction_checklist:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transaction_checklist', filter: `transaction_id=eq.${id}` }, () => {
        fetchTransaction();
      })
      .subscribe();

    const costsSub = supabase
      .channel(`realtime:transaction_costs:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transaction_costs', filter: `transaction_id=eq.${id}` }, () => {
        // Refresh costs and transaction to keep progress and totals in sync
        fetchCosts();
        fetchTransaction();
      })
      .subscribe();

    const txSub = supabase
      .channel(`realtime:user_transactions:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_transactions', filter: `id=eq.${id}` }, () => {
        fetchTransaction();
      })
      .subscribe();

    return () => {
      // Clean up subscriptions
      try { checklistSub.unsubscribe(); } catch (e) {}
      try { costsSub.unsubscribe(); } catch (e) {}
      try { txSub.unsubscribe(); } catch (e) {}
    };
  }, [id, session?.access_token, fetchTransaction, fetchCosts]);

  // Get current stage data
  const currentStage = transaction?.current_stage || 'search';
  // If user opted out of financing and we're on the financing stage, present an empty checklist and costs so the UI shows skipped state
  const stageChecklist = (transaction?.skip_financing && currentStage === 'financing') ? [] : (transaction?.checklist.filter((item) => item.stage === currentStage) || []);
  const stageCosts = (transaction?.skip_financing && currentStage === 'financing') ? [] : (transaction?.costs.filter((cost) => cost.stage === currentStage) || []);


  // API handlers - optimistic updates to avoid page refresh

  // Address editing helpers
  const cancelEditAddress = () => {
    setEditingAddress(false);
    setAddressInput('');
    setNeighborhoodInput('');
    setCityInput('');
    setIsSavingAddress(false);
  };

  const saveAddress = async () => {
    if (!session?.access_token || !id || !transaction) return;
    // Require at least one non-empty address field
    if (!(addressInput.trim() || neighborhoodInput.trim() || cityInput.trim())) return;

    setIsSavingAddress(true);
    try {
      await updateTransaction({
        property_address: addressInput.trim(),
        neighborhood: neighborhoodInput.trim(),
        city: cityInput.trim(),
      });
      setEditingAddress(false);
      setAddressInput('');
      setNeighborhoodInput('');
      setCityInput('');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const updateTransaction = async (updates: Partial<TransactionFullData>) => {
    if (!session?.access_token || !id || !transaction) return;

    // Optimistically update local state
    setTransaction({ ...transaction, ...updates });

    const response = await fetch(`/api/transactions/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      // Revert on error
      fetchTransaction();
      return;
    }

    // If price-related fields changed, (1) update estimates locally immediately for snappy UX and
    // (2) refresh authoritative data from server (recalculation occurs server-side too)
    const priceFields = ['listing_price', 'accepted_price', 'offer_price'];
    const priceUpdateField = Object.keys(updates).find((k) => priceFields.includes(k)) as string | undefined;

    if (priceUpdateField && typeof (updates as any)[priceUpdateField] === 'number') {
      const newPrice = (updates as any)[priceUpdateField] as number;

      // Locally recalculate estimates for template-backed costs for instant feedback
      const locallyUpdatedCosts = transaction.costs.map((c) => {
        if (c.template?.typical_percentage) {
          return {
            ...c,
            estimated_amount: Math.round(newPrice * c.template.typical_percentage),
          };
        }
        return c;
      });

      setTransaction({ ...transaction, ...updates, costs: locallyUpdatedCosts });

      // Refresh costs only (non-blocking) to pick up server-side recalculations without reloading the page
      await fetchCosts();
    } else {
      // No price update: nothing else to do (we already optimistically updated state above)
    }
  };

  const toggleChecklistItem = async (itemId: string, isCompleted: boolean) => {
    if (!session?.access_token || !id || !transaction) return;

    // Build updated checklist and recalculated progress for optimistic UI
    const newChecklist = transaction.checklist.map((item) =>
      item.id === itemId
        ? { ...item, is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : undefined }
        : item
    );

    const total = newChecklist.length;
    const completed = newChecklist.filter((i) => i.is_completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Optimistically update local state (including progress)
    setTransaction({
      ...transaction,
      checklist: newChecklist,
      progress: { total, completed, percentage },
    });

    const response = await fetch(`/api/transactions/${id}/checklist`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ item_id: itemId, is_completed: isCompleted }),
    });

    if (!response.ok) {
      // Re-fetch authoritative data on failure
      fetchTransaction();
    }
  };

  const addChecklistItem = async (title: string, description?: string) => {
    if (!session?.access_token || !id || !transaction) return;

    // Add optimistic item with temp ID
    const tempId = `temp-${Date.now()}`;
    const newItem: ChecklistItem = {
      id: tempId,
      transaction_id: id as string,
      template_id: undefined,
      stage: currentStage,
      custom_title: title,
      custom_description: description,
      is_completed: false,
      completed_at: undefined,
      notes: undefined,
      created_at: new Date().toISOString(),
    };

    // Optimistic checklist + progress update
    const optimisticChecklist = [...transaction.checklist, newItem];
    const total = optimisticChecklist.length;
    const completed = optimisticChecklist.filter((i) => i.is_completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    setTransaction({
      ...transaction,
      checklist: optimisticChecklist,
      progress: { total, completed, percentage },
    });

    const response = await fetch(`/api/transactions/${id}/checklist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        stage: currentStage,
        custom_title: title,
        custom_description: description,
      }),
    });

    // Replace temp item with real data
    if (response.ok) {
      const realItem = await response.json();
      setTransaction((prev) =>
        prev
          ? {
              ...prev,
              checklist: prev.checklist.map((item) => (item.id === tempId ? realItem : item)),
            }
          : prev
      );
    } else {
      fetchTransaction();
    }
  };

  const deleteChecklistItem = async (itemId: string) => {
    if (!session?.access_token || !id || !transaction) return;

    // Optimistically remove item and update progress
    const newChecklist = transaction.checklist.filter((item) => item.id !== itemId);
    const total = newChecklist.length;
    const completed = newChecklist.filter((i) => i.is_completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    setTransaction({
      ...transaction,
      checklist: newChecklist,
      progress: { total, completed, percentage },
    });

    const response = await fetch(`/api/transactions/${id}/checklist`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ item_id: itemId }),
    });

    if (!response.ok) {
      fetchTransaction();
    }
  };

  const updateCost = async (costId: string, updates: Partial<TransactionCost>) => {
    if (!session?.access_token || !id || !transaction) return;

    // Optimistically update local state
    setTransaction({
      ...transaction,
      costs: transaction.costs.map((cost) =>
        cost.id === costId ? { ...cost, ...updates } : cost
      ),
    });

    const response = await fetch(`/api/transactions/${id}/costs`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ cost_id: costId, ...updates }),
    });

    if (!response.ok) {
      fetchTransaction();
    }
  };

  const deleteCost = async (costId: string) => {
    if (!session?.access_token || !id || !transaction) return;

    // Optimistic remove
    const prevCosts = transaction.costs;
    setTransaction({
      ...transaction,
      costs: transaction.costs.filter((c) => c.id !== costId),
    });

    const response = await fetch(`/api/transactions/${id}/costs`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ cost_id: costId }),
    });

    if (!response.ok) {
      // revert on failure
      setTransaction({ ...transaction, costs: prevCosts });
      fetchTransaction();
    }
  };

  const addCost = async (name: string, estimatedAmount?: number, paidTo?: string) => {
    if (!session?.access_token || !id || !transaction) return;

    // Add optimistic item with temp ID
    const tempId = `temp-${Date.now()}`;
    const newCost: TransactionCost = {
      id: tempId,
      transaction_id: id as string,
      template_id: undefined,
      stage: currentStage,
      custom_name: name,
      custom_description: undefined,
      estimated_amount: estimatedAmount,
      actual_amount: undefined,
      is_paid: false,
      paid_date: undefined,
      payment_method: undefined,
      receipt_url: undefined,
      notes: undefined,
      paid_to: paidTo,
      created_at: new Date().toISOString(),
    };

    setTransaction({
      ...transaction,
      costs: [...transaction.costs, newCost],
    });

    const response = await fetch(`/api/transactions/${id}/costs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        stage: currentStage,
        custom_name: name,
        estimated_amount: estimatedAmount,
        paid_to: paidTo,
      }),
    });

    if (response.ok) {
      const realCost = await response.json();
      setTransaction((prev) =>
        prev
          ? {
              ...prev,
              costs: prev.costs.map((cost) => (cost.id === tempId ? realCost : cost)),
            }
          : prev
      );
    } else {
      fetchTransaction();
    }
  };

  const addNote = async (content: string, noteType: NoteType) => {
    if (!session?.access_token || !id || !transaction) return;

    // Add optimistic note with temp ID
    const tempId = `temp-${Date.now()}`;
    const newNote = {
      id: tempId,
      transaction_id: id as string,
      stage: currentStage,
      note_type: noteType,
      content,
      created_at: new Date().toISOString(),
    };

    setTransaction({
      ...transaction,
      notes: [...transaction.notes, newNote],
    });

    const response = await fetch(`/api/transactions/${id}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ content, note_type: noteType, stage: currentStage }),
    });

    if (response.ok) {
      const realNote = await response.json();
      setTransaction((prev) =>
        prev
          ? {
              ...prev,
              notes: prev.notes.map((note) => (note.id === tempId ? realNote : note)),
            }
          : prev
      );
    } else {
      fetchTransaction();
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!session?.access_token || !id || !transaction) return;

    // Optimistically remove note
    setTransaction({
      ...transaction,
      notes: transaction.notes.filter((note) => note.id !== noteId),
    });

    const response = await fetch(`/api/transactions/${id}/notes`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ note_id: noteId }),
    });

    if (!response.ok) {
      fetchTransaction();
    }
  };

  const advanceStage = async () => {
    const nextStage = getNextStage(currentStage);
    if (nextStage) {
      await updateTransaction({ current_stage: nextStage });
    }
  };

  const goBackStage = async () => {
    const prevStage = getPreviousStage(currentStage);
    if (prevStage) {
      await updateTransaction({ current_stage: prevStage });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (error || !transaction) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('error_title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{error || t('not_found')}</p>
          <Link href="/transactions" className="inline-block mt-4 text-blue-600 hover:underline">
            {t('back_to_list')}
          </Link>
        </div>
      </Layout>
    );
  }

  const displayAddress = transaction.property_address || t('untitled_property');
  const displayLocation = [transaction.neighborhood, transaction.city].filter(Boolean).join(', ');

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/transactions"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('back_to_list')}
          </Link>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
            {/* Editable Address */}
            {editingAddress ? (
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    placeholder={t('addresses.street', 'Street address')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-semibold text-gray-900"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveAddress();
                      if (e.key === 'Escape') cancelEditAddress();
                    }}
                  />

                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={neighborhoodInput}
                      onChange={(e) => setNeighborhoodInput(e.target.value)}
                      placeholder={t('addresses.neighborhood', 'Neighborhood')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveAddress();
                        if (e.key === 'Escape') cancelEditAddress();
                      }}
                    />
                    <input
                      type="text"
                      value={cityInput}
                      onChange={(e) => setCityInput(e.target.value)}
                      placeholder={t('addresses.city', 'City')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveAddress();
                        if (e.key === 'Escape') cancelEditAddress();
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={saveAddress}
                    disabled={isSavingAddress || !(addressInput.trim() || neighborhoodInput.trim() || cityInput.trim())}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={cancelEditAddress}
                    className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {displayAddress}
                  </h1>
                  <button
                    onClick={() => {
                      setEditingAddress(true);
                      setAddressInput(transaction.property_address || '');
                      setNeighborhoodInput(transaction.neighborhood || '');
                      setCityInput(transaction.city || '');
                    }}
                    className="text-sm text-gray-500 hover:text-blue-600"
                  >
                    {t('edit')}
                  </button>
                </div>

                {displayLocation && (
                  <p className="flex items-center text-gray-600 dark:text-gray-400 mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    {displayLocation}
                  </p>
                )}
              </div>
            )}
          </div>


          </div>
        </div>

        {/* Overall Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <ProgressBar
            completed={transaction.progress.completed}
            total={transaction.progress.total}
            label={t('overall_progress')}
            size="lg"
          />
        </div>

        {/* Stage Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <StageProgress currentStage={currentStage} onStageClick={(stage) => updateTransaction({ current_stage: stage })} />
        </div>

        {/* Current Stage Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t(`stages.${currentStage}.name`)}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              {t(`stages.${currentStage}.description`)}
            </p>

            {/* Financing opt-out control */}
            {currentStage === 'financing' && transaction && (
              <div className="mt-3 flex items-center gap-4">
                {transaction.skip_financing ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700">{t('skipped_label', 'Skipped')}</span>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } }}
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsTogglingSkip(true);
                        try {
                          const newSkip = !transaction.skip_financing;
                          // optimistic update and recalc progress
                          const filtered = newSkip ? transaction.checklist.filter((i) => i.stage !== 'financing') : transaction.checklist;
                          const total = filtered.length;
                          const completed = filtered.filter((i) => i.is_completed).length;
                          // Also update checklist in state when toggling skip so all components reflect the change immediately
                          setTransaction({ ...transaction, skip_financing: newSkip, checklist: filtered, progress: { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 } });
                          await updateTransaction({ skip_financing: newSkip });
                          // Refresh costs and full transaction after server update to ensure canonical data
                          await fetchCosts();
                          await fetchTransaction();
                        } catch (err) {
                          // revert optimistic UI on error
                          fetchTransaction();
                        } finally {
                          setIsTogglingSkip(false);
                        }
                      }}
                      disabled={isTogglingSkip}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {t('skip_financing_undo', 'Undo skip')}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } }}
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsTogglingSkip(true);
                        try {
                          const newSkip = true;
                          const filtered = transaction.checklist.filter((i) => i.stage !== 'financing');
                          const total = filtered.length;
                          const completed = filtered.filter((i) => i.is_completed).length;
                          setTransaction({ ...transaction, skip_financing: newSkip, checklist: filtered, progress: { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 } });
                          await updateTransaction({ skip_financing: newSkip });
                          await fetchCosts();
                          await fetchTransaction();
                        } catch (err) {
                          await fetchTransaction();
                        } finally {
                          setIsTogglingSkip(false);
                        }
                      }}
                      className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                    >
                      {t('skip_financing', 'Skip Financing')}
                    </button>
                    <p className="text-xs text-gray-500 max-w-lg">{t('skip_financing_help', 'I do not need a mortgage for this purchase; exclude financing items from my progress')}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {getPreviousStage(currentStage) && (
              <button
                onClick={goBackStage}
                className="flex items-center gap-1 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('previous_stage')}
              </button>
            )}
            {getNextStage(currentStage) && (
              <button
                onClick={advanceStage}
                className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                {t('next_stage')}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column - Key Numbers */}
          <div className="lg:col-span-1">
            <KeyNumbers transaction={transaction} onUpdate={updateTransaction} />
          </div>

          {/* Middle column - Checklist */}
          <div className="lg:col-span-1">
            <StageChecklist
              items={stageChecklist}
              stage={currentStage}
              onToggle={toggleChecklistItem}
              onAddItem={addChecklistItem}
              onDeleteItem={deleteChecklistItem}
              disabled={!!(transaction?.skip_financing && currentStage === 'financing')}
              onReorder={async (orderedIds: string[]) => {
                if (!session?.access_token || !id || !transaction) return;

                // Save previous checklist to revert if needed
                const prevChecklist = transaction.checklist;

                // Build new checklist array with updated item_order for this stage
                const otherItems = prevChecklist.filter((it) => it.stage !== currentStage);
                const stageItemsMap: Record<string, any> = {};
                prevChecklist.filter((it) => it.stage === currentStage).forEach((it) => { stageItemsMap[it.id] = it; });

                const newStageItems = orderedIds.map((itemId, idx) => {
                  const itm = stageItemsMap[itemId];
                  return { ...itm, item_order: idx + 1 };
                }).filter(Boolean);

                // Optimistically update UI
                setTransaction({ ...transaction, checklist: [...otherItems, ...newStageItems] });

                try {
                  const res = await fetch(`/api/transactions/${id}/checklist`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({ action: 'reorder', order: orderedIds }),
                  });

                  if (!res.ok) {
                    throw new Error('Reorder failed');
                  }
                } catch (err) {
                  // revert on failure
                  fetchTransaction();
                }
              }}
            />
          </div>

          {/* Right column - Costs */}
          <div className="lg:col-span-1">
            <StageCosts
              costs={stageCosts}
              stage={currentStage}
              onUpdateCost={updateCost}
              onAddCost={addCost}
              onDeleteCost={deleteCost}
              disabled={transaction?.skip_financing}
            />
          </div>
        </div>

        {/* Notes section */}
        <div className="mt-6">
          <TransactionNotes
            notes={transaction.notes}
            onAddNote={addNote}
            onDeleteNote={deleteNote}
            maxDisplay={5}
          />
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'transactions'])),
    },
  };
};
