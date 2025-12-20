import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { MapPin, Loader2, Share2, Check } from "lucide-react";
import { GetServerSideProps } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";

const NeighborhoodRentMap = dynamic(
  // load the component's default export (the file exports default)
  () =>
    import("@/components/maps/NeighborhoodRentMap").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] flex items-center justify-center bg-gray-100 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    ),
  }
);

interface RentData {
  [municipality: string]: {
    [neighborhood: string]: any;
  };
}

export default function RentMapPage() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [rentData, setRentData] = useState<RentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState<
    string | null
  >(null);
  const [initialNeighborhood, setInitialNeighborhood] = useState<
    string | null
  >(null);
  const [shareCopied, setShareCopied] = useState(false);

  // Map URL slug to display city name
  const slugToCityName: { [key: string]: string } = {
    "ciudad-de-mexico": "Ciudad de México",
    guadalajara: "Guadalajara",
    monterrey: "Monterrey",
    "puerto-vallarta": "Puerto Vallarta",
  };

  // Map display city name back to URL slug
  const cityNameToSlug: { [key: string]: string } = {
    "Ciudad de México": "ciudad-de-mexico",
    "Guadalajara": "guadalajara",
    "Monterrey": "monterrey",
    "Puerto Vallarta": "puerto-vallarta",
  };

  // Handle neighborhood selection - update URL
  const handleNeighborhoodSelect = (neighborhood: string, municipality: string) => {
    const citySlug = selectedCity ? cityNameToSlug[selectedCity] || selectedCity.toLowerCase().replace(/\s+/g, '-') : 'ciudad-de-mexico';
    const neighborhoodSlug = neighborhood.toLowerCase().replace(/\s+/g, '-');
    
    router.replace(
      {
        pathname: router.pathname,
        query: {
          city: citySlug,
          neighborhood: neighborhoodSlug,
        },
      },
      undefined,
      { shallow: true }
    );
  };

  // Wrapper to clear URL params when closing the panel
  const handleSetSelectedMunicipality = (municipality: string | null) => {
    setSelectedMunicipality(municipality);
    
    // If closing the panel (municipality is null), clear the URL params
    if (municipality === null && (router.query.neighborhood || router.query.municipality)) {
      // Clear neighborhood and municipality params from URL
      const { neighborhood, municipality: muniParam, ...restQuery } = router.query;
      router.replace(
        { pathname: router.pathname, query: restQuery },
        undefined,
        { shallow: true }
      );
      // Also clear initial neighborhood so it doesn't reopen
      setInitialNeighborhood(null);
    }
  };

  // Read city and neighborhood from URL query params on mount and when router changes
  useEffect(() => {
    if (router.isReady) {
      const cityParam = router.query.city as string | undefined;
      const neighborhoodParam = router.query.neighborhood as string | undefined;
      
      if (cityParam) {
        const cityName = slugToCityName[cityParam.toLowerCase()] || cityParam;
        setSelectedCity(cityName);
      } else {
        // Default to Ciudad de México if no city param
        setSelectedCity("Ciudad de México");
      }
      
      if (neighborhoodParam) {
        setInitialNeighborhood(neighborhoodParam);
      }
    }
  }, [router.isReady, router.query.city, router.query.neighborhood]);

  useEffect(() => {
    const loadRentData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/rent-data");
        if (!response.ok) {
          throw new Error("Failed to fetch rent data");
        }
        const data = await response.json();
        setRentData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    loadRentData();
  }, []);

  // derive cities from municipality keys
  function municipalityCity(m: string) {
    const cdmx = [
      "Cuauhtémoc",
      "Álvaro Obregón",
      "Benito Juárez",
      "Miguel Hidalgo",
      "Coyoacán",
      "Azcapotzalco",
      "Cuajimalpa de Morelos",
      "Gustavo A. Madero",
      "Iztacalco",
      "Iztapalapa",
      "La Magdalena Contreras",
      "Tlalpan",
      "Venustiano Carranza",
    ];
    const guadalajara = [
      "Guadalajara",
      "San Pedro Tlaquepaque",
      "Tonalá",
      "Zapopan",
    ];
    const monterrey = [
      "Monterrey",
      "San Pedro Garza García",
      "San Nicolás de los Garza",
      "Apodaca",
      "Guadalupe",
    ];
    const puertoVallarta = ["Puerto Vallarta"];
    if (cdmx.includes(m)) return "Ciudad de México";
    if (guadalajara.includes(m)) return "Guadalajara";
    if (monterrey.includes(m)) return "Monterrey";
    if (puertoVallarta.includes(m)) return "Puerto Vallarta";
    return "Ciudad de México"; // default fallback
  }

  const municipalities = rentData ? Object.keys(rentData) : [];
  const citiesFromData = rentData
    ? Array.from(new Set(municipalities.map(municipalityCity)))
    : [];
  // Always include Mexico City, Guadalajara, and Monterrey as options (even if no data) for better UX
  const allPossibleCities = [
    "Ciudad de México",
    "Guadalajara",
    "Monterrey",
    "Puerto Vallarta",
  ];
  const cities = rentData
    ? Array.from(new Set([...citiesFromData, ...allPossibleCities])).sort()
    : allPossibleCities;

  return (
    <>
      <Head>
        <title>{t("rent_map.meta.title")}</title>
        <meta name="description" content={t("rent_map.meta.description")} />
        <link rel="canonical" href={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://proptrenz.com'}${router.locale === 'en' ? '' : `/${router.locale}`}/rent-map`} />
      </Head>
      <Layout title={t("rent_map.title")} subtitle={t("rent_map.subtitle")}>
        <div className="space-y-6">
          <Card className="p-6">
            {loading && (
              <div className="flex items-center justify-center h-[600px] bg-gray-50 rounded-lg">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {t("rent_map.loading_rent_data")}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">
                  {t("rent_map.error_loading_data")}: {error}
                </p>
              </div>
            )}

            {rentData && !loading && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium">
                      {t("rent_map.city")}:
                    </label>
                    <div style={{ zIndex: 1200 }}>
                      <Select
                        onValueChange={(val: string) => {
                          setSelectedCity(val || null);
                          handleSetSelectedMunicipality(null);
                          // Update URL with new city
                          if (val) {
                            const citySlug = cityNameToSlug[val] || val.toLowerCase().replace(/\s+/g, '-');
                            router.replace(
                              {
                                pathname: router.pathname,
                                query: { city: citySlug },
                              },
                              undefined,
                              { shallow: true }
                            );
                          }
                        }}
                        value={selectedCity || ""}
                      >
                        <SelectTrigger className="w-[220px]">
                          <span>{selectedCity || t("rent_map.select_city")}</span>
                        </SelectTrigger>
                        <SelectContent>
                          {cities.map((city) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Share Button */}
                  <button
                    onClick={async () => {
                      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                      const currentPath = router.asPath.split('?')[0];
                      const shareableUrl = `${baseUrl}${currentPath}?${new URLSearchParams(router.query as Record<string, string>).toString()}`;
                      try {
                        await navigator.clipboard.writeText(shareableUrl);
                        setShareCopied(true);
                        setTimeout(() => setShareCopied(false), 2000);
                      } catch (err) {
                        console.error('Failed to copy URL:', err);
                        const input = document.createElement('input');
                        input.value = shareableUrl;
                        document.body.appendChild(input);
                        input.select();
                        document.execCommand('copy');
                        document.body.removeChild(input);
                        setShareCopied(true);
                        setTimeout(() => setShareCopied(false), 2000);
                      }
                    }}
                    className="bg-white hover:bg-gray-50 px-3 py-2 rounded-lg shadow-sm flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors border border-gray-200"
                    title={shareCopied ? t('map.link_copied', 'Link copied!') : t('map.share_map', 'Share map')}
                  >
                    {shareCopied ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">{t('map.copied', 'Copied!')}</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4" />
                        <span>{t('map.share', 'Share')}</span>
                      </>
                    )}
                  </button>
                </div>

                <NeighborhoodRentMap
                  rentData={rentData}
                  selectedMunicipality={selectedMunicipality}
                  setSelectedMunicipality={handleSetSelectedMunicipality}
                  selectedCity={selectedCity}
                  initialNeighborhood={initialNeighborhood}
                  onNeighborhoodSelect={handleNeighborhoodSelect}
                />
              </div>
            )}
          </Card>
        </div>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? "en", ["common"])),
  },
});
