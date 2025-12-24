// Stage Costs component
import React, { useState } from "react";
import { useTranslation } from "next-i18next";
import { useRouter } from "next/router";
import { TransactionCost, TransactionStage } from "@/lib/transactions/types";
import { Check, Plus, ChevronDown, ChevronUp, Receipt } from "lucide-react";

interface StageCostsProps {
  costs: TransactionCost[];
  stage: TransactionStage;
  onUpdateCost: (
    costId: string,
    updates: Partial<TransactionCost>
  ) => Promise<void>;
  onAddCost?: (
    name: string,
    estimatedAmount?: number,
    paidTo?: string
  ) => Promise<void>;
  onDeleteCost?: (costId: string) => Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
}

export function StageCosts({
  costs,
  stage,
  onUpdateCost,
  onAddCost,
  onDeleteCost,
  disabled = false,
  isLoading = false,
}: StageCostsProps) {
  const { t } = useTranslation("transactions");
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCostName, setNewCostName] = useState("");
  const [newCostAmount, setNewCostAmount] = useState("");
  const [newCostPaidTo, setNewCostPaidTo] = useState("");
  const [expandedCosts, setExpandedCosts] = useState<Set<string>>(new Set());
  const [editingCost, setEditingCost] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null) return "-";
    return new Intl.NumberFormat(router.locale, {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getCostName = (cost: TransactionCost): string => {
    if (cost.custom_name) return cost.custom_name;
    if (cost.template?.name_key)
      return t(cost.template.name_key, cost.template.name_key);
    return "Unnamed Cost";
  };

  const totalEstimated = costs.reduce(
    (sum, c) => sum + (c.estimated_amount || 0),
    0
  );
  const totalActual = costs.reduce((sum, c) => sum + (c.actual_amount || 0), 0);
  const hasActuals = costs.some(
    (c) => c.actual_amount !== null && c.actual_amount !== undefined
  );

  const handleTogglePaid = async (cost: TransactionCost) => {
    await onUpdateCost(cost.id, {
      is_paid: !cost.is_paid,
      paid_date: !cost.is_paid
        ? new Date().toISOString().split("T")[0]
        : undefined,
    });
  };

  const handleUpdateActual = async (costId: string) => {
    const amount = parseFloat(editValue);
    if (!isNaN(amount)) {
      await onUpdateCost(costId, { actual_amount: amount });
    }
    setEditingCost(null);
    setEditValue("");
  };

  const handleAddCost = async () => {
    if (!onAddCost) return;
    const name = newCostName.trim();
    const paidTo = newCostPaidTo.trim();
    const amount = newCostAmount ? parseFloat(newCostAmount) : NaN;

    // Validation: all three fields required and amount must be a valid number
    if (!name || !paidTo || isNaN(amount)) return;

    await onAddCost(name, amount, paidTo);
    setNewCostName("");
    setNewCostAmount("");
    setNewCostPaidTo("");
    setShowAddForm(false);
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedCosts);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCosts(newExpanded);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header with totals */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {t("costs.title")}
          </h3>
          {!disabled ? (
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t("costs.estimated")}:{" "}
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatPrice(totalEstimated)}
                </span>
              </div>
              {hasActuals && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t("costs.actual")}:{" "}
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {formatPrice(totalActual)}
                  </span>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {disabled ? (
        <div className="p-6 text-center text-gray-600 dark:text-gray-400">
          <p className="font-medium">{t('skipped_label')}</p>
          <p className="text-sm mt-1">{t('skip_financing_help')}</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {costs.map((cost) => {
          const isExpanded = expandedCosts.has(cost.id);
          const isEditing = editingCost === cost.id;
          const paidTo = cost.template?.paid_to || cost.paid_to;

          return (
            <div key={cost.id} className="p-3">
              <div>
                {/* Cost name and paid toggle */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => handleTogglePaid(cost)}
                    className={`
                      flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
                      transition-colors
                      ${
                        cost.is_paid
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-gray-300 dark:border-gray-600 hover:border-green-500"
                      }
                    `}
                    title={
                      cost.is_paid
                        ? t("costs.mark_unpaid")
                        : t("costs.mark_paid")
                    }
                  >
                    {cost.is_paid && <Check className="w-3 h-3" />}
                  </button>

                  <div className="flex items-center justify-between">
                    <span
                      className={`font-medium ${
                        cost.is_paid
                          ? "text-gray-500 line-through"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {getCostName(cost)}
                    </span>
                    {paidTo && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        →{" "}
                        {t(`costs.paid_to.${paidTo}`, { defaultValue: paidTo })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Amounts */}
                <div className="flex items-center justify-between gap-4">
                  {/* Estimated */}
                  <div>
                    <div className="flex items-center justify-between text-right">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {t("costs.est")}
                      </div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {formatPrice(cost.estimated_amount)}
                      </div>
                    </div>

                    {/* Actual - editable */}
                    <div className="flex items-center justify-between text-right">
                      <div className="text-xs text-gray-500 dark:text-gray-400 pr-2">
                        {t("costs.actual")}
                      </div>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleUpdateActual(cost.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateActual(cost.id);
                            if (e.key === "Escape") {
                              setEditingCost(null);
                              setEditValue("");
                            }
                          }}
                          className="w-full px-2 py-1 text-sm border border-blue-500 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-right"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => {
                            setEditingCost(cost.id);
                            setEditValue(cost.actual_amount?.toString() || "");
                          }}
                          className="text-sm font-medium text-green-600 dark:text-green-400 hover:underline"
                        >
                          {cost.actual_amount
                            ? formatPrice(cost.actual_amount)
                            : t("costs.enter_actual")}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expand toggle */}
                  <button
                    onClick={() => toggleExpanded(cost.id)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-3 ml-8 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm">
                  {cost.paid_date && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                      <Receipt className="w-4 h-4" />
                      {t("costs.paid_on")}: {cost.paid_date}
                    </div>
                  )}
                  {cost.payment_method && (
                    <div className="text-gray-600 dark:text-gray-400">
                      {t("costs.payment_method")}: {cost.payment_method}
                    </div>
                  )}
                  {cost.notes && (
                    <div className="text-gray-600 dark:text-gray-400 mt-2">
                      {cost.notes}
                    </div>
                  )}
                  {!cost.paid_date && !cost.notes && (
                    <div className="text-gray-500 dark:text-gray-400 italic">
                      {t("costs.no_details")}
                    </div>
                  )}

                  {onDeleteCost && (
                    <div className="mt-3">
                      <button
                        onClick={async () => {
                          const ok = confirm(t('costs.confirm_delete', 'Delete this cost?'));
                          if (!ok) return;
                          await onDeleteCost(cost.id);
                        }}
                        className="text-sm text-red-600 hover:underline"
                      >
                        {t('costs.delete', 'Delete')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {costs.length === 0 && (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {t("costs.empty")}
          </div>
        )}
        </div>
      )}

      {/* Add custom cost */}
      {onAddCost && !disabled && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          {showAddForm ? (
            <div className="space-y-2">
              <input
                type="text"
                value={newCostName}
                onChange={(e) => setNewCostName(e.target.value)}
                placeholder={t("costs.add_name_placeholder")}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                autoFocus
              />
              <div className="flex flex-col sm:flex-row gap-2 items-center">
                <input
                  type="number"
                  value={newCostAmount}
                  onChange={(e) => setNewCostAmount(e.target.value)}
                  placeholder={t("costs.add_amount_placeholder")}
                  className="flex-1 w-full sm:w-1/2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />

                <input
                  type="text"
                  value={newCostPaidTo}
                  onChange={(e) => setNewCostPaidTo(e.target.value)}
                  placeholder={t("costs.paid_to.select", "Paid to...")}
                  className="w-full sm:w-1/2 min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 mt-2">
                {/** Only enable when all three fields are present and the amount is numeric */}
                <button
                  onClick={handleAddCost}
                  disabled={!(newCostName.trim() && newCostPaidTo.trim() && newCostAmount.trim() && !isNaN(Number(newCostAmount)))}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {t("costs.add_button")}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewCostName("");
                    setNewCostAmount("");
                    setNewCostPaidTo("");
                  }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 dark:text-gray-400"
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700"
            >
              <Plus className="w-4 h-4" />
              {t("costs.add_custom")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default StageCosts;
