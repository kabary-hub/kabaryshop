import React from "react";

const HeroCard = ({ hero, title, description, handleOrder, priority = false }) => {
  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-10">
      {/* text contain section  */}
      <div className=" flex flex-col justify-center gap-3 pt-12 sm:pt-0 text-center sm:text-left order-2  sm:order-1 relative z-10 px-2">
        <h1
          className="text-3xl sm:text-4xl lg:text-6xl font-bold leading-tight"
          data-aos="fade-up"
          data-aos-duration="300"
          data-aos-delay="300"
        >
          {title}
        </h1>
        <p
          className="text-sm"
          data-aos="fade-up"
          data-aos-duration="500"
          data-aos-delay="100"
        >
          {description}
        </p>
        <div data-aos="fade-up" data-aos-duration="500" data-aos-delay="300">
      <button
  onClick={() => handleOrder({
    title: title,
    id: "PROMO-HERO",
    prix: "Voir en magasin",
  })}
  className="bg-linear-to-r from-primary to-secondary hover:scale-105 duration-200 text-white py-2 px-4 rounded-full"
>
  Commander maintenant
</button>
        </div>
      </div>

      {/* image contain section  */}
      <div className="order-1 sm:order-2">
        <div className="relative z-10" data-aos="zoom-out" data-aos-once="true">
          <img
            src={hero}
            alt=""
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            className="w-56 h-56 sm:w-112.5 sm:h-112.5 sm:scale-125 lg:scale-120 object-contain mx-auto"
          />
        </div>
      </div>
    </div>
  );
};

export default HeroCard;
