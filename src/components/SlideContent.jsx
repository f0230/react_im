// SlideContent.jsx optimizado
const SlideContent = ({
  title,
  text,
  textColor = 'white',
  titlePositionClass = '',
}) => {
  const textClass = textColor === 'white' ? 'text-white' : 'text-black';

  return (
    <article
      className="relative flex h-full w-full items-end justify-center px-2 pt-2 pb-0 md:px-6 md:pt-6 md:pb-0"
      aria-label={`Slide ${title}`}
    >
      <header
        className={`pointer-events-none absolute left-6 top-5 z-20 md:left-auto md:top-auto ${titlePositionClass}`}
      >
        <h3 className={`font-google-sans-flex text-[34px] font-bold leading-none ${textClass} md:text-[60px]`}>
          {title}
        </h3>
        </header>

      <div
        className="font-google-sans-flex flex h-full w-full max-w-full flex-col justify-end px-[3px] pt-5 pb-[2px] md:max-w-[1280px] md:px-10 md:pt-6 md:pb-[2px]"
      >
        <section className="mt-4 flex w-full items-center justify-center text-left md:mt-4 md:text-center">
          <p className={`font-google-sans-flex max-w-full text-left text-[10px] font-normal leading-[1.06] tracking-[-0.01em] md:max-w-[1320px] md:text-center md:text-[17px] md:leading-[1.12] ${textClass}`}>
            {text}
          </p>
        </section>
      </div>
    </article>
  );
};

export default SlideContent;


