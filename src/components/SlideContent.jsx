// SlideContent.jsx optimizado
const SlideContent = ({ title, text, textColor = 'white' }) => {
  const textClass = textColor === 'white' ? 'text-white' : 'text-black';

  return (
    <article
      className="flex h-full w-full items-end justify-center p-2 md:p-6"
      aria-label={`Slide ${title}`}
    >
      <div
        className="font-google-sans-flex flex w-full max-w-[96%] flex-col items-center px-5 pt-5 pb-[4px] md:max-w-[1280px] md:px-10 md:pt-6 md:pb-[4px]"
      >
        <header className="flex w-full items-center justify-center text-center">
          <div className="w-full max-w-[1180px] text-left">
          <h3 className={`text-[28px] font-normal ${textClass} md:text-[35px]`}>
            {title}
          </h3>
          </div>
        </header>
        <section className="mt-6 flex w-full items-center justify-center text-center md:mt-5">
          <p className={`max-w-[1180px] text-center text-[14px] font-normal leading-[1.3] ${textClass}`}>
            {text}
          </p>
        </section>
      </div>
    </article>
  );
};

export default SlideContent;


