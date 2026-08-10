import React from "react";

const Banner = ({ title, subtitle, bgImage }) => {
  return (
    <div 
      className="relative w-full h-[300px] sm:h-[420px] md:h-[600px] flex flex-col justify-center items-center text-white mb-10"
      style={{ 
        backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: "no-repeat"
      }}
    >
        <div className="text-center z-0 px-4">
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 uppercase tracking-wider text-center leading-tight">{title}</h1>
      <p className="text-base sm:text-lg md:text-2xl font-medium italic drop-shadow-md">{subtitle}</p>
    </div>
    </div>
  );
};

export default Banner;
