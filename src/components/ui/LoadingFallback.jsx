// src/components/ui/LoadingFallback.jsx
const LoadingFallback = ({ type = "spinner" }) => {
    if (type === "skeleton") {
        return <div className="w-full h-[60vh] bg-gray-100 animate-pulse rounded-lg" />;
    }

    return (
        <div className="flex items-center justify-center h-[40vh]">
            <div className="w-6 h-6 border-4 border-gray-300 border-t-transparent rounded-full animate-spin" />
        </div>
    );
};

export default LoadingFallback;
  