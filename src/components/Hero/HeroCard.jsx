import React from "react";

const HeroCard = ({ hero, title, description, handleOrder, priority = false }) => {
  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10">
      {/* text contain section  */}
      <div className=" flex flex-col justify-center gap-3 pt-10 sm:pt-0 text-center sm:text-left order-2  sm:order-1 relative z-10 px-2">
        <h1
          className="text-2xl sm:text-4xl lg:text-6xl font-bold leading-tight"
          data-aos="fade-up"
          data-aos-duration="300"
          data-aos-delay="300"
        >
          {title}
        </h1>
        <p
          className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-xl mx-auto sm:mx-0"
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
  className="bg-linear-to-r from-primary to-secondary hover:scale-105 duration-200 text-white py-2.5 px-6 rounded-full"
>
  Commander maintenant
</button>
        </div>
      </div>

      {/* image contain section  */}
      <div className="order-1 sm:order-2">
        <div className="relative z-10" data-aos="zoom-out" data-aos-once="true">
          {hero ? (
            <img
              src={hero}
              alt=""
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={priority ? "high" : "auto"}
              onError={(e) => { e.target.style.display = "none"; }}
              className="w-44 h-44 sm:w-112.5 sm:h-112.5 sm:scale-125 lg:scale-120 object-contain mx-auto"
            />
          ) : (
            /* Aucune image fournie (publication personnalisée sans image) :
               pastille décorative pour garder une mise en page équilibrée */
            <div className="w-44 h-44 sm:w-112.5 sm:h-112.5 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 mx-auto" />
          )}
        </div>
      </div>
    </div>
  );
};

export default HeroCard;
