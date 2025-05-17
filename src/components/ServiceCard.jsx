// components/ui/ServiceCard.jsx
const ServiceCard = ({ title, text }) => (
    <div className="rounded-2xl p-6 shadow-md bg-white/60 backdrop-blur-md transition-transform hover:scale-[1.01] hover:shadow-xl">
        <h2 className="text-xl md:text-2xl font-bold mb-2 leading-tight">{title}</h2>
        {text && (
            <p className="text-base font-normal text-gray-800 leading-relaxed whitespace-pre-line">
                {text}
            </p>
        )}
    </div>
);

export default ServiceCard;
