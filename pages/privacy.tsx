import Head from "next/head";
import { GetStaticProps } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import { Layout } from "@/components/Layout";

export default function PrivacyPolicy() {
  const { t } = useTranslation("common");
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://proptrenz.com";
  
  const currentPath = "/privacy";
  const hreflangUrls = {
    en: `${baseUrl}${currentPath}`,
    es: `${baseUrl}/es${currentPath}`,
    zh: `${baseUrl}/zh${currentPath}`,
  };

  return (
    <Layout hideHeader>
      <Head>
        <title>{t("legal.privacy_policy", "Privacy Policy")} | PropTrenz</title>
        <meta
          name="description"
          content={t("legal.privacy_meta_description", "Learn how PropTrenz collects, uses, and protects your personal information. Read our privacy policy for details on data handling and your rights.")}
        />
        <link rel="canonical" href={`${baseUrl}/privacy`} />
        <link rel="alternate" hrefLang="en" href={hreflangUrls.en} />
        <link rel="alternate" hrefLang="es" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="zh" href={hreflangUrls.zh} />
        <link rel="alternate" hrefLang="x-default" href={hreflangUrls.en} />
      </Head>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
          {t("legal.privacy_policy", "Privacy Policy")}
        </h1>
        
        <p className="text-gray-600 mb-8">
          {t("legal.last_updated", "Last updated")}: January 6, 2026
        </p>

        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.privacy.intro_title", "Introduction")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("legal.privacy.intro_text", "PropTrenz (\"we\", \"our\", or \"us\") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website proptrenz.com and use our services.")}
            </p>
            <p className="text-gray-700 mb-4">
              {t("legal.privacy.intro_text_2", "Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.")}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.privacy.collection_title", "Information We Collect")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("legal.privacy.collection_intro", "We may collect information about you in a variety of ways. The information we may collect on the Site includes:")}
            </p>
            
            <h3 className="text-xl font-medium text-gray-900 mb-3">
              {t("legal.privacy.personal_data_title", "Personal Data")}
            </h3>
            <p className="text-gray-700 mb-4">
              {t("legal.privacy.personal_data_text", "Personally identifiable information, such as your name, email address, and telephone number, that you voluntarily give to us when you register with the Site or when you choose to participate in various activities related to the Site, such as requesting property information or using our calculators.")}
            </p>

            <h3 className="text-xl font-medium text-gray-900 mb-3">
              {t("legal.privacy.derivative_title", "Derivative Data")}
            </h3>
            <p className="text-gray-700 mb-4">
              {t("legal.privacy.derivative_text", "Information our servers automatically collect when you access the Site, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the Site.")}
            </p>

            <h3 className="text-xl font-medium text-gray-900 mb-3">
              {t("legal.privacy.financial_title", "Financial Data")}
            </h3>
            <p className="text-gray-700 mb-4">
              {t("legal.privacy.financial_text", "Financial information, such as data related to your payment method (e.g., valid credit card number, card brand, expiration date) that we may collect when you purchase a subscription. We store only very limited, if any, financial information that we collect. Otherwise, all financial information is stored by our payment processor, Stripe, and you are encouraged to review their privacy policy and contact them directly for responses to your questions.")}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.privacy.use_title", "Use of Your Information")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("legal.privacy.use_intro", "Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Site to:")}
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>{t("legal.privacy.use_1", "Create and manage your account.")}</li>
              <li>{t("legal.privacy.use_2", "Process your transactions and send you related information.")}</li>
              <li>{t("legal.privacy.use_3", "Email you regarding your account or order.")}</li>
              <li>{t("legal.privacy.use_4", "Fulfill and manage purchases, orders, payments, and other transactions.")}</li>
              <li>{t("legal.privacy.use_5", "Generate a personal profile about you to make future visits to the Site more personalized.")}</li>
              <li>{t("legal.privacy.use_6", "Increase the efficiency and operation of the Site.")}</li>
              <li>{t("legal.privacy.use_7", "Monitor and analyze usage and trends to improve your experience with the Site.")}</li>
              <li>{t("legal.privacy.use_8", "Notify you of updates to the Site.")}</li>
              <li>{t("legal.privacy.use_9", "Offer new products, services, and/or recommendations to you.")}</li>
              <li>{t("legal.privacy.use_10", "Perform other business activities as needed.")}</li>
              <li>{t("legal.privacy.use_11", "Request feedback and contact you about your use of the Site.")}</li>
              <li>{t("legal.privacy.use_12", "Resolve disputes and troubleshoot problems.")}</li>
              <li>{t("legal.privacy.use_13", "Respond to product and customer service requests.")}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.privacy.disclosure_title", "Disclosure of Your Information")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("legal.privacy.disclosure_intro", "We may share information we have collected about you in certain situations. Your information may be disclosed as follows:")}
            </p>
            
            <h3 className="text-xl font-medium text-gray-900 mb-3">
              {t("legal.privacy.disclosure_law_title", "By Law or to Protect Rights")}
            </h3>
            <p className="text-gray-700 mb-4">
              {t("legal.privacy.disclosure_law_text", "If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation.")}
            </p>

            <h3 className="text-xl font-medium text-gray-900 mb-3">
              {t("legal.privacy.disclosure_third_title", "Third-Party Service Providers")}
            </h3>
            <p className="text-gray-700 mb-4">
              {t("legal.privacy.disclosure_third_text", "We may share your information with third parties that perform services for us or on our behalf, including payment processing (Stripe), data analysis (PostHog), email delivery, hosting services (Netlify, Supabase), customer service, and marketing assistance.")}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.privacy.tracking_title", "Tracking Technologies")}
            </h2>
            
            <h3 className="text-xl font-medium text-gray-900 mb-3">
              {t("legal.privacy.cookies_title", "Cookies and Web Beacons")}
            </h3>
            <p className="text-gray-700 mb-4">
              {t("legal.privacy.cookies_text", "We may use cookies, web beacons, tracking pixels, and other tracking technologies on the Site to help customize the Site and improve your experience. When you access the Site, your personal information is not collected through the use of tracking technology. Most browsers are set to accept cookies by default. You can remove or reject cookies, but be aware that such action could affect the availability and functionality of the Site.")}
            </p>

            <h3 className="text-xl font-medium text-gray-900 mb-3">
              {t("legal.privacy.analytics_title", "Website Analytics")}
            </h3>
            <p className="text-gray-700 mb-4">
              {t("legal.privacy.analytics_text", "We may partner with third-party analytics providers, including PostHog, to track and analyze usage data. These providers use cookies and similar technologies to collect and analyze information about use of the Site and report on activities and trends. You can opt out of certain analytics tracking.")}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.privacy.security_title", "Security of Your Information")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("legal.privacy.security_text", "We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.")}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.privacy.rights_title", "Your Rights")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("legal.privacy.rights_intro", "Depending on your location, you may have certain rights regarding your personal information:")}
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>{t("legal.privacy.rights_1", "The right to access – You have the right to request copies of your personal data.")}</li>
              <li>{t("legal.privacy.rights_2", "The right to rectification – You have the right to request that we correct any information you believe is inaccurate.")}</li>
              <li>{t("legal.privacy.rights_3", "The right to erasure – You have the right to request that we erase your personal data, under certain conditions.")}</li>
              <li>{t("legal.privacy.rights_4", "The right to restrict processing – You have the right to request that we restrict the processing of your personal data, under certain conditions.")}</li>
              <li>{t("legal.privacy.rights_5", "The right to data portability – You have the right to request that we transfer the data that we have collected to another organization, or directly to you, under certain conditions.")}</li>
            </ul>
            <p className="text-gray-700 mb-4">
              {t("legal.privacy.rights_contact", "If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us.")}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.privacy.account_title", "Account Information")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("legal.privacy.account_text", "You may at any time review or change the information in your account or terminate your account by logging into your account settings and updating your account, or by contacting us. Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases. However, some information may be retained in our files to prevent fraud, troubleshoot problems, assist with any investigations, enforce our Terms of Service and/or comply with legal requirements.")}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.privacy.children_title", "Policy for Children")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("legal.privacy.children_text", "We do not knowingly solicit information from or market to children under the age of 13. If you become aware of any data we have collected from children under age 13, please contact us using the contact information provided below.")}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.privacy.changes_title", "Changes to This Privacy Policy")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("legal.privacy.changes_text", "We may update this Privacy Policy from time to time in order to reflect, for example, changes to our practices or for other operational, legal, or regulatory reasons. We will notify you of any changes by posting the new Privacy Policy on this page and updating the \"Last updated\" date.")}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.privacy.contact_title", "Contact Us")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("legal.privacy.contact_text", "If you have questions or comments about this Privacy Policy, please contact us at:")}
            </p>
            <p className="text-gray-700">
              <strong>PropTrenz</strong><br />
              Email: privacy@proptrenz.com
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale, defaultLocale }) => {
  const validLocale = locale || defaultLocale || "en";
  const translations = await serverSideTranslations(validLocale, ["common"]);

  return {
    props: {
      ...translations,
    },
  };
};
