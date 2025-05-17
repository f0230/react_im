import FadeContent from './FadeContent';

const ServiceCard = ({ title, text, index = 0, bg = '#ffffff' }) => {
  const titleClass = index === 0
    ? 'text-4xl md:text-5xl font-bold'
    : 'text-2xl md:text-3xl font-semibold';


    
    return (
    <FadeContent
      blur
      delay={index * 80}
      stagger={0.15}
      className="md:mb-6 mb-4 service-block backdrop-contrast-100 snap-start p-5"
      data-bg={bg} // ✅ ahora usa el color como atributo
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
