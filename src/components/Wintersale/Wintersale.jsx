import React from "react";
import WintersaleImg from "../../assets/wintersale/Wintersale.png";
import { GrSecure } from "react-icons/gr";
import { IoFastFood } from "react-icons/io5";
import { GiFoodTruck } from "react-icons/gi";

const Wintersale = () => {
  return (
    <div className="min-h-137.5 flex justify-center items-center py-12 mt-20 sm:py-0">
      <div className="container">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          {/* image section  */}
          <div data-aos="zoom-in">
            <img
              src={WintersaleImg}
              alt=""
              className="max-w-100 h-87.5 w-full mx-auto drop-shadow-[-10px_10px_12px_rgba(0,0,0,1)] object-cover"
            />
          </div>
          {/* text detail section  */}
          <div className="flex flex-col justify-center gap-6 sm:pt-0">
            <h1 data-aos="fade-up" className="text-3xl sm:text-4xl font-bold">
              Soldes d'hiver :  jusqu'à 50 % de réduction
            </h1>
            <p
              data-aos="fade-up"
              className="text-sm xs:text text-gray-500 tracking-wide leading-5"
            >
              Renouvelez votre garde-robe avec nos pièces phares de la saison à prix sacrifiés. L'élégance n'a jamais été aussi accessible.
            </p>

            <div className="flex flex-col gap-2">
              {/* Qualité Produits */}
              <div data-aos="fade-up" className="flex items-center gap-4">
                <GrSecure className="text-4xl h-12 w-12 shadow-sm p-4 rounded-full bg-violet-100 dark:bg-violet-400" />
                <p>Produits de qualité</p>
              </div>

              {/* Livraison Rapide */}
              <div data-aos="fade-up" className="flex items-center gap-4">
                <IoFastFood className="text-4xl h-12 w-12 shadow-sm p-4 rounded-full bg-orange-100 dark:bg-orange-400" />
                <p>Livraison rapide</p>
              </div>

              {/* Paiement Facile */}
              <div data-aos="fade-up" className="flex items-center gap-4">
                <GiFoodTruck className="text-4xl h-12 w-12 shadow-sm p-4 rounded-full bg-green-100 dark:bg-green-400" />
                <p>Méthode de paiement facile</p>
              </div>

              {/* Offres */}
              <div data-aos="fade-up" className="flex items-center gap-4">
                <GiFoodTruck className="text-4xl h-12 w-12 shadow-sm p-4 rounded-full bg-yellow-100 dark:bg-yellow-400" />
                <p>Obtenir des offres</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wintersale;
