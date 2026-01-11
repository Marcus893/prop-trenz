"use client";

import React from "react";
import { Lock, TrendingUp, BarChart3 } from "lucide-react";
import { useTranslation } from "next-i18next";

interface LockedDataPlaceholderProps {
  variant: "rent-breakdown" | "price-chart";
  onUpgrade: () => void;
  className?: string;
}

export function LockedDataPlaceholder({
  variant,
  onUpgrade,
  className = "",
}: LockedDataPlaceholderProps) {
  const { t } = useTranslation("common");

  if (variant === "rent-breakdown") {
    return (
      <div className={`${className}`}>
        <div
          style={{ fontSize: 13, color: "#111", marginBottom: 6 }}
        >
          {t("rent_map.averages_by_type", "Averages by type:")}
        </div>
        <div className="relative">
          {/* Blurred preview of data rows */}
          <div className="space-y-1 opacity-40 blur-[2px] select-none pointer-events-none">
            <div className="flex justify-between text-sm">
              <span>{t("rent_map.room", "Room")}</span>
              <span>$12,000 (5) 45m²</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t("rent_map.studio_apt", "Studio")}</span>
              <span>$15,000 (12) 35m²</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t("rent_map.apt_1br", "Apt (1BR)")}</span>
              <span>$22,000 (28) 55m²</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t("rent_map.apt_2br", "Apt (2BR)")}</span>
              <span>$32,000 (45) 85m²</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t("rent_map.apt_2plus_br", "Apt (2BR+)")}</span>
              <span>$48,000 (18) 120m²</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t("rent_map.house", "House")}</span>
              <span>$55,000 (8) 180m²</span>
            </div>
          </div>

          {/* Overlay with lock and CTA */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 rounded">
            <Lock className="h-5 w-5 text-gray-400 mb-2" />
            <p className="text-xs text-gray-600 text-center mb-2 px-2">
              {t("paywall.rent_breakdown_description", "See breakdown by bedroom type")}
            </p>
            <button
              onClick={onUpgrade}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1"
            >
              <BarChart3 className="h-3 w-3" />
              {t("paywall.unlock_details", "Unlock Details")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Price chart placeholder
  return (
    <div className={`p-6 ${className}`}>
      <div className="relative">
        {/* Blurred preview of chart */}
        <div className="opacity-40 blur-[3px] select-none pointer-events-none">
          <div className="h-48 bg-gradient-to-r from-blue-100 via-blue-200 to-blue-100 rounded-lg flex items-end justify-around px-4 pb-4">
            {[40, 55, 45, 60, 75, 65, 80, 90, 85, 95, 100, 110].map((height, i) => (
              <div
                key={i}
                className="bg-blue-500 rounded-t w-4"
                style={{ height: `${height * 0.4}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>2015</span>
            <span>2025</span>
          </div>
        </div>

        {/* Overlay with lock and CTA */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 rounded-lg">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {t("paywall.locked_title", "Premium Feature")}
          </h3>
          <p className="text-sm text-gray-600 text-center mb-4 max-w-xs">
            {t("paywall.price_chart_description", "Unlock historical price trends and detailed analytics for this neighborhood with a premium subscription.")}
          </p>
          <button
            onClick={onUpgrade}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Lock className="h-4 w-4" />
            {t("paywall.unlock_chart", "Unlock Price Trends")}
          </button>
        </div>
      </div>
    </div>
  );
}
