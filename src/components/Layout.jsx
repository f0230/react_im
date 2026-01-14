// Layout.jsx
import React, { lazy, Suspense, useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import StepperModal from "@/components/StepperModal";
import { useInView } from "react-intersection-observer";
import { useTranslation } from "react-i18next";

const Footer = lazy(() => import("@/components/Footer"));

const Layout = ({ children }) => {
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
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
                <meta property="og:type" content="website" />
                <meta property="og:title" content={defaultTitle} />
                <meta property="og:description" content={defaultDescription} />
                <meta property="og:image" content={ogImage} />
                <meta property="og:url" content={currentUrl} />
                <meta name="twitter:card" content="summary_large_image" />
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

            <div ref={ref} className="absolute bottom-0 w-full h-10 pointer-events-none" />

            {footerVisible && (
                <Suspense fallback={<div className="text-center py-10">{t("layout.footerLoading")}</div>}>
                    <Footer setIsModalOpen={setIsModalOpen} />
                </Suspense>
            )}

            <StepperModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
};

export default Layout;
