import FadeContent from './FadeContent';

const ServiceCard = ({ title, text, index = 0 }) => {
  const titleClass = index === 0
    ? 'text-4xl md:text-5xl font-bold'
    : 'text-2xl md:text-3xl font-semibold';

  return (
    <FadeContent
      blur
      delay={index * 80}
      stagger={0.15}
      className="mb-16 service-block snap-start rounded-3xl p-6 md:p-8 shadow-md  backdrop-blur-md border border-white/20 hover:scale-[1.015] transition-all duration-500"
    >
      <h2 className={`${titleClass} tracking-tight leading-tight`}>
        {title}
      </h2>
      {text && (
        <p className="text-base md:text-lg text-gray-700/90 leading-relaxed whitespace-pre-line mt-2">
          {text}
        </p>
      )}
    </FadeContent>
  );
};

export default ServiceCard;
