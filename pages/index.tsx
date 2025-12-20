import React, { useState, useEffect } from "react";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogoSVG } from "@/components/ui/Logo";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { AuthForm } from "@/components/auth/AuthForm";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useTranslation } from "next-i18next";
import { useRouter } from "next/router";
import {
  TrendingUp,
  MapPin,
  BarChart3,
  Calculator,
  ArrowRight,
  Sparkles,
  Database,
  RefreshCw,
  Eye,
  BookOpen,
  CheckCircle2,
  Play,
  Layers,
  Globe,
} from "lucide-react";
import { GetStaticProps } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTracking } from "@/lib/useTracking";
import Link from "next/link";

export default function HomePage() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { track } = useTracking();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");

  // Check for signup modal trigger (localStorage or hash)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkSignup = () => {
      if (window.location.hash === "#signup") {
        setShowAuth(true);
        setAuthMode("signup");
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search
        );
        return true;
      }

      const showSignup = localStorage.getItem("showSignupModal");
      if (showSignup === "true") {
        setShowAuth(true);
        setAuthMode("signup");
        localStorage.removeItem("showSignupModal");
        return true;
      }

      return false;
    };

    checkSignup();

    const handleRouteChangeComplete = () => {
      setTimeout(() => checkSignup(), 100);
    };

    router.events.on("routeChangeComplete", handleRouteChangeComplete);

    const handleHashChange = () => {
      checkSignup();
    };
    window.addEventListener("hashchange", handleHashChange);

    const interval = setInterval(() => {
      if (!showAuth) {
        checkSignup();
      }
    }, 200);

    return () => {
      router.events.off("routeChangeComplete", handleRouteChangeComplete);
      window.removeEventListener("hashchange", handleHashChange);
      clearInterval(interval);
    };
  }, [router, showAuth]);

  const handleExploreCharts = () => {
    track("home_explore_charts_clicked");
    router.push("/charts");
  };

  const handleExploreCalculators = () => {
    track("home_explore_calculators_clicked");
    router.push("/calculators");
  };

  const handleGetStarted = () => {
    track("signup_button_clicked", { source: "homepage" });
    setShowAuth(true);
    setAuthMode("signup");
  };

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://proptrenz.com";
  let currentPath = router.asPath.split("?")[0];

  if (currentPath.startsWith("/es/") || currentPath.startsWith("/zh/")) {
    currentPath = currentPath.replace(/^\/es\/|\/zh\//, "/");
  }
  if (currentPath === "/es" || currentPath === "/zh") {
    currentPath = "/";
  }

  const hreflangUrls = {
    en: `${baseUrl}${currentPath}`,
    es: `${baseUrl}/es${currentPath}`,
    zh: `${baseUrl}/zh${currentPath}`,
  };

  // Stats data
  const stats = {
    dataPoints: 10000, // Approximate: 7,441+ in CDMX alone, plus Monterrey, Jalisco
    neighborhoods: 500, // Approximate across all cities
    locations: 70, // Generated location pages
    guides: 10, // Number of guides
    cities: 3, // CDMX, Monterrey, Jalisco
    municipalities: 24, // 15 + 5 + 4
    monthsOfData: 5, // Based on scraping history
    yearsOfHistory: 20, // SHF data history
  };

  return (
    <>
      <Head>
        <title>
          PropTrenz | Track Real Estate Prices & Market Data in Mexico - Make Smarter Decisions
        </title>
        <meta
          name="description"
          content="Track real estate prices across Mexico with PropTrenz. Explore interactive price maps, market insights, neighborhood trends, and data-driven analytics to make smarter property decisions."
        />
        <link rel="canonical" href={baseUrl} />
        <link rel="alternate" hrefLang="en" href={hreflangUrls.en} />
        <link rel="alternate" hrefLang="es" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="zh" href={hreflangUrls.zh} />
        <link rel="alternate" hrefLang="x-default" href={hreflangUrls.en} />
        <link rel="alternate" hrefLang="es-MX" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-AR" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-CO" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-CL" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-PE" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-EC" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-VE" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-GT" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-CU" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-BO" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-DO" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-HN" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-PY" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-SV" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-NI" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-CR" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-PA" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-UY" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-PR" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="en-US" href={hreflangUrls.en} />
        <link rel="alternate" hrefLang="en-GB" href={hreflangUrls.en} />
        <link rel="alternate" hrefLang="en-CA" href={hreflangUrls.en} />
        <link rel="alternate" hrefLang="en-AU" href={hreflangUrls.en} />
        <link rel="alternate" hrefLang="en-NZ" href={hreflangUrls.en} />
        <link rel="alternate" hrefLang="en-IE" href={hreflangUrls.en} />
        <link rel="alternate" hrefLang="en-ZA" href={hreflangUrls.en} />
        <link rel="alternate" hrefLang="zh-CN" href={hreflangUrls.zh} />
        <link rel="alternate" hrefLang="zh-TW" href={hreflangUrls.zh} />
        <link rel="alternate" hrefLang="zh-HK" href={hreflangUrls.zh} />
      </Head>
      <Layout hideHeader>
        <div className="space-y-0 relative -my-6 lg:-mr-8 lg:ml-0 lg:pr-8">
          {/* Hero Section */}
          <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-20 right-20 w-96 h-96 bg-blue-500 opacity-20 rounded-full blur-3xl animate-pulse"></div>
              <div
                className="absolute bottom-20 left-20 w-96 h-96 bg-indigo-500 opacity-20 rounded-full blur-3xl animate-pulse"
                style={{ animationDelay: "1s" }}
              ></div>
            </div>

            {/* Top Bar - Logo and Language Selector */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg:pr-8 pt-6 md:pt-8 lg:pt-12">
              <div className="flex items-center justify-between">
                {/* Left spacer */}
                <div className="flex-1"></div>
                {/* Logo - Centered */}
                <div className="flex items-center justify-center flex-1 animate-fade-in">
                  <LogoSVG
                    showText={true}
                    size="lg"
                    className="text-white"
                    style={{ height: "90px", width: "auto" }}
                  />
                </div>
                {/* Language Selector - Right */}
                <div className="flex-1 flex justify-end relative z-[102]">
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-1">
                    <LanguageSwitcher />
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg:pr-8 py-8 md:py-8 lg:py-8">
              <div className="text-center">
                {/* Main Headline */}
                <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 leading-tight animate-slide-up">
                  {t(
                    "home.hero_title",
                    "The Most Complete Mexican Real Estate Intelligence Platform"
                  )}
                </h1>

                {/* Subheadline */}
                <p className="text-xl md:text-2xl lg:text-3xl text-blue-100 mb-4 max-w-3xl mx-auto animate-slide-up delay-100">
                  {t(
                    "home.hero_subtitle",
                    "Track prices across 500+ neighborhoods, visualize trends and make smarter decisions."
                  )}
                </p>

                {/* Primary CTA */}
                <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12 animate-slide-up delay-200">
                  <Button
                    onClick={handleGetStarted}
                    size="lg"
                    className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg md:text-xl font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 rounded-full flex items-center"
                  >
                    {t("home.get_started_free", "Get Started Free")}
                    <ArrowRight className="ml-2 h-6 w-6" />
                  </Button>
                  <Button
                    onClick={() => router.push("/map")}
                    size="lg"
                    variant="ghost"
                    className="bg-transparent border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-lg md:text-xl font-semibold rounded-full flex items-center"
                  >
                    <MapPin className="mr-2 h-6 w-6" />
                    {t("home.explore_map", "Explore Map")}
                  </Button>
                </div>

                {/* Trust Indicators */}
                <div className="flex flex-wrap justify-center gap-6 md:gap-8 text-sm md:text-base animate-slide-up delay-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-300" />
                    <span>{t("home.official_data", "Official Data")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-300" />
                    <span>{t("home.easy_to_use", "Easy to Use")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-300" />
                    <span>{t("home.completely_free", "Completely Free")}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Impressive Stats Section */}
          <section className="bg-white py-16 md:py-16 border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg:pr-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  {t(
                    "home.stats_title",
                    "Real Data. Real Insights. Real Results."
                  )}
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  {t(
                    "home.stats_subtitle",
                    "We track more neighborhoods, update more frequently, and provide deeper insights than any other platform."
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-3">
                <div className="text-center p-3 md:p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200 hover:shadow-lg transition-all min-w-0">
                  <Database className="h-8 w-8 md:h-12 md:w-12 text-blue-600 mx-auto mb-2 md:mb-4 stroke-2 flex-shrink-0" />
                  <div className="text-xl md:text-3xl lg:text-4xl font-bold text-blue-600 mb-1 md:mb-2 whitespace-nowrap">
                    <AnimatedCounter
                      value={stats.dataPoints}
                      suffix="+"
                      decimals={0}
                    />
                  </div>
                  <div className="text-[10px] md:text-sm text-gray-700 font-medium whitespace-nowrap">
                    {t("home.data_points", "Data Points")}
                  </div>
                </div>

                <div className="text-center p-3 md:p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border-2 border-green-200 hover:shadow-lg transition-all min-w-0">
                  <MapPin className="h-8 w-8 md:h-12 md:w-12 text-green-600 mx-auto mb-2 md:mb-4 stroke-2 flex-shrink-0" />
                  <div className="text-xl md:text-3xl lg:text-4xl font-bold text-green-600 mb-1 md:mb-2 whitespace-nowrap">
                    <AnimatedCounter
                      value={stats.neighborhoods}
                      suffix="+"
                      decimals={0}
                    />
                  </div>
                  <div className="text-[10px] md:text-sm text-gray-700 font-medium whitespace-nowrap">
                    {t("home.neighborhoods", "Neighborhoods")}
                  </div>
                </div>

                <div className="text-center p-3 md:p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border-2 border-purple-200 hover:shadow-lg transition-all min-w-0">
                  <RefreshCw className="h-8 w-8 md:h-12 md:w-12 text-purple-600 mx-auto mb-2 md:mb-4 stroke-2 flex-shrink-0" />
                  <div className="text-xl md:text-3xl lg:text-4xl font-bold text-purple-600 mb-1 md:mb-2 whitespace-nowrap">
                    {t("home.monthly", "Monthly")}
                  </div>
                  <div className="text-[10px] md:text-sm text-gray-700 font-medium whitespace-nowrap">
                    {t("home.updates", "New Data")}
                  </div>
                </div>

                <div className="text-center p-3 md:p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl border-2 border-orange-200 hover:shadow-lg transition-all min-w-0">
                  <Layers className="h-8 w-8 md:h-12 md:w-12 text-orange-600 mx-auto mb-2 md:mb-4 stroke-2 flex-shrink-0" />
                  <div className="text-xl md:text-3xl lg:text-4xl font-bold text-orange-600 mb-1 md:mb-2 whitespace-nowrap">
                    <AnimatedCounter
                      value={stats.yearsOfHistory}
                      suffix="+"
                      decimals={0}
                    />
                  </div>
                  <div className="text-[10px] md:text-sm text-gray-700 font-medium whitespace-nowrap">
                    {t("home.years_history", "Years of Historic Data")}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Pain Points - Why PropTrenz */}
          <section className="bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 py-16 md:py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg:pr-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  {t(
                    "home.pain_points_title",
                    "Buying Property in Mexico Shouldn't Be This Hard"
                  )}
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  {t(
                    "home.pain_points_subtitle",
                    "We know the struggles. We've been there. That's why we built PropTrenz."
                  )}
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <Card className="p-8 bg-white border-2 border-red-200 hover:border-red-400 transition-all text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Eye className="h-8 w-8 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {t(
                      "home.pain_point_1_title",
                      "No Transparent Pricing Information"
                    )}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {t(
                      "home.pain_point_1_desc",
                      "Sellers quote different prices. No way to verify market rates. You're left guessing if you're getting a fair deal."
                    )}
                  </p>
                </Card>

                <Card className="p-8 bg-white border-2 border-orange-200 hover:border-orange-400 transition-all text-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="h-8 w-8 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {t("home.pain_point_2_title", "Nobody Educates You")}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {t(
                      "home.pain_point_2_desc",
                      "Complex laws, unfamiliar processes, language barriers. You're on your own trying to figure out everything."
                    )}
                  </p>
                </Card>

                <Card className="p-8 bg-white border-2 border-yellow-200 hover:border-yellow-400 transition-all text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Calculator className="h-8 w-8 text-yellow-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {t("home.pain_point_3_title", "Hidden Costs Everywhere")}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {t(
                      "home.pain_point_3_desc",
                      "Closing costs, notary fees, taxes. The total price is much higher than the sell price. Nobody tells you until it's too late."
                    )}
                  </p>
                </Card>
              </div>
            </div>
          </section>

          {/* How It Works - Step by Step Onboarding */}
          <section className="bg-gradient-to-b from-gray-50 to-white py-16 md:py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg:pr-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  {t("home.how_it_works_title", "How PropTrenz Works")}
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  {t(
                    "home.how_it_works_subtitle",
                    "Three simple steps to unlock powerful real estate insights"
                  )}
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 md:gap-12">
                {/* Step 1 */}
                <div className="relative">
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl z-10">
                    1
                  </div>
                  <Card className="p-8 h-full border-2 border-blue-200 hover:border-blue-400 hover:shadow-xl transition-all">
                    <div className="mb-6">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <MapPin className="h-8 w-8 text-blue-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {t("home.step1_title", "Explore Locations")}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {t(
                          "home.step1_desc",
                          "Browse our interactive map or search for any neighborhood, municipality, or city. See real-time price data and trends."
                        )}
                      </p>
                    </div>
                    <Button
                      onClick={() => router.push("/map")}
                      variant="ghost"
                      className="w-full border-2 border-blue-600 text-blue-600 hover:bg-blue-50 flex items-center justify-center"
                    >
                      {t("home.try_map", "Try the Map")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Card>
                </div>

                {/* Step 2 */}
                <div className="relative">
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xl z-10">
                    2
                  </div>
                  <Card className="p-8 h-full border-2 border-green-200 hover:border-green-400 hover:shadow-xl transition-all">
                    <div className="mb-6">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <BarChart3 className="h-8 w-8 text-green-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {t("home.step2_title", "Analyze Trends")}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {t(
                          "home.step2_desc",
                          "View interactive charts with QoQ and YoY growth metrics. Track price history over 20+ years. Compare locations side-by-side."
                        )}
                      </p>
                    </div>
                    <Button
                      onClick={handleExploreCharts}
                      variant="ghost"
                      className="w-full border-2 border-green-600 text-green-600 hover:bg-green-50 flex items-center justify-center"
                    >
                      {t("home.view_charts", "View Charts")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Card>
                </div>

                {/* Step 3 */}
                <div className="relative">
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xl z-10">
                    3
                  </div>
                  <Card className="p-8 h-full border-2 border-purple-200 hover:border-purple-400 hover:shadow-xl transition-all">
                    <div className="mb-6">
                      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                        <Calculator className="h-8 w-8 text-purple-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {t("home.step3_title", "Calculate Costs")}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {t(
                          "home.step3_desc",
                          "Use our calculators to estimate buying costs, taxes, ownership expenses, and selling fees. Make informed financial decisions."
                        )}
                      </p>
                    </div>
                    <Button
                      onClick={handleExploreCalculators}
                      variant="ghost"
                      className="w-full border-2 border-purple-600 text-purple-600 hover:bg-purple-50 flex items-center justify-center"
                    >
                      {t("home.use_calculators", "Use Calculators")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Card>
                </div>
              </div>
            </div>
          </section>

          {/* Final CTA Section */}
          <section className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white py-16 md:py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 lg:pr-8 text-center">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                {t(
                  "home.final_cta_title",
                  "Ready to Make Better Investment Decisions?"
                )}
              </h2>
              <p className="text-xl md:text-2xl text-blue-100 mb-8">
                {t(
                  "home.final_cta_subtitle",
                  "Join thousands of investors using PropTrenz to track prices, analyze trends, and make smarter decisions."
                )}
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button
                  onClick={handleGetStarted}
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 rounded-full flex items-center"
                >
                  {t("home.get_started_free", "Get Started Free")}
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
                <Button
                  onClick={() => router.push("/map")}
                  size="lg"
                  variant="ghost"
                  className="bg-transparent border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-lg font-semibold rounded-full flex items-center"
                >
                  {t("home.explore_first", "Explore First")}
                </Button>
              </div>
            </div>
          </section>
        </div>

        {/* Auth Modal */}
        {showAuth && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                onClick={() => setShowAuth(false)}
              />
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
                <AuthForm
                  mode={authMode}
                  onModeChange={setAuthMode}
                  onClose={() => setShowAuth(false)}
                  className="border-0"
                />
              </div>
            </div>
          </div>
        )}
      </Layout>
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({
  locale,
  defaultLocale,
}) => {
  const validLocale = locale || defaultLocale || "en";
  const translations = await serverSideTranslations(validLocale, ["common"]);

  return {
    props: {
      ...translations,
    },
    revalidate: 60 * 60,
  };
};
