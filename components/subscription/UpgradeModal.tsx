"use client";

import { useState } from "react";
import { useTranslation } from "next-i18next";
import { X, Check, Zap, Crown, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useSubscription,
  formatPrice,
  getYearlyDiscount,
  type PlanType,
  type Currency,
} from "@/lib/subscription";
import { SUBSCRIPTION_PRICES } from "@/lib/stripe";
import { useAuth } from "@/lib/auth";

interface PricingCardProps {
  plan: PlanType;
  currency: Currency;
  isPopular?: boolean;
  onSelect: (plan: PlanType) => void;
  loadingPlan: PlanType | null;
  currentPlan?: string;
  isExpired?: boolean;
}

function PricingCard({
  plan,
  currency,
  isPopular,
  onSelect,
  loadingPlan,
  currentPlan,
  isExpired,
}: PricingCardProps) {
  const { t } = useTranslation("common");
  const priceConfig = SUBSCRIPTION_PRICES[currency][plan];
  const price = formatPrice(priceConfig.amount, currency);

  // Allow repurchasing same tier if subscription is expired
  const isCurrentPlan = currentPlan === plan && !isExpired;
  const isLoading = loadingPlan === plan;
  const isDisabled = loadingPlan !== null || isCurrentPlan;

  const planConfig = {
    monthly: {
      icon: Zap,
      title: t("subscription.monthly_title", "Monthly"),
      period: t("subscription.per_month", "/month"),
      badge: null as string | null,
      features: [
        t(
          "subscription.feature_neighborhood_data",
          "Full neighborhood-level data"
        ),
        t(
          "subscription.feature_price_trends",
          "Historical price trends & charts"
        ),
        t(
          "subscription.feature_rent_breakdown",
          "Detailed rent breakdowns by type"
        ),
        t("subscription.feature_unlimited", "Unlimited transactions"),
        t("subscription.feature_checklists", "Stage checklists & tracking"),
      ],
      color: "blue",
    },
    yearly: {
      icon: Star,
      title: t("subscription.yearly_title", "Yearly"),
      period: t("subscription.per_year", "/year"),
      badge: t("subscription.save_percent", "Save {{percent}}%", {
        percent: getYearlyDiscount(),
      }) as string | null,
      features: [
        t(
          "subscription.feature_neighborhood_data",
          "Full neighborhood-level data"
        ),
        t(
          "subscription.feature_price_trends",
          "Historical price trends & charts"
        ),
        t(
          "subscription.feature_rent_breakdown",
          "Detailed rent breakdowns by type"
        ),
        t("subscription.feature_unlimited", "Unlimited transactions"),
        t("subscription.feature_checklists", "Stage checklists & tracking"),
        t("subscription.feature_priority", "Priority email support"),
      ],
      color: "purple",
    },
    lifetime: {
      icon: Crown,
      title: t("subscription.lifetime_title", "Lifetime"),
      period: t("subscription.one_time", "one-time"),
      badge: t("subscription.best_value", "Best Value") as string | null,
      features: [
        t(
          "subscription.feature_neighborhood_data",
          "Full neighborhood-level data"
        ),
        t(
          "subscription.feature_price_trends",
          "Historical price trends & charts"
        ),
        t(
          "subscription.feature_rent_breakdown",
          "Detailed rent breakdowns by type"
        ),
        t("subscription.feature_unlimited", "Unlimited transactions"),
        t("subscription.feature_checklists", "Stage checklists & tracking"),
        t("subscription.feature_priority", "Priority email support"),
        t("subscription.feature_lifetime_updates", "Lifetime updates"),
        t("subscription.feature_early_access", "Early access to new features"),
      ],
      color: "amber",
    },
  };

  const config = planConfig[plan];
  const Icon = config.icon;

  const colorClasses = {
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: "bg-blue-100 text-blue-600",
      button: "bg-blue-600 hover:bg-blue-700",
      badge: "bg-blue-100 text-blue-700",
    },
    purple: {
      bg: "bg-purple-50",
      border: "border-purple-300",
      icon: "bg-purple-100 text-purple-600",
      button: "bg-purple-600 hover:bg-purple-700",
      badge: "bg-purple-100 text-purple-700",
    },
    amber: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: "bg-amber-100 text-amber-600",
      button: "bg-amber-600 hover:bg-amber-700",
      badge: "bg-amber-100 text-amber-700",
    },
  };

  const colors = colorClasses[config.color as keyof typeof colorClasses];

  return (
    <div
      className={`relative rounded-2xl border-2 p-6 transition-all ${
        isPopular
          ? `${colors.bg} ${colors.border} shadow-lg scale-105`
          : "bg-white border-gray-200 hover:border-gray-300"
      }`}
    >
      {isPopular && (
        <div
          className={`absolute -top-3 left-1/2 transform -translate-x-1/2 ${colors.badge} px-4 py-1 rounded-full text-sm font-semibold`}
        >
          {t("subscription.most_popular", "Most Popular")}
        </div>
      )}

      {config.badge && !isPopular && (
        <div
          className={`absolute -top-3 left-1/2 transform -translate-x-1/2 ${colors.badge} px-4 py-1 rounded-full text-sm font-semibold`}
        >
          {config.badge}
        </div>
      )}

      <div className="text-center mb-6">
        <div
          className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${colors.icon} mb-3`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">{config.title}</h3>
      </div>

      <div className="text-center mb-6">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold text-gray-900">{price}</span>
          <span className="text-gray-500">{config.period}</span>
        </div>
      </div>

      <ul className="space-y-3 mb-6">
        {config.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-gray-600 text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        onClick={() => onSelect(plan)}
        disabled={isDisabled}
        className={`w-full ${colors.button} text-white`}
      >
        {isCurrentPlan
          ? t("subscription.current_plan", "Current Plan")
          : isLoading
          ? t("subscription.processing", "Processing...")
          : t("subscription.select_plan", "Select Plan")}
      </Button>
    </div>
  );
}

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: "limit_reached" | "feature_locked" | "general";
}

export function UpgradeModal({
  isOpen,
  onClose,
  reason = "general",
}: UpgradeModalProps) {
  const { t } = useTranslation("common");
  const { session } = useAuth();
  const { subscription, checkout, openAuthModal } = useSubscription();
  const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null);
  const [currency, setCurrency] = useState<Currency>(
    subscription?.preferredCurrency || "MXN"
  );

  if (!isOpen) return null;

  const handleSelectPlan = async (plan: PlanType) => {
    // If user is not logged in, close upgrade modal and open auth modal
    if (!session) {
      onClose();
      openAuthModal();
      return;
    }

    setLoadingPlan(plan);
    try {
      await checkout(plan, currency);
    } catch (error) {
      console.error("Checkout error:", error);
      setLoadingPlan(null);
    }
  };

  const reasonMessages = {
    limit_reached: t(
      "subscription.limit_reached_message",
      "Upgrade to track unlimited transactions. Unlock premium data and get the most out of our platform."
    ),
    feature_locked: t(
      "subscription.feature_locked_message",
      "This feature requires a paid subscription. Upgrade to unlock all features."
    ),
    general: t(
      "subscription.upgrade_message",
      "Upgrade your plan to unlock unlimited transactions and premium features."
    ),
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-4xl my-8 text-left align-middle transition-all transform bg-white shadow-2xl rounded-2xl relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors z-10"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Header */}
          <div className="px-8 pt-8 pb-4 text-center border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t("subscription.upgrade_title", "Upgrade Your Plan")}
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              {reasonMessages[reason]}
            </p>
          </div>

          {/* Currency selector */}
          <div className="flex justify-center gap-2 pt-6 px-8">
            <button
              onClick={() => setCurrency("MXN")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currency === "MXN"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              🇲🇽 MXN
            </button>
            <button
              onClick={() => setCurrency("USD")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currency === "USD"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              🇺🇸 USD
            </button>
          </div>

          {/* Pricing cards */}
          <div className="p-8">
            <div className="grid md:grid-cols-3 gap-6">
              <PricingCard
                plan="monthly"
                currency={currency}
                onSelect={handleSelectPlan}
                loadingPlan={loadingPlan}
                currentPlan={subscription?.tier}
                isExpired={subscription?.isExpired}
              />
              <PricingCard
                plan="yearly"
                currency={currency}
                isPopular
                onSelect={handleSelectPlan}
                loadingPlan={loadingPlan}
                currentPlan={subscription?.tier}
                isExpired={subscription?.isExpired}
              />
              <PricingCard
                plan="lifetime"
                currency={currency}
                onSelect={handleSelectPlan}
                loadingPlan={loadingPlan}
                currentPlan={subscription?.tier}
                isExpired={subscription?.isExpired}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 pb-8 text-center">
            <p className="text-sm text-gray-500">
              {t(
                "subscription.secure_payment",
                "Secure payment powered by Stripe. Cancel anytime."
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Convenience component that uses the subscription context
export function UpgradeModalWithContext() {
  const { isUpgradeModalOpen, closeUpgradeModal } = useSubscription();
  return (
    <UpgradeModal
      isOpen={isUpgradeModalOpen}
      onClose={closeUpgradeModal}
      reason="limit_reached"
    />
  );
}
