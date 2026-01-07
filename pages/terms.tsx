import Head from "next/head";
import { GetStaticProps } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import { Layout } from "@/components/Layout";

export default function TermsOfService() {
  const { t } = useTranslation("common");
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://proptrenz.com";
  
  const currentPath = "/terms";
  const hreflangUrls = {
    en: `${baseUrl}${currentPath}`,
    es: `${baseUrl}/es${currentPath}`,
    zh: `${baseUrl}/zh${currentPath}`,
  };

  return (
    <Layout hideHeader>
      <Head>
        <title>{t("legal.terms_of_service", "Terms of Service")} | PropTrenz</title>
        <meta
          name="description"
          content={t("legal.terms_meta_description", "Read PropTrenz's Terms of Service. Understand the rules and regulations governing the use of our real estate data platform and services.")}
        />
        <link rel="canonical" href={`${baseUrl}/terms`} />
        <link rel="alternate" hrefLang="en" href={hreflangUrls.en} />
        <link rel="alternate" hrefLang="es" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="zh" href={hreflangUrls.zh} />
        <link rel="alternate" hrefLang="x-default" href={hreflangUrls.en} />
      </Head>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
          {t("legal.terms_of_service", "Terms of Service")}
        </h1>
        
        <p className="text-gray-600 mb-8">
          {t("legal.last_updated", "Last updated")}: January 6, 2026
        </p>

        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.terms.agreement_title", "Agreement to Terms")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("legal.terms.agreement_text", "These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity (\"you\") and PropTrenz (\"Company\", \"we\", \"us\", or \"our\"), concerning your access to and use of the proptrenz.com website as well as any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto (collectively, the \"Site\").")}
            </p>
            <p className="text-gray-700 mb-4">
              {t("legal.terms.agreement_text_2", "You agree that by accessing the Site, you have read, understood, and agree to be bound by all of these Terms of Service. If you do not agree with all of these Terms of Service, then you are expressly prohibited from using the Site and you must discontinue use immediately.")}
            </p>
            <p className="text-gray-700 mb-4">
              {t("legal.terms.agreement_text_3", "Supplemental terms and conditions or documents that may be posted on the Site from time to time are hereby expressly incorporated herein by reference. We reserve the right, in our sole discretion, to make changes or modifications to these Terms of Service at any time and for any reason.")}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.terms.ip_title", "Intellectual Property Rights")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("legal.terms.ip_text", "Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the \"Content\") and the trademarks, service marks, and logos contained therein (the \"Marks\") are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws and various other intellectual property rights.")}
            </p>
            <p className="text-gray-700 mb-4">
              {t("legal.terms.ip_text_2", "The Content and the Marks are provided on the Site \"AS IS\" for your information and personal use only. Except as expressly provided in these Terms of Service, no part of the Site and no Content or Marks may be copied, reproduced, aggregated, republished, uploaded, posted, publicly displayed, encoded, translated, transmitted, distributed, sold, licensed, or otherwise exploited for any commercial purpose whatsoever, without our express prior written permission.")}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.terms.representations_title", "User Representations")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("legal.terms.representations_intro", "By using the Site, you represent and warrant that:")}
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>{t("legal.terms.rep_1", "All registration information you submit will be true, accurate, current, and complete.")}</li>
              <li>{t("legal.terms.rep_2", "You will maintain the accuracy of such information and promptly update such registration information as necessary.")}</li>
              <li>{t("legal.terms.rep_3", "You have the legal capacity and you agree to comply with these Terms of Service.")}</li>
              <li>{t("legal.terms.rep_4", "You are not a minor in the jurisdiction in which you reside.")}</li>
              <li>{t("legal.terms.rep_5", "You will not access the Site through automated or non-human means, whether through a bot, script or otherwise.")}</li>
              <li>{t("legal.terms.rep_6", "You will not use the Site for any illegal or unauthorized purpose.")}</li>
              <li>{t("legal.terms.rep_7", "Your use of the Site will not violate any applicable law or regulation.")}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.terms.registration_title", "User Registration")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("legal.terms.registration_text", "You may be required to register with the Site. You agree to keep your password confidential and will be responsible for all use of your account and password. We reserve the right to remove, reclaim, or change a username you select if we determine, in our sole discretion, that such username is inappropriate, obscene, or otherwise objectionable.")}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.terms.purchases_title", "Purchases and Payment")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("legal.terms.purchases_intro", "We accept the following forms of payment:")}
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>Visa</li>
              <li>Mastercard</li>
              <li>American Express</li>
              <li>PayPal</li>
            </ul>
            <p className="text-gray-700 mb-4">
              {t("legal.terms.purchases_text", "You agree to provide current, complete, and accurate purchase and account information for all purchases made via the Site. You further agree to promptly update account and payment information, including email address, payment method, and payment card expiration date, so that we can complete your transactions and contact you as needed. Sales tax will be added to the price of purchases as deemed required by us. We may change prices at any time. All payments shall be in U.S. dollars or Mexican pesos.")}
            </p>
            <p className="text-gray-700 mb-4">
              {t("legal.terms.purchases_text_2", "You agree to pay all charges at the prices then in effect for your purchases and any applicable shipping fees, and you authorize us to charge your chosen payment provider for any such amounts upon placing your order. We reserve the right to correct any errors or mistakes in pricing, even if we have already requested or received payment.")}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.terms.subscriptions_title", "Subscriptions")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("legal.terms.subscriptions_text", "If you purchase a subscription, you will be billed in advance on a recurring and periodic basis (such as monthly or annually), depending on the type of subscription plan you select. Your subscription will automatically renew at the end of each billing cycle unless you cancel it or we cancel it.")}
            </p>
            <p className="text-gray-700 mb-4">
              {t("legal.terms.subscriptions_text_2", "You may cancel your subscription at any time by logging into your account or contacting us. Your cancellation will take effect at the end of the current paid term. If you are unsatisfied with our services, please email us at support@proptrenz.com.")}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.terms.refunds_title", "Refund Policy")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("legal.terms.refunds_text", "All sales are final and no refund will be issued. However, if you experience technical issues that prevent you from using the service, please contact us at support@proptrenz.com and we will work to resolve the issue or provide a refund at our discretion.")}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.terms.prohibited_title", "Prohibited Activities")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("legal.terms.prohibited_intro", "You may not access or use the Site for any purpose other than that for which we make the Site available. The Site may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us. As a user of the Site, you agree not to:")}
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>{t("legal.terms.prohibited_1", "Systematically retrieve data or other content from the Site to create or compile, directly or indirectly, a collection, compilation, database, or directory without written permission from us.")}</li>
              <li>{t("legal.terms.prohibited_2", "Make any unauthorized use of the Site, including collecting usernames and/or email addresses of users by electronic or other means.")}</li>
              <li>{t("legal.terms.prohibited_3", "Use a buying agent or purchasing agent to make purchases on the Site.")}</li>
              <li>{t("legal.terms.prohibited_4", "Use the Site to advertise or offer to sell goods and services.")}</li>
              <li>{t("legal.terms.prohibited_5", "Circumvent, disable, or otherwise interfere with security-related features of the Site.")}</li>
              <li>{t("legal.terms.prohibited_6", "Engage in unauthorized framing of or linking to the Site.")}</li>
              <li>{t("legal.terms.prohibited_7", "Trick, defraud, or mislead us and other users, especially in any attempt to learn sensitive account information such as user passwords.")}</li>
              <li>{t("legal.terms.prohibited_8", "Make improper use of our support services or submit false reports of abuse or misconduct.")}</li>
              <li>{t("legal.terms.prohibited_9", "Interfere with, disrupt, or create an undue burden on the Site or the networks or services connected to the Site.")}</li>
              <li>{t("legal.terms.prohibited_10", "Attempt to impersonate another user or person or use the username of another user.")}</li>
              <li>{t("legal.terms.prohibited_11", "Use any information obtained from the Site in order to harass, abuse, or harm another person.")}</li>
              <li>{t("legal.terms.prohibited_12", "Use the Site as part of any effort to compete with us or otherwise use the Site and/or the Content for any revenue-generating endeavor or commercial enterprise.")}</li>
              <li>{t("legal.terms.prohibited_13", "Decipher, decompile, disassemble, or reverse engineer any of the software comprising or in any way making up a part of the Site.")}</li>
              <li>{t("legal.terms.prohibited_14", "Harass, annoy, intimidate, or threaten any of our employees or agents engaged in providing any portion of the Site to you.")}</li>
              <li>{t("legal.terms.prohibited_15", "Copy or adapt the Site's software, including but not limited to Flash, PHP, HTML, JavaScript, or other code.")}</li>
              <li>{t("legal.terms.prohibited_16", "Upload or transmit (or attempt to upload or to transmit) viruses, Trojan horses, or other material that interferes with any party's uninterrupted use and enjoyment of the Site.")}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.terms.disclaimer_title", "Disclaimer")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("legal.terms.disclaimer_text", "THE SITE IS PROVIDED ON AN AS-IS AND AS-AVAILABLE BASIS. YOU AGREE THAT YOUR USE OF THE SITE AND OUR SERVICES WILL BE AT YOUR SOLE RISK. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, IN CONNECTION WITH THE SITE AND YOUR USE THEREOF, INCLUDING, WITHOUT LIMITATION, THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.")}
            </p>
            <p className="text-gray-700 mb-4">
              {t("legal.terms.disclaimer_text_2", "WE MAKE NO WARRANTIES OR REPRESENTATIONS ABOUT THE ACCURACY OR COMPLETENESS OF THE SITE'S CONTENT OR THE CONTENT OF ANY WEBSITES LINKED TO THE SITE AND WE WILL ASSUME NO LIABILITY OR RESPONSIBILITY FOR ANY (1) ERRORS, MISTAKES, OR INACCURACIES OF CONTENT AND MATERIALS, (2) PERSONAL INJURY OR PROPERTY DAMAGE, OF ANY NATURE WHATSOEVER, RESULTING FROM YOUR ACCESS TO AND USE OF THE SITE.")}
            </p>
            <p className="text-gray-700 mb-4">
              {t("legal.terms.disclaimer_text_3", "THE REAL ESTATE DATA, PRICE INFORMATION, AND MARKET ANALYTICS PROVIDED ON THIS SITE ARE FOR INFORMATIONAL PURPOSES ONLY AND SHOULD NOT BE RELIED UPON AS THE SOLE BASIS FOR MAKING REAL ESTATE INVESTMENT DECISIONS. WE DO NOT GUARANTEE THE ACCURACY, COMPLETENESS, OR TIMELINESS OF ANY DATA PRESENTED.")}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.terms.liability_title", "Limitations of Liability")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("legal.terms.liability_text", "IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFIT, LOST REVENUE, LOSS OF DATA, OR OTHER DAMAGES ARISING FROM YOUR USE OF THE SITE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.")}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.terms.indemnification_title", "Indemnification")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("legal.terms.indemnification_text", "You agree to defend, indemnify, and hold us harmless, including our subsidiaries, affiliates, and all of our respective officers, agents, partners, and employees, from and against any loss, damage, liability, claim, or demand, including reasonable attorneys' fees and expenses, made by any third party due to or arising out of: (1) your use of the Site; (2) breach of these Terms of Service; (3) any breach of your representations and warranties set forth in these Terms of Service; (4) your violation of the rights of a third party, including but not limited to intellectual property rights.")}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.terms.governing_title", "Governing Law")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("legal.terms.governing_text", "These Terms shall be governed by and defined following the laws of Mexico. PropTrenz and yourself irrevocably consent that the courts of Mexico City shall have exclusive jurisdiction to resolve any dispute which may arise in connection with these terms.")}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.terms.termination_title", "Termination")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("legal.terms.termination_text", "These Terms of Service shall remain in full force and effect while you use the Site. WITHOUT LIMITING ANY OTHER PROVISION OF THESE TERMS OF SERVICE, WE RESERVE THE RIGHT TO, IN OUR SOLE DISCRETION AND WITHOUT NOTICE OR LIABILITY, DENY ACCESS TO AND USE OF THE SITE (INCLUDING BLOCKING CERTAIN IP ADDRESSES), TO ANY PERSON FOR ANY REASON OR FOR NO REASON.")}
            </p>
            <p className="text-gray-700 mb-4">
              {t("legal.terms.termination_text_2", "If we terminate or suspend your account for any reason, you are prohibited from registering and creating a new account under your name, a fake or borrowed name, or the name of any third party, even if you may be acting on behalf of the third party.")}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.terms.modifications_title", "Modifications and Interruptions")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("legal.terms.modifications_text", "We reserve the right to change, modify, or remove the contents of the Site at any time or for any reason at our sole discretion without notice. However, we have no obligation to update any information on our Site. We also reserve the right to modify or discontinue all or part of the Site without notice at any time.")}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("legal.terms.contact_title", "Contact Us")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("legal.terms.contact_text", "In order to resolve a complaint regarding the Site or to receive further information regarding use of the Site, please contact us at:")}
            </p>
            <p className="text-gray-700">
              <strong>PropTrenz</strong><br />
              Email: legal@proptrenz.com
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
