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
import { Plus, FolderOpen } from "lucide-react";
import Link from "next/link";

export default function TransactionsPage() {
  const { t } = useTranslation("transactions");
  const { user, session } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionWithProgress[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter by transaction type (purchase, sale, rent, other)
  const [filterType, setFilterType] = useState<string | null>(null);

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
        setTransactions(data);
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
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
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
            <Link href="/transactions/new">
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                <Plus className="w-5 h-5" />
                {t("new_transaction")}
              </button>
            </Link>
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
            <Link href="/transactions/new">
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                <Plus className="w-5 h-5" />
                {t("start_first_transaction")}
              </button>
            </Link>
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
