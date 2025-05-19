import React, { useEffect, useRef } from "react";
import gsap from "gsap";

const PageWrapper = ({ children }) => {
    const wrapperRef = useRef();

    useEffect(() => {
        gsap.fromTo(
            wrapperRef.current,
            {
                opacity: 0,
                y: 40,
                scale: 0.98,
                filter: "blur(8px)",
            },
            {
                opacity: 1,
                y: 0,
                scale: 1,
                filter: "blur(0px)",
                duration: 1.2,
                ease: "power4.out",
            }
        );
    }, []);

    return <div ref={wrapperRef}>{children}</div>;
};

export default PageWrapper;
