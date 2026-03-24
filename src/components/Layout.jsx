// Layout.jsx
import React, { lazy, Suspense, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useInView } from "react-intersection-observer";
import { useTranslation } from "react-i18next";

const Footer = lazy(() => import("@/components/Footer"));

const Layout = ({ children, noFooter = false }) => {
    const { t } = useTranslation();
    const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
    const [footerVisible, setFooterVisible] = useState(false);

    const { pathname } = useLocation();
    const siteUrl = "https://grupodte.com";
    const currentUrl = `${siteUrl}${pathname}`;
    const defaultTitle = t("layout.seo.defaultTitle");
    const defaultDescription = t("layout.seo.defaultDescription");
    const ogImage = `${siteUrl}/og-default.jpg`;

    useEffect(() => {
        if (inView) setFooterVisible(true);
    }, [inView]);

    return (
        <div className="w-full overflow-x-hidden max-w-[1920px] mx-auto relative min-h-screen flex flex-col">
            {/* SEO Global */}
            <Helmet>
                <title>{defaultTitle}</title>
                <meta name="description" content={defaultDescription} />

                {/* Open Graph — Facebook, WhatsApp, LinkedIn, Telegram */}
                <meta property="og:type" content="website" />
                <meta property="og:site_name" content="Grupo DTE" />
                <meta property="og:locale" content="es_UY" />
                <meta property="og:title" content={defaultTitle} />
                <meta property="og:description" content={defaultDescription} />
                <meta property="og:image" content={ogImage} />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta property="og:image:type" content="image/jpeg" />
                <meta property="og:url" content={currentUrl} />

                {/* Twitter / X */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={defaultTitle} />
                <meta name="twitter:description" content={defaultDescription} />
                <meta name="twitter:image" content={ogImage} />

                <link rel="canonical" href={currentUrl} />

                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Organization",
                        "name": "Grupo DTE",
                        "url": siteUrl,
                        "logo": `${siteUrl}/logo.png`,
                        "sameAs": [
                            "https://www.instagram.com/grupodte",
                            "https://www.linkedin.com/company/grupodte"
                        ]
                    })}
                </script>
            </Helmet>

            <Navbar />
            <main className="flex-grow md:pt-[45px]" role="main">{children}</main>

            {!noFooter && (
                <>
                    <div ref={ref} className="absolute bottom-0 w-full h-10 pointer-events-none" />
                    {footerVisible && (
                        <Suspense fallback={<div className="text-center py-10">{t("layout.footerLoading")}</div>}>
                            <Footer />
                        </Suspense>
                    )}
                </>
            )}
        </div>
    );
};

export default Layout;
