"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "next-i18next";
import { useRouter } from "next/router";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LeadFormProps {
  isOpen: boolean;
  onClose: () => void;
  source: string; // 'roi_calculator', 'map', etc.
  context?: {
    city?: string;
    municipality?: string;
    neighborhood?: string;
    propertyType?: string;
    budget?: string;
    [key: string]: any; // Allow additional context data
  };
  autoShow?: boolean;
}

// Normalize city name to match one of the three supported cities
function normalizeCity(city: string | undefined): string {
  if (!city) return "";
  const normalized = city.trim();
  // Map variations to standard names
  if (
    normalized.toLowerCase().includes("ciudad de méxico") ||
    normalized.toLowerCase().includes("cdmx") ||
    normalized.toLowerCase().includes("mexico") ||
    normalized.toLowerCase().includes("méxico")
  ) {
    return "Ciudad de México";
  }
  if (normalized.toLowerCase().includes("monterrey")) {
    return "Monterrey";
  }
  if (
    normalized.toLowerCase().includes("guadalajara") ||
    normalized.toLowerCase().includes("jalisco")
  ) {
    return "Guadalajara";
  }
  // If it doesn't match, return empty string (user must select)
  return "";
}

export function LeadForm({
  isOpen,
  onClose,
  source,
  context = {},
  autoShow = false,
}: LeadFormProps) {
  const router = useRouter();
  const { t, i18n } = useTranslation("common");

  // Force Spanish locale for location pages
  useEffect(() => {
    if (isOpen && source === "location_page") {
      // Change language immediately when modal opens
      if (i18n.language !== "es") {
        i18n.changeLanguage("es");
      }
    } else if (isOpen && source !== "location_page" && router.locale) {
      // Restore router locale for other sources
      if (i18n.language !== router.locale) {
        i18n.changeLanguage(router.locale);
      }
    }
  }, [isOpen, source, i18n, router.locale]);

  // Use Spanish translations directly for location pages
  const getTranslation = (key: string, defaultValue: string) => {
    if (source === "location_page") {
      // Spanish translations for location pages
      const esTranslations: Record<string, string> = {
        "leads.form_title": "Obtener Ayuda de un Experto",
        "leads.form_description":
          "Conéctate con un profesional inmobiliario verificado en tu área.",
        "leads.name_label": "Nombre",
        "leads.name_placeholder": "Tu nombre completo",
        "leads.email_label": "Correo electrónico",
        "leads.email_placeholder": "tu@email.com",
        "leads.phone_label": "Teléfono",
        "leads.phone_placeholder": "+52 55 1234 5678",
        "leads.location_interest_heading":
          "¿En qué ubicación estás interesado?",
        "leads.city_label": "Ciudad",
        "leads.city_placeholder": "Selecciona ciudad",
        "leads.municipality_label": "Municipio",
        "leads.budget_label": "Rango de Presupuesto",
        "leads.budget_placeholder": "Selecciona el rango de presupuesto",
        "leads.budget_under_2m": "Menos de $2M MXN",
        "leads.budget_2m_5m": "$2M - $5M MXN",
        "leads.budget_5m_10m": "$5M - $10M MXN",
        "leads.budget_10m_20m": "$10M - $20M MXN",
        "leads.budget_over_20m": "Más de $20M MXN",
        "leads.timeline_label": "Plazo de Decisión",
        "leads.timeline_placeholder": "¿Cuándo planeas comprar?",
        "leads.timeline_immediately": "Inmediatamente (0-1 meses)",
        "leads.timeline_1_3_months": "1-3 meses",
        "leads.timeline_3_6_months": "3-6 meses",
        "leads.timeline_6_12_months": "6-12 meses",
        "leads.timeline_exploring": "Solo explorando",
        "leads.submit_button": "Conectarse",
        "leads.submitting": "Enviando...",
        "leads.success_title": "¡Gracias!",
        "leads.success_message": "Te conectaremos con un experto local pronto.",
        "leads.consent_text":
          "Al enviar, aceptas ser contactado por nuestros profesionales inmobiliarios asociados.",
        "leads.phone_hint":
          "Formato: +52 (México), +1 (EE.UU./Canadá), o 10 dígitos",
      };
      return esTranslations[key] || defaultValue;
    }
    return t(key, defaultValue);
  };

  // Use getTranslation instead of t for all translations
  const t2 = getTranslation;
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    city: normalizeCity(context.city) || "",
    municipality: context.municipality || "",
    neighborhood: context.neighborhood || "",
    budgetRange: "",
    timeline: "",
    propertyType: context.propertyType || "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);

  // Set mounted to true on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Phone number validation for Mexico, US, and Canada
  const validatePhone = (phone: string): { valid: boolean; error?: string } => {
    if (!phone || !phone.trim()) {
      return { valid: false, error: "Phone number is required" };
    }

    // Remove all non-digit characters except + at the start
    const cleaned = phone.replace(/[^\d+]/g, "");

    // Check if it starts with country code
    let digits = cleaned;
    if (cleaned.startsWith("+52")) {
      // Mexico: +52 followed by 10 digits
      digits = cleaned.substring(3);
      if (digits.length !== 10) {
        return {
          valid: false,
          error: "Mexican phone number must be 10 digits after +52",
        };
      }
    } else if (cleaned.startsWith("+1")) {
      // US/Canada: +1 followed by 10 digits
      digits = cleaned.substring(2);
      if (digits.length !== 10) {
        return {
          valid: false,
          error: "US/Canada phone number must be 10 digits after +1",
        };
      }
    } else if (cleaned.startsWith("52")) {
      // Mexico without +: 52 followed by 10 digits
      digits = cleaned.substring(2);
      if (digits.length !== 10) {
        return {
          valid: false,
          error: "Mexican phone number must be 10 digits after country code",
        };
      }
    } else if (cleaned.startsWith("1") && cleaned.length === 11) {
      // US/Canada without +: 1 followed by 10 digits
      digits = cleaned.substring(1);
    } else {
      // No country code - assume it's a local number, should be 10 digits
      digits = cleaned.replace(/\+/g, "");
      if (digits.length === 10) {
        // Valid 10-digit number (could be any of the three countries)
        return { valid: true };
      } else if (digits.length > 10) {
        return {
          valid: false,
          error:
            "Phone number is too long. Please include country code (+52, +1) or use 10 digits",
        };
      } else {
        return {
          valid: false,
          error:
            "Phone number must be 10 digits (or include country code: +52 for Mexico, +1 for US/Canada)",
        };
      }
    }

    // Validate digit count
    if (digits.length === 10 && /^\d+$/.test(digits)) {
      return { valid: true };
    }

    return { valid: false, error: "Invalid phone number format" };
  };

  // Reset form when modal opens/closes and prevent body scroll
  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        city: normalizeCity(context.city) || prev.city,
        municipality: context.municipality || prev.municipality,
        neighborhood: context.neighborhood || prev.neighborhood,
        propertyType: context.propertyType || prev.propertyType,
      }));
      setSuccess(false);
      setError("");
      setTouched({}); // Reset touched state when modal opens

      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    } else {
      // Restore body scroll when modal is closed
      document.body.style.overflow = "";
    }

    return () => {
      // Cleanup: restore scroll on unmount
      document.body.style.overflow = "";
    };
  }, [isOpen, context]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Mark all fields as touched when form is submitted
    setTouched({
      name: true,
      email: true,
      phone: true,
      city: true,
      municipality: true,
      budgetRange: true,
      timeline: true,
    });

    // Validate phone number
    const phoneValidation = validatePhone(formData.phone);
    if (!phoneValidation.valid) {
      setFieldErrors((prev) => ({
        ...prev,
        phone: phoneValidation.error || "",
      }));
      setTouched((prev) => ({ ...prev, phone: true }));
      setError("Please fix the errors in the form");
      return;
    }

    // Validate all required fields
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim() ||
      !formData.city.trim() ||
      !formData.municipality.trim() ||
      !formData.budgetRange ||
      !formData.timeline
    ) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          source,
          contextData: context,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit lead");
      }

      setSuccess(true);
      // Reset form after success
      setTimeout(() => {
        setFormData({
          name: "",
          email: "",
          phone: "",
          city: normalizeCity(context.city) || "",
          municipality: context.municipality || "",
          neighborhood: context.neighborhood || "",
          budgetRange: "",
          timeline: "",
          propertyType: context.propertyType || "",
        });
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Use portal to render modal at document.body level, bypassing parent CSS constraints
  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(to bottom right, rgba(0,0,0,0.6), rgba(30,58,138,0.4), rgba(67,56,202,0.6))",
        backdropFilter: "blur(4px)",
        padding: "16px",
        boxSizing: "border-box",
      }}
      onClick={onClose}
    >
      <div
        className={`relative w-full mx-auto ${
          autoShow
            ? "max-w-[95vw] sm:max-w-sm md:max-w-2xl lg:max-w-4xl"
            : "max-w-[90vw] sm:max-w-sm"
        } rounded-xl bg-gradient-to-br from-white via-blue-50 to-indigo-50 shadow-2xl border border-blue-100 max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out ${
          isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-2 top-2 sm:right-3 sm:top-3 md:right-4 md:top-4 text-gray-400 hover:text-gray-600 transition-colors p-1"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div
          className={`p-3 sm:p-4 md:p-6 pb-3 sm:pb-4 md:pb-6 ${
            autoShow
              ? "grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:gap-8"
              : ""
          }`}
        >
          {success ? (
            <div
              className={`text-center py-8 ${autoShow ? "lg:col-span-2" : ""}`}
            >
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t2("leads.success_title", "Thank you!")}
              </h3>
              <p className="text-gray-600">
                {t2(
                  "leads.success_message",
                  "We'll connect you with a local expert soon."
                )}
              </p>
            </div>
          ) : (
            <>
              {/* Form Section */}
              <div
                className={
                  autoShow
                    ? "bg-white p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl border border-gray-200 shadow-sm"
                    : ""
                }
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {t2("leads.form_title", "Get Expert Help")}
                </h2>
                <p className="text-gray-600 mb-6">
                  {t2(
                    "leads.form_description",
                    "Connect with a vetted real estate professional in your area."
                  )}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {t2("leads.name_label", "Name")} *
                    </label>
                    <Input
                      id="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder={t2(
                        "leads.name_placeholder",
                        "Your full name"
                      )}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {t2("leads.email_label", "Email")} *
                    </label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder={t2(
                        "leads.email_placeholder",
                        "your@email.com"
                      )}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {t2("leads.phone_label", "Phone")} *
                    </label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({ ...formData, phone: value });
                        // Validate on change if field has been touched
                        if (touched.phone) {
                          const validation = validatePhone(value);
                          if (!validation.valid) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              phone: validation.error || "",
                            }));
                          } else {
                            setFieldErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors.phone;
                              return newErrors;
                            });
                          }
                        }
                      }}
                      onBlur={() => {
                        setTouched((prev) => ({ ...prev, phone: true }));
                        const validation = validatePhone(formData.phone);
                        if (!validation.valid) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            phone: validation.error || "",
                          }));
                        } else {
                          setFieldErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.phone;
                            return newErrors;
                          });
                        }
                      }}
                      className={fieldErrors.phone ? "border-red-300" : ""}
                      placeholder={t2(
                        "leads.phone_placeholder",
                        "+52 55 1234 5678"
                      )}
                    />
                    {fieldErrors.phone && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.phone}
                      </p>
                    )}
                    {!fieldErrors.phone && touched.phone && formData.phone && (
                      <p className="mt-1 text-xs text-gray-500">
                        {t2(
                          "leads.phone_hint",
                          "Format: +52 (Mexico), +1 (US/Canada), or 10 digits"
                        )}
                      </p>
                    )}
                  </div>

                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">
                      {t2(
                        "leads.location_interest_heading",
                        "Which location are you interested in?"
                      )}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="city"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          {t2("leads.city_label", "City")} *
                        </label>
                        <Select
                          value={formData.city}
                          onValueChange={(value) =>
                            setFormData({ ...formData, city: value })
                          }
                        >
                          <SelectTrigger
                            id="city"
                            className={
                              touched.city && !formData.city
                                ? "border-red-300"
                                : ""
                            }
                            onClick={() =>
                              setTouched((prev) => ({ ...prev, city: true }))
                            }
                          >
                            <SelectValue
                              placeholder={t2(
                                "leads.city_placeholder",
                                "Select city"
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Ciudad de México">
                              Ciudad de México
                            </SelectItem>
                            <SelectItem value="Monterrey">Monterrey</SelectItem>
                            <SelectItem value="Guadalajara">
                              Guadalajara
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {touched.city && !formData.city && (
                          <p className="mt-1 text-sm text-red-600">
                            City is required
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="municipality"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          {t2("leads.municipality_label", "Municipality")} *
                        </label>
                        <Input
                          id="municipality"
                          type="text"
                          required
                          value={formData.municipality}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              municipality: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="budgetRange"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {t2("leads.budget_label", "Budget Range")} *
                    </label>
                    <Select
                      value={formData.budgetRange}
                      onValueChange={(value) =>
                        setFormData({ ...formData, budgetRange: value })
                      }
                    >
                      <SelectTrigger
                        className={
                          touched.budgetRange && !formData.budgetRange
                            ? "border-red-300"
                            : ""
                        }
                        onClick={() =>
                          setTouched((prev) => ({ ...prev, budgetRange: true }))
                        }
                      >
                        <SelectValue
                          placeholder={t2(
                            "leads.budget_placeholder",
                            "Select budget range"
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under-2m">
                          {t2("leads.budget_under_2m", "Under $2M MXN")}
                        </SelectItem>
                        <SelectItem value="2m-5m">
                          {t2("leads.budget_2m_5m", "$2M - $5M MXN")}
                        </SelectItem>
                        <SelectItem value="5m-10m">
                          {t2("leads.budget_5m_10m", "$5M - $10M MXN")}
                        </SelectItem>
                        <SelectItem value="10m-20m">
                          {t2("leads.budget_10m_20m", "$10M - $20M MXN")}
                        </SelectItem>
                        <SelectItem value="over-20m">
                          {t2("leads.budget_over_20m", "Over $20M MXN")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label
                      htmlFor="timeline"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {t2("leads.timeline_label", "Decision Timeline")} *
                    </label>
                    <Select
                      value={formData.timeline}
                      onValueChange={(value) =>
                        setFormData({ ...formData, timeline: value })
                      }
                    >
                      <SelectTrigger
                        className={
                          touched.timeline && !formData.timeline
                            ? "border-red-300"
                            : ""
                        }
                        onClick={() =>
                          setTouched((prev) => ({ ...prev, timeline: true }))
                        }
                      >
                        <SelectValue
                          placeholder={t2(
                            "leads.timeline_placeholder",
                            "When are you planning to buy?"
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediately">
                          {t2(
                            "leads.timeline_immediately",
                            "Immediately (0-1 months)"
                          )}
                        </SelectItem>
                        <SelectItem value="1-3-months">
                          {t2("leads.timeline_1_3_months", "1-3 months")}
                        </SelectItem>
                        <SelectItem value="3-6-months">
                          {t2("leads.timeline_3_6_months", "3-6 months")}
                        </SelectItem>
                        <SelectItem value="6-12-months">
                          {t2("leads.timeline_6_12_months", "6-12 months")}
                        </SelectItem>
                        <SelectItem value="exploring">
                          {t2("leads.timeline_exploring", "Just exploring")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {error && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                      {error}
                    </div>
                  )}

                  <div className="pt-4">
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t2("leads.submitting", "Submitting...")}
                        </>
                      ) : (
                        t2("leads.submit_button", "Get Connected")
                      )}
                    </Button>
                  </div>

                  <p className="text-xs text-gray-500 text-center">
                    {t2(
                      "leads.consent_text",
                      "By submitting, you agree to be contacted by our partner real estate professionals."
                    )}
                  </p>
                </form>
              </div>

              {/* Trust Reasons Section - only show when autoShow */}
              {autoShow && (
                <div className="space-y-3 sm:space-y-4 md:space-y-6 bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl border border-blue-200">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                      <span className="text-blue-600">✨</span>
                      {t2("leads.trust_section_title", "Why Choose PropTrenz?")}
                    </h3>
                    <div className="space-y-2 sm:space-y-3 md:space-y-4">
                      <div className="flex items-start gap-3 p-3 bg-white/70 rounded-lg border border-blue-100">
                        <div className="w-3 h-3 bg-blue-600 rounded-full mt-1.5 flex-shrink-0 shadow-sm"></div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm">
                            🏆 {t2("leads.trust_vetted_title", "Vetted Professionals")}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {t2("leads.trust_vetted_desc", "All our partners are licensed and verified real estate experts with proven track records.")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-white/70 rounded-lg border border-blue-100">
                        <div className="w-3 h-3 bg-blue-600 rounded-full mt-1.5 flex-shrink-0 shadow-sm"></div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm">
                            🗺️ {t2("leads.trust_local_title", "Local Market Expertise")}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {t2("leads.trust_local_desc", "Deep knowledge of Mexican real estate markets, regulations, and local insights you won't find elsewhere.")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-white/70 rounded-lg border border-blue-100">
                        <div className="w-3 h-3 bg-blue-600 rounded-full mt-1.5 flex-shrink-0 shadow-sm"></div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm">
                            📊 {t2("leads.trust_data_title", "Data-Driven Insights")}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {t2("leads.trust_data_desc", "Access to comprehensive market data, analytics, and pricing intelligence for making informed decisions.")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-white/70 rounded-lg border border-blue-100">
                        <div className="w-3 h-3 bg-blue-600 rounded-full mt-1.5 flex-shrink-0 shadow-sm"></div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm">
                            🤝 {t2("leads.trust_support_title", "End-to-End Support")}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {t2("leads.trust_support_desc", "From property search to closing, we're with you every step of the way with personalized guidance.")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 sm:p-3 md:p-4 rounded-lg text-white">
                    <p className="text-sm font-medium text-center">
                      🚀 {t2("leads.trust_social_proof", "Thousands have already used PropTrenz to find their perfect rental/home/investment. Join them today!")}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
