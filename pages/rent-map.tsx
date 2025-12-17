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
import { MapPin, Loader2 } from "lucide-react";
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
  const [selectedCity, setSelectedCity] = useState<string | null>(
    "Ciudad de México"
  );
  const [selectedMunicipality, setSelectedMunicipality] = useState<
    string | null
  >(null);

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
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium">
                    {t("rent_map.city")}:
                  </label>
                  <div style={{ zIndex: 1200 }}>
                    <Select
                      onValueChange={(val: string) => {
                        setSelectedCity(val || null);
                        setSelectedMunicipality(null);
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

                <NeighborhoodRentMap
                  rentData={rentData}
                  selectedMunicipality={selectedMunicipality}
                  setSelectedMunicipality={setSelectedMunicipality}
                  selectedCity={selectedCity}
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
