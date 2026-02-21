// src/components/ui/LoadingFallback.jsx
import dteLogo from "@/assets/LOGODTE.svg";

const LoadingFallback = ({ type = "spinner", fullScreen = false, className = "" }) => {
    if (type === "skeleton") {
        return <div className="w-full h-[60vh] bg-gray-100 animate-pulse rounded-lg" />;
    }

    const shouldFillViewport = fullScreen || type === "brand";
    const containerClass = [
        "w-full flex items-center justify-center",
        shouldFillViewport ? "min-h-[100dvh]" : "h-[40vh]",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    if (type === "brand") {
        return (
            <div className={`${containerClass} flex-col bg-white font-product`}>
                <img
                    src={dteLogo}
                    alt="DTE"
                    className="w-[180px] mb-8 animate-pulse"
                />
                <div className="w-48 h-[2px] bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full w-1/2 bg-[#00D1FF] animate-pulse" />
                </div>
            </div>
        );
    }

    return (
        <div className={containerClass}>
            <div className="w-6 h-6 border-4 border-gray-300 border-t-transparent rounded-full animate-spin" />
        </div>
    );
};

export default LoadingFallback;
  
