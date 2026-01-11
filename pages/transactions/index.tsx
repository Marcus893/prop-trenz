// Transaction list page
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import { Layout } from "@/components/Layout";
import { TransactionCard } from "@/components/transactions";
import { TransactionWithProgress } from "@/lib/transactions/types";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/lib/subscription";
import { Plus, FolderOpen, Lock, Crown, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function TransactionsPage() {
  const { t } = useTranslation("transactions");
  const { user, session } = useAuth();
  const { subscription, loading: subscriptionLoading, openUpgradeModal, refresh: refreshSubscription } = useSubscription();
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionWithProgress[]>(
    []
  );
  const [subscriptionAccess, setSubscriptionAccess] = useState<{
    hasFullAccess: boolean;
    isExpiringSoon: boolean;
    expiresAt: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter by transaction type (purchase, sale, rent, other)
  const [filterType, setFilterType] = useState<string | null>(null);

  // Check if user can create more transactions
  const canCreateTransaction = subscription?.canCreateTransaction ?? true;
  const isFreeTier = subscription?.tier === 'free' || !subscription?.tier;
  const isPaidActive = subscription?.tier && subscription.tier !== 'free' && subscription.status === 'active';
  const isCancelled = subscription?.status === 'cancelled';
  
  // Check if subscription is expiring soon (from API response)
  const isExpiringSoon = subscriptionAccess?.isExpiringSoon ?? false;
  
  // Check if subscription expires within 7 days (fallback to original logic)
  const expiresWithin7Days = isExpiringSoon || (() => {
    if (!isCancelled || !subscription?.currentPeriodEnd) return false;
    const expiryDate = new Date(subscription.currentPeriodEnd);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
  })();
  
  // Check if subscription has expired (user has locked transactions)
  const hasLockedTransactions = transactions.some(tx => tx.is_locked);
  
  const daysUntilExpiry = subscriptionAccess?.expiresAt 
    ? Math.ceil((new Date(subscriptionAccess.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : subscription?.currentPeriodEnd 
    ? Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const fetchTransactions = useCallback(
    async (type?: string | null) => {
      if (!session?.access_token) return;

      try {
        setIsLoading(true);
        const url = type
          ? `/api/transactions?type=${encodeURIComponent(type)}`
          : "/api/transactions";
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch transactions");
        }

        const data = await response.json();
        // Handle new response format: { transactions: [...], subscription: {...} }
        if (data.transactions && Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
          setSubscriptionAccess(data.subscription || null);
        } else if (Array.isArray(data)) {
          // Backward compatibility for old format
          setTransactions(data);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [session?.access_token]
  );

  // Initialize filter from query param and fetch
  useEffect(() => {
    const typeFromQuery =
      typeof router.query.type === "string" ? router.query.type : null;
    setFilterType(typeFromQuery);

    if (session?.access_token) {
      fetchTransactions(typeFromQuery);
      // Refresh subscription status to ensure it's up to date
      refreshSubscription();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  // Refetch when filter changes
  useEffect(() => {
    if (!session?.access_token) return;
    fetchTransactions(filterType ?? null);
    // update url query param without full reload
    const query = { ...router.query } as any;
    if (filterType) {
      query.type = filterType;
    } else {
      delete query.type;
    }
    router.push({ pathname: router.pathname, query }, undefined, {
      shallow: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType]);

  const handleDelete = async (id: string) => {
    if (!session?.access_token) return;

    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        setTransactions((prev) => prev.filter((tx) => tx.id !== id));
        // Refresh subscription status to update canCreateTransaction
        refreshSubscription();
      }
    } catch (err) {
      console.error("Failed to delete transaction:", err);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    if (!session?.access_token) return;

    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchTransactions();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Calculate overall stats
  const activeTransactions = transactions.filter(
    (tx) => tx.status === "active"
  );
  const totalItems = transactions.reduce(
    (sum, tx) => sum + tx.total_checklist_items,
    0
  );
  const completedItems = transactions.reduce(
    (sum, tx) => sum + tx.completed_checklist_items,
    0
  );

  if (!user) {
    return (
      <Layout title={t("page_title")}>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <FolderOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t("login_required_title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t("login_required_description")}
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={t("page_title")} subtitle={t("page_subtitle")}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Subscription expired banner - show when has locked transactions */}
        {!subscriptionLoading && hasLockedTransactions && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-800 rounded-lg">
                  <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">
                    {t("subscription_expired_title", "Your subscription has expired")}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {t("subscription_expired_description", "You can only access your first transaction. Renew to unlock all your transactions.")}
                  </p>
                </div>
              </div>
              <button
                onClick={openUpgradeModal}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-medium hover:from-red-600 hover:to-orange-600 transition-colors"
              >
                <Crown className="w-4 h-4" />
                {t("renew_subscription", "Renew Subscription")}
              </button>
            </div>
          </div>
        )}

        {/* Expiring subscription banner - show when cancelled and expires within 7 days */}
        {!subscriptionLoading && !hasLockedTransactions && isCancelled && expiresWithin7Days && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-800 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">
                    {t("subscription_expiring_title", "Your subscription is expiring soon")}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {t("subscription_expiring_description", "Your access expires in {{days}} days. Renew now to keep tracking your transactions.", { days: daysUntilExpiry })}
                  </p>
                </div>
              </div>
              <button
                onClick={openUpgradeModal}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-medium hover:from-red-600 hover:to-orange-600 transition-colors"
              >
                <Crown className="w-4 h-4" />
                {t("renew_now", "Renew Now")}
              </button>
            </div>
          </div>
        )}

        {/* Subscription status banner for free tier */}
        {!subscriptionLoading && isFreeTier && transactions.length > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-lg">
                  <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    {t("free_tier_limit_reached", "You've used your free transaction")}
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    {t("upgrade_to_unlock", "Upgrade to track unlimited property purchases and sales")}
                  </p>
                </div>
              </div>
              <button
                onClick={openUpgradeModal}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-colors"
              >
                <Crown className="w-4 h-4" />
                {t("upgrade_now", "Upgrade Now")}
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter chips */}
            <button
              onClick={() => setFilterType(null)}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                !filterType
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              }`}
            >
              {t("filters.all", "All")}
            </button>
            <button
              onClick={() => setFilterType("purchase")}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filterType === "purchase"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              }`}
            >
              {t("types.purchase", "Purchase")}
            </button>
            <button
              onClick={() => setFilterType("sale")}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filterType === "sale"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              }`}
            >
              {t("types.sale", "Sale")}
            </button>
          </div>

          <div>
            {canCreateTransaction ? (
              <Link href="/transactions/new">
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  <Plus className="w-5 h-5" />
                  {t("new_transaction")}
                </button>
              </Link>
            ) : (
              <button
                onClick={openUpgradeModal}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-colors"
              >
                <Crown className="w-5 h-5" />
                {t("upgrade_to_add_more", "Upgrade to Add More")}
              </button>
            )}
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">{t("loading")}</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && transactions.length === 0 && (
          <div className="text-center py-16">
            <FolderOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t("empty_title")}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {t("empty_description")}
            </p>
            {canCreateTransaction ? (
              <Link href="/transactions/new">
                <button className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                  <Plus className="w-5 h-5" />
                  {t("start_first_transaction")}
                </button>
              </Link>
            ) : (
              <button
                onClick={openUpgradeModal}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600"
              >
                <Crown className="w-5 h-5" />
                {t("upgrade_to_add_more", "Upgrade to Add More")}
              </button>
            )}
          </div>
        )}

        {/* Transaction list */}
        {!isLoading && transactions.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {transactions.map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "en", [
        "common",
        "transactions",
      ])),
    },
  };
};
