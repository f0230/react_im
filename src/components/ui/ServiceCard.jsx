import FadeContent from './FadeContent';

const ServiceCard = ({ title, text, index = 0, bg = '#ffffff', customTitle = null }) => {
  const titleClass = index === 0
    ? 'text-4xl md:text-5xl font-bold'
    : 'text-2xl md:text-3xl font-semibold';

  // ✅ Si es el primero y no tiene título, agrandamos el texto
  const textClass =
    index === 0 && !title
      ? 'text-xl md:text-2xl leading-tight font-medium'
      : 'md:text-lg leading-none';

  return (
    <FadeContent
      blur
      delay={index}
      stagger={0.15}
      className="md:mb-4 mb-4 service-block snap-start p-5 bg-white/30 backdrop-blur-xl 
                 rounded-xl border border-white/35 animate-borderPulse transition-all duration-700 ease-in-out hover:border-white/30
                 shadow-md md:hover:shadow-xl"
    >
      {index === 0 && customTitle ? (
        <div className="mb-2">{customTitle}</div>
      ) : title ? (
        <h2 className={`${titleClass} tracking-tight leading-tight`}>
          {title}
        </h2>
      ) : null}

      {text && (
        <p className={`${textClass} whitespace-pre-line mt-2`}>
          {text}
        </p>
      )}
    </FadeContent>
  );
};

export default ServiceCard;
