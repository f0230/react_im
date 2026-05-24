// Layout.jsx
import React, { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useInView } from "react-intersection-observer";
import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import { organizationSchema, professionalServiceSchema, websiteSchema } from "@/config/seo";

const Footer = lazy(() => import("@/components/Footer"));

const Layout = ({ children, noFooter = false, seo = {} }) => {
    const { t } = useTranslation();
    const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
    const [footerVisible, setFooterVisible] = useState(false);

    const { pathname } = useLocation();
    const defaultTitle = t("layout.seo.defaultTitle");
    const defaultDescription = t("layout.seo.defaultDescription");
    const structuredData = [
        organizationSchema,
        professionalServiceSchema,
        websiteSchema,
        ...(Array.isArray(seo.structuredData) ? seo.structuredData : [seo.structuredData]),
    ].filter(Boolean);

    useEffect(() => {
        if (inView) setFooterVisible(true);
    }, [inView]);

    return (
        <div className="w-full overflow-x-hidden max-w-[1920px] mx-auto relative min-h-screen flex flex-col">
            <SEO
                title={seo.title || defaultTitle}
                description={seo.description || defaultDescription}
                image={seo.image}
                url={seo.url || pathname}
                type={seo.type}
                robots={seo.robots}
                structuredData={structuredData}
            />

            <Navbar />
            <div className="flex min-h-screen flex-col lg:pl-[80px]">
                <main className="flex-grow md:pt-[45px] lg:pt-0" role="main">{children}</main>

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
        </div>
    );
};

export default Layout;
