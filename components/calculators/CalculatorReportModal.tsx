"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "next-i18next";
import { useRouter } from "next/router";
import {
  X,
  Loader2,
  CheckCircle2,
  Mail,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CalculatorType = "roi" | "closing-cost" | "ownership-cost" | "seller-cost";

interface CalculatorReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculatorType: CalculatorType;
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
  /** Optional: Summary items to show in the preview */
  summaryItems?: Array<{ label: string; value: string }>;
}

export function CalculatorReportModal({
  isOpen,
  onClose,
  calculatorType,
  inputs,
  results,
  summaryItems = [],
}: CalculatorReportModalProps) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Only render portal on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError(
        t("report.error_email_required", "Please enter your email address")
      );
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(
        t("report.error_email_invalid", "Please enter a valid email address")
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/send-calculator-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          calculatorType,
          inputs,
          results,
          locale: router.locale || "en",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send report");
      }

      setIsSuccess(true);

      // Auto-close after success
      setTimeout(() => {
        onClose();
        // Reset state for next time
        setTimeout(() => {
          setIsSuccess(false);
          setEmail("");
        }, 300);
      }, 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              "report.error_generic",
              "Failed to send report. Please try again."
            )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
    // Reset state
    setTimeout(() => {
      setIsSuccess(false);
      setError(null);
      setEmail("");
    }, 300);
  };

  const getCalculatorTitle = () => {
    const titles: Record<CalculatorType, string> = {
      roi: t("calculators.roi.page_title", "Investment ROI Calculator"),
      "closing-cost": t(
        "calculators.closing_cost.page_title",
        "Closing Cost Calculator"
      ),
      "ownership-cost": t(
        "calculators.ownership_cost.page_title",
        "Ownership Cost Calculator"
      ),
      "seller-cost": t(
        "calculators.seller_cost.page_title",
        "Seller Cost Calculator"
      ),
    };
    return titles[calculatorType];
  };

  // Don't render anything until mounted on client
  if (!mounted) return null;

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Success State */}
          {isSuccess ? (
            <div className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t("report.success_title", "Report Sent!")}
              </h3>
              <p className="text-gray-600">
                {t(
                  "report.success_message",
                  "Check your inbox for your personalized report."
                )}
              </p>
              <p className="text-sm text-gray-500 mt-2">{email}</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {t("report.modal_title", "Get Your Report")}
                    </h3>
                    <p className="text-blue-100 text-sm">
                      {getCalculatorTitle()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-gray-600 text-sm mb-4">
                  {t(
                    "report.modal_description",
                    "Enter your email to receive a professional PDF report with all your calculation results."
                  )}
                </p>

                {/* Preview Summary */}
                {summaryItems.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                      {t("report.report_includes", "Your report includes")}
                    </p>
                    <div className="space-y-2">
                      {summaryItems.slice(0, 4).map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-gray-600">{item.label}</span>
                          <span className="font-medium text-gray-900">
                            {item.value}
                          </span>
                        </div>
                      ))}
                      {summaryItems.length > 4 && (
                        <p className="text-xs text-gray-500">
                          {t("report.and_more", "...and more details")}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="report-email"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        {t("report.email_label", "Email Address")}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-4 w-4 text-gray-400" />
                        </div>
                        <Input
                          id="report-email"
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setError(null);
                          }}
                          placeholder={t(
                            "report.email_placeholder",
                            "your@email.com"
                          )}
                          className="pl-10"
                          disabled={isSubmitting}
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t("report.sending", "Sending...")}
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          {t("report.send_report", "Send Report to Email")}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Use portal to render at document body level
  return createPortal(modalContent, document.body);
}

export default CalculatorReportModal;
