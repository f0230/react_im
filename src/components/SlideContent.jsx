// SlideContent.jsx optimizado
const SlideContent = ({ title, text, textColor = 'white' }) => {
  const textClass = textColor === 'white' ? 'text-white' : 'text-black';
  const rounded = 'rounded-[20px]';
  const glassClass = textColor === 'white'
    ? 'bg-black/24 shadow-[0_18px_50px_rgba(0,0,0,0.26)]'
    : 'bg-white/45 shadow-[0_18px_50px_rgba(0,0,0,0.16)]';

  return (
    <article
      className={`flex flex-col md:flex-row justify-center items-center text-center md:text-left w-full max-w-[92%] sm:w-[500px] md:max-w-none md:w-[620px] lg:w-[800px] p-2 md:p-6`}
      aria-label={`Slide ${title}`}
    >
      <div
        className={`w-full flex flex-col md:flex-row justify-center items-center text-center md:text-left backdrop-blur-2xl supports-[backdrop-filter]:backdrop-blur-2xl ${glassClass} ${rounded} px-4 py-4 md:px-7 md:py-6`}
      >
        <header className="flex items-center justify-center md:justify-start w-full md:w-1/2 mb-4 md:mb-0">
          <h3 className={`font-product text-[28px] md:text-[37px] font-normal ${textClass}`}>{title}</h3>
        </header>
        <section className="flex items-center w-full md:w-1/2">
          <p className={`font-product text-[12px] md:text-[17px] font-normal leading-[1.16] md:leading-[1.24] ${textClass}`}>{text}</p>
        </section>
      </div>
    </article>
  );
};

export default SlideContent;


