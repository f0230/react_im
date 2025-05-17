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
      className="mb-16 service-block snap-start"
    >
      <h2 className={`${titleClass} tracking-tight leading-tight`}>
        {title}
      </h2>
      {text && (
        <p className="md:text-lg leading-none whitespace-pre-line mt-2">
          {text}
        </p>
      )}
    </FadeContent>
  );
};

export default ServiceCard;
