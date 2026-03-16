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
      className="relative flex h-full w-full items-end justify-center px-2 pt-2 pb-0 md:block md:px-6 md:pt-8 md:pb-0"
      aria-label={`Slide ${title}`}
    >
      <header
        className={`pointer-events-none absolute left-6 top-5 z-20 md:hidden ${titlePositionClass}`}
      >
        <h3 className={`font-google-sans-flex text-[16px] font-bold leading-none md:text-[35px] ${textClass}`}>
          {title}
        </h3>
      </header>

      <div
        className="font-google-sans-flex flex h-full w-full max-w-full flex-col justify-end px-[3px] pt-5 pb-[2px] md:hidden"
      >
        <section className="mt-4 flex w-full items-center justify-center text-left">
          <p className={`font-google-sans-flex max-w-full text-left text-[10px] font-normal leading-[1.06] tracking-[-0.01em] ${textClass}`}>
            {text}
          </p>
        </section>
      </div>

      <div className="pointer-events-none absolute inset-0 z-20 hidden md:flex md:items-center md:justify-between md:px-16 lg:px-20 xl:px-24">
        <div className="flex w-[34%] items-center self-center">
          <h3 className={`font-google-sans-flex text-[35px] font-bold leading-none ${textClass}`}>
            {title}
          </h3>
        </div>

        <div className="flex w-[30%] max-w-[300px] translate-x-[200px] items-center justify-start self-center pr-10 md:mr-8 lg:mr-12 lg:max-w-[340px] xl:mr-16 xl:max-w-[380px]">
          <p className={`font-google-sans-flex text-left text-[15px] font-normal leading-[1.14] tracking-[-0.01em] ${textClass}`}>
            {text}
          </p>
        </div>
      </div>
    </article>
  );
};

export default SlideContent;


