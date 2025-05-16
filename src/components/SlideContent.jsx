const SlideContent = ({ title, text, textColor = 'white' }) => {
  const textClass = textColor === 'white' ? 'text-white' : 'text-black';
  const rounded = 'rounded-[20px]';

  return (
    <div className={`flex flex-col md:flex-row justify-center items-center text-center md:text-left w-full sm:w-[500px] md:w-[620px] lg:w-[800px] p-6  ${rounded} backdrop-blur-sm`}>
      <div className="flex items-center w-full md:w-1/2 mb-4 md:mb-0">
        <h3 className={`text-[28px] md:text-[37px] font-bold ${textClass}`}>{title}</h3>
      </div>
      <div className="flex items-center w-full md:w-1/2">
        <p className={`text-[14px] md:text-[17px] leading-snug ${textClass}`}>{text}</p>
      </div>
    </div>
  );
};

export default SlideContent;
