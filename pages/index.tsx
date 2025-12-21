import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
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
  Check,
  Database,
  BookOpen,
  Menu,
  X,
  ChevronRight,
  Zap,
} from "lucide-react";
import { GetStaticProps } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTracking } from "@/lib/useTracking";

export default function LandingPage() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { track } = useTracking();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Scroll effect for sticky header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Check for signup modal trigger
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

    const handleHashChange = () => checkSignup();
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [router]);

  const handleGetStarted = () => {
    track("signup_button_clicked", { source: "landing_page" });
    setShowAuth(true);
    setAuthMode("signup");
  };

  const handleSignIn = () => {
    track("signup_button_clicked", { source: "landing_page_signin" });
    setShowAuth(true);
    setAuthMode("signin");
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

  const stats = {
    dataPoints: 10000,
    neighborhoods: 500,
    yearsOfHistory: 20,
    cities: 10,
  };

  const navLinks = [
    { href: "/rent-map", label: t("nav.rent_map", "Rent Prices") },
    { href: "/map", label: t("nav.purchase_map", "Purchase Prices") },
    { href: "/charts", label: t("nav.charts", "Charts") },
    { href: "/calculators", label: t("nav.calculators", "Calculators") },
    { href: "/guides", label: t("nav.guides", "Guides") },
  ];

  return (
    <>
      <Head>
        <title>
          PropTrenz | Mexico Real Estate Data &amp; Analytics Platform
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
      </Head>

      <div className="min-h-screen bg-white">
        {/* Sticky Navigation Header */}
        <header
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            scrolled
              ? "bg-white/95 backdrop-blur-md shadow-md"
              : "bg-transparent"
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 md:h-20">
              {/* Logo */}
              <Link href="/" className="flex items-center">
                <LogoSVG
                  showText={true}
                  size="md"
                  className={scrolled ? "text-blue-600" : "text-white"}
                  style={{ height: "40px", width: "auto" }}
                />
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center space-x-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      scrolled
                        ? "text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                        : "text-white/90 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              {/* Right Side Actions */}
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block">
                  <LanguageSwitcher />
                </div>
                <Button
                  onClick={handleSignIn}
                  variant="ghost"
                  className={`hidden md:inline-flex ${
                    scrolled
                      ? "text-gray-700 hover:text-blue-600"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  {t("auth.sign_in", "Log In")}
                </Button>
                <Button
                  onClick={handleGetStarted}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  {t("home.get_started", "Get Started")}
                </Button>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className={`lg:hidden p-2 rounded-lg ${
                    scrolled ? "text-gray-700" : "text-white"
                  }`}
                >
                  {mobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden bg-white border-t shadow-xl">
              <div className="px-4 py-4 space-y-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="pt-4 border-t">
                  <Button
                    onClick={handleSignIn}
                    variant="secondary"
                    className="w-full mb-2"
                  >
                    {t("auth.sign_in", "Log In")}
                  </Button>
                  <Button
                    onClick={handleGetStarted}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {t("home.get_started", "Get Started")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 pt-24 md:pt-32 pb-20 md:pb-32 overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-20 right-10 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-400/10 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left Column - Text Content */}
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-blue-100 text-sm font-medium mb-6">
                  <Zap className="h-4 w-4 mr-2" />
                  {t("home.badge", "The #1 Mexico Real Estate Data Platform")}
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                  {t(
                    "home.hero_title",
                    "Smarter real estate decisions start with instant insights"
                  )}
                </h1>

                <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-xl mx-auto lg:mx-0">
                  {t(
                    "home.hero_subtitle",
                    "Get instant access to accurate property data, valuations, and market analytics across Mexico. Make confident decisions with comprehensive real estate intelligence."
                  )}
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
                  <Button
                    onClick={handleGetStarted}
                    size="lg"
                    className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg font-bold shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105"
                  >
                    {t("home.get_started_free", "Get Started Free")}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    onClick={() => router.push("/map")}
                    size="lg"
                    variant="ghost"
                    className="border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-lg font-semibold bg-transparent"
                  >
                    {t("home.explore_platform", "Explore Platform")}
                  </Button>
                </div>

                {/* Trust Indicators */}
                <div className="flex flex-wrap gap-6 justify-center lg:justify-start text-sm text-blue-100">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-300" />
                    <span>
                      {t("home.official_data", "Official Data Sources")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-300" />
                    <span>{t("home.easy_to_use", "Easy to Use")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-300" />
                    <span>
                      {t("home.data_updated_monthly", "Data Updated Monthly")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column - Visual Element */}
              <div className="relative hidden lg:block">
                <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/20">
                  {/* Mock Dashboard Preview */}
                  <div className="bg-white rounded-xl overflow-hidden shadow-xl">
                    <div className="bg-gray-100 px-4 py-3 flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-400 rounded-full" />
                      <div className="w-3 h-3 bg-yellow-400 rounded-full" />
                      <div className="w-3 h-3 bg-green-400 rounded-full" />
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <p className="text-gray-500 text-sm">Average Price</p>
                          <p className="text-3xl font-bold text-gray-900">
                            $4,250,000
                          </p>
                          <p className="text-green-600 text-sm flex items-center">
                            <TrendingUp className="h-4 w-4 mr-1" />
                            +12.3% YoY
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-500 text-sm">
                            Properties Analyzed
                          </p>
                          <p className="text-2xl font-bold text-blue-600">
                            10,847
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-700">Condesa</span>
                          <span className="font-semibold">$65,000/m²</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-700">Roma Norte</span>
                          <span className="font-semibold">$58,000/m²</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-700">Polanco</span>
                          <span className="font-semibold">$82,000/m²</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Stats Card */}
                <div className="absolute -bottom-6 -left-6 bg-white rounded-xl p-4 shadow-xl border">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">500+</p>
                      <p className="text-gray-500 text-sm">Neighborhoods</p>
                    </div>
                  </div>
                </div>

                {/* Floating Data Card */}
                <div className="absolute -top-4 -right-4 bg-white rounded-xl p-4 shadow-xl border">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Database className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">10K+</p>
                      <p className="text-gray-500 text-sm">Data Points</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="bg-white py-8 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-blue-600">
                  <AnimatedCounter
                    value={stats.dataPoints}
                    suffix="+"
                    decimals={0}
                  />
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  {t("home.data_points", "Data Points")}
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-green-600">
                  <AnimatedCounter
                    value={stats.neighborhoods}
                    suffix="+"
                    decimals={0}
                  />
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  {t("home.neighborhoods", "Neighborhoods")}
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-purple-600">
                  <AnimatedCounter
                    value={stats.yearsOfHistory}
                    suffix="+"
                    decimals={0}
                  />
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  {t("home.years_data", "Years of Data")}
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-orange-600">
                  <AnimatedCounter
                    value={stats.cities}
                    suffix="+"
                    decimals={0}
                  />
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  {t("home.cities", "Cities Covered")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Solutions Section - HouseCanary Style */}
        <section className="py-20 md:py-28 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="text-blue-600 font-semibold mb-3 uppercase tracking-wide text-sm">
                {t("home.solutions_label", "Solutions")}
              </p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                {t(
                  "home.solutions_title",
                  "Turn real estate data into opportunities with a solution designed to fit your needs"
                )}
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Solution 1 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-gray-100 group">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
                  <BarChart3 className="h-7 w-7 text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {t(
                    "home.solution1_title",
                    "Explore Data, Analytics & Visualization"
                  )}
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {t(
                    "home.solution1_desc",
                    "Power your decisions with the gold standard of real estate data across all Mexican states and municipalities with more than 20 years of price history."
                  )}
                </p>
                <Link
                  href="/charts"
                  className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700"
                >
                  {t("home.explore_analytics", "Explore Data & Analytics")}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>

              {/* Solution 2 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-gray-100 group">
                <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-600 transition-colors">
                  <MapPin className="h-7 w-7 text-green-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {t(
                    "home.solution2_title",
                    "Identify & Evaluate Investment Opportunities"
                  )}
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {t(
                    "home.solution2_desc",
                    "Quickly pinpoint, analyze, and take action in top areas with our comprehensive price data maps."
                  )}
                </p>
                <Link
                  href="/map"
                  className="inline-flex items-center text-green-600 font-semibold hover:text-green-700"
                >
                  {t("home.explore_map", "Explore Price Maps")}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>

              {/* Solution 3 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-gray-100 group">
                <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-600 transition-colors">
                  <Calculator className="h-7 w-7 text-purple-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {t("home.solution3_title", "Calculate Your True Costs")}
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {t(
                    "home.solution3_desc",
                    "Estimate closing costs, ownership expenses, and investment returns with our suite of calculators. Make informed financial decisions before you commit."
                  )}
                </p>
                <Link
                  href="/calculators"
                  className="inline-flex items-center text-purple-600 font-semibold hover:text-purple-700"
                >
                  {t("home.explore_calculators", "Use Calculators")}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Section 1 - Left Text, Right Visual */}
        <section className="py-20 md:py-28 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div>
                <p className="text-blue-600 font-semibold mb-3 uppercase tracking-wide text-sm">
                  {t("home.feature1_label", "Interactive Maps")}
                </p>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  {t(
                    "home.feature1_title",
                    "Streamline your workflow to save time and money"
                  )}
                </h2>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  {t(
                    "home.feature1_desc",
                    "Gain an edge on your competition by putting the power of the most comprehensive and accurate residential real estate data and analytics in the industry at your team's fingertips. Use AI-driven algorithms to understand every step of the analysis value chain to generate meaningful insights to help your team be more efficient, ultimately saving time and money."
                  )}
                </p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      {t(
                        "home.feature1_point1",
                        "Interactive neighborhood-level price maps"
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      {t(
                        "home.feature1_point2",
                        "Compare rent vs. buy economics instantly"
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      {t(
                        "home.feature1_point3",
                        "Filter by property type, price range, and more"
                      )}
                    </span>
                  </li>
                </ul>
                <Button
                  onClick={() => router.push("/rent-map")}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {t("home.view_rent_map", "View Rent Price Map")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>

              <div className="relative">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8 shadow-xl">
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="h-64 md:h-80 bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
                      <div className="text-center">
                        <MapPin className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">
                          Interactive Price Map
                        </p>
                        <p className="text-sm text-gray-500">
                          500+ neighborhoods
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Floating Badge */}
                <div className="absolute -bottom-4 -right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
                  <p className="font-bold">$425,000</p>
                  <p className="text-xs opacity-80">Avg. price/m²</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Section 2 - Right Text, Left Visual */}
        <section className="py-20 md:py-28 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div className="order-2 lg:order-1 relative">
                <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-2xl p-8 shadow-xl">
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <p className="text-gray-500 text-sm mb-2">
                      Historical Price Trend
                    </p>
                    <div className="flex items-end justify-between h-48">
                      {[40, 55, 45, 60, 75, 65, 80, 90, 85, 95, 100, 110].map(
                        (height, i) => (
                          <div
                            key={i}
                            className="bg-gradient-to-t from-purple-500 to-purple-300 rounded-t w-4 md:w-6"
                            style={{ height: `${height}%` }}
                          />
                        )
                      )}
                    </div>
                    <div className="flex justify-between mt-4 text-xs text-gray-400">
                      <span>2015</span>
                      <span>2025</span>
                    </div>
                  </div>
                </div>
                {/* Floating Stats */}
                <div className="absolute -top-4 -left-4 bg-white rounded-lg p-3 shadow-lg border">
                  <p className="text-green-600 font-bold">+156%</p>
                  <p className="text-xs text-gray-500">10yr growth</p>
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <p className="text-purple-600 font-semibold mb-3 uppercase tracking-wide text-sm">
                  {t("home.feature2_label", "Data & Analytics")}
                </p>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  {t(
                    "home.feature2_title",
                    "We curate and normalize data from thousands of sources"
                  )}
                </h2>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  {t(
                    "home.feature2_desc",
                    "Our data goes through a rigorous quality control process to ensure accuracy. Our analytical algorithms harness the power of machine learning and artificial intelligence to synthesize meaningful insights, while our smart visualization helps you understand complex market dynamics."
                  )}
                </p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      {t(
                        "home.feature2_point1",
                        "20+ years of historical price data"
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      {t(
                        "home.feature2_point2",
                        "Quarter-over-quarter and year-over-year trends"
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      {t(
                        "home.feature2_point3",
                        "Compare neighborhoods and municipalities"
                      )}
                    </span>
                  </li>
                </ul>
                <Button
                  onClick={() => router.push("/charts")}
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {t("home.view_charts", "View Price Charts")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonial/Trust Section */}
        <section className="py-20 md:py-28 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-8">
              {t(
                "home.trust_title",
                "We are the most trusted and reliable data & analytics platform for residential real estate in Mexico"
              )}
            </h2>
            <p className="text-xl text-blue-100 mb-12 max-w-3xl mx-auto">
              {t(
                "home.trust_subtitle",
                "Our difference is in our data. We provide comprehensive, accurate, and up-to-date real estate intelligence to help you make smarter investment decisions."
              )}
            </p>
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50 px-10 py-6 text-lg font-bold shadow-2xl"
            >
              {t("home.get_started_free", "Get Started Free")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>

        {/* Learn More Section */}
        <section className="py-20 md:py-28 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="text-blue-600 font-semibold mb-3 uppercase tracking-wide text-sm">
                {t("home.learn_label", "Resources")}
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                {t(
                  "home.learn_title",
                  "Find the right information for your needs"
                )}
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Link href="/guides" className="group">
                <div className="bg-gray-50 rounded-2xl p-8 hover:bg-blue-50 transition-all border border-gray-100 h-full">
                  <BookOpen className="h-10 w-10 text-blue-600 mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600">
                    {t("home.resource1_title", "Buyer's Guides")}
                  </h3>
                  <p className="text-gray-600">
                    {t(
                      "home.resource1_desc",
                      "Step-by-step guides to buying property in Mexico, from finding the right location to closing the deal."
                    )}
                  </p>
                </div>
              </Link>

              <Link href="/calculators" className="group">
                <div className="bg-gray-50 rounded-2xl p-8 hover:bg-green-50 transition-all border border-gray-100 h-full">
                  <Calculator className="h-10 w-10 text-green-600 mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-600">
                    {t("home.resource2_title", "Cost Calculators")}
                  </h3>
                  <p className="text-gray-600">
                    {t(
                      "home.resource2_desc",
                      "Estimate closing costs, monthly expenses, and total investment for any property in Mexico."
                    )}
                  </p>
                </div>
              </Link>

              <Link href="/insights" className="group">
                <div className="bg-gray-50 rounded-2xl p-8 hover:bg-purple-50 transition-all border border-gray-100 h-full">
                  <TrendingUp className="h-10 w-10 text-purple-600 mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600">
                    {t("home.resource3_title", "Market Insights")}
                  </h3>
                  <p className="text-gray-600">
                    {t(
                      "home.resource3_desc",
                      "Deep-dive analysis of market trends, emerging opportunities, and investment strategies."
                    )}
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 md:py-28 bg-gray-900 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              {t(
                "home.final_cta_title",
                "Ready to make smarter real estate decisions?"
              )}
            </h2>
            <p className="text-xl text-gray-300 mb-10">
              {t(
                "home.final_cta_subtitle",
                "Join thousands of investors and homebuyers using PropTrenz to navigate the Mexican real estate market with confidence."
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={handleGetStarted}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 px-10 py-6 text-lg font-bold"
              >
                {t("home.get_started_free", "Get Started Free")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                onClick={() => router.push("/map")}
                size="lg"
                variant="ghost"
                className="border-2 border-white text-white hover:bg-white/10 px-10 py-6 text-lg font-semibold bg-transparent"
              >
                {t("home.explore_platform", "Explore Platform")}
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-950 text-gray-400 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-12 mb-12">
              {/* Brand */}
              <div className="md:col-span-1">
                <LogoSVG
                  showText={true}
                  size="md"
                  className="text-white mb-4"
                  style={{ height: "36px" }}
                />
                <p className="text-sm leading-relaxed">
                  {t(
                    "footer.tagline",
                    "The most comprehensive real estate data platform for Mexico. Make smarter property decisions."
                  )}
                </p>
              </div>

              {/* Products */}
              <div>
                <h4 className="text-white font-semibold mb-4">
                  {t("footer.products", "Products")}
                </h4>
                <ul className="space-y-3 text-sm">
                  <li>
                    <Link
                      href="/rent-map"
                      className="hover:text-white transition-colors"
                    >
                      {t("nav.rent_map", "Rent Price Map")}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/map"
                      className="hover:text-white transition-colors"
                    >
                      {t("nav.purchase_map", "Purchase Price Map")}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/charts"
                      className="hover:text-white transition-colors"
                    >
                      {t("nav.charts", "Price Charts")}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/calculators"
                      className="hover:text-white transition-colors"
                    >
                      {t("nav.calculators", "Calculators")}
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Resources */}
              <div>
                <h4 className="text-white font-semibold mb-4">
                  {t("footer.resources", "Resources")}
                </h4>
                <ul className="space-y-3 text-sm">
                  <li>
                    <Link
                      href="/guides"
                      className="hover:text-white transition-colors"
                    >
                      {t("nav.guides", "Guides")}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/insights"
                      className="hover:text-white transition-colors"
                    >
                      {t("nav.insights", "Market Insights")}
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Company */}
              <div>
                <h4 className="text-white font-semibold mb-4">
                  {t("footer.company", "Company")}
                </h4>
                <ul className="space-y-3 text-sm">
                  <li>
                    <Link
                      href="/profile"
                      className="hover:text-white transition-colors"
                    >
                      {t("footer.account", "My Account")}
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
              <p className="text-sm">
                © {new Date().getFullYear()} PropTrenz.{" "}
                {t("footer.rights", "All rights reserved.")}
              </p>
              <div className="flex items-center space-x-4 mt-4 md:mt-0">
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm transition-opacity"
              onClick={() => setShowAuth(false)}
            />
            <div className="relative inline-block bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:max-w-md sm:w-full">
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
