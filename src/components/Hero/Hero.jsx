import React, { useEffect, useState } from "react";
import { useSettings } from "../../context/SettingsContext";
import hero from "../../assets/hero/hero.png";
import hero1 from "../../assets/hero/hero1.png";
import hero2 from "../../assets/hero/hero2.png";
import hero3 from "../../assets/hero/hero3.png";
import hero4 from "../../assets/hero/hero4.png";
import hero5 from "../../assets/hero/hero5.png";
import hero6 from "../../assets/hero/hero6.png";
import hero7 from "../../assets/hero/hero7.png";
import hero8 from "../../assets/hero/hero8.png";
import hero9 from "../../assets/hero/hero9.png";
import HeroCard from "./HeroCard";

// import Slider from "react-slick";
// liste table image qui slide

const ImageList = [
  {
    id: 1,
    img: hero,
    title: "50 % de réduction sur tous les vêtements pour hommes",
    description:
      "Profitez de nos offres exclusives sur toute la gamme homme pour parfaire votre style, des tenues de cérémonie aux indispensables du quotidien.",
  },
  {
    id: 2,
    img: hero1,
    title: "Offre Spéciale : Équipez votre chambre à prix réduit",
    description:
      "Des lits élégants et des matelas orthopédiques de haute qualité pour des nuits paisibles. La qualité Kabary Shop au service de votre sommeil.",
  },
  {
    id: 3,
    img: hero2,
    title: "Soldes à -70 %",
    description:
      "Mettez à jour votre garde-robe avec nos dernières nouveautés masculines. Le style haut de gamme est enfin à votre portée.",
  },
  {
    id: 4,
    img: hero3,
    title:
      "45 % de réduction sur tous les produits ! Offre valable aujourd'hui.",
    description:
      "Profitez de nos offres exclusives sur toute la gamme homme pour parfaire votre style, des tenues de cérémonie aux indispensables du quotidien.",
  },
  {
    id: 5,
    img: hero4,
    title: "75 % de réduction sur les produits en solde en février",
    description:
      "C'est le moment ou jamais ! Profitez d'une remise historique de 75 % sur une large sélection d'articles pour vider nos stocks de février.",
  },
  {
    id: 6,
    img: hero5,
    title: "15 % de réduction sur tous les costumes",
    description:
      "15 % de remise immédiate pour vous offrir la qualité Kabary Shop au prix le plus compétitif sur le marché. Ne laissez pas passer ces pépites .",
  },
  {
    id: 7,
    img: hero6,
    title: "15 % de réduction sur tous les talons de mariage",
    description:
      "15 % de remise immédiate pour vous offrir la qualité Kabary Shop au prix le plus compétitif sur le marché.",
  },
  {
    id: 8,
    img: hero7,
    title: "30 % de réduction sur tous les achats feminin",
    description:
      "Du streetwear aux coupes classiques, bénéficiez de 30 % de remise sur une sélection de pièces tendance féminine chez Kabary Shop.",
  },
  {
    id: 9,
    img: hero8,
    title: "30 % de réduction sur tous les vêtements pour femmes",
    description:
      " Du streetwear aux coupes classiques, bénéficiez de 30 % de remise sur une sélection de pièces tendance chez Kabary Shop.",
  },
    {
    id: 10,
    img: hero9,
title: "Nouvelle Collection Électroménager : Livraison gratuite incluse",
  description: "Profitez de prix de lancement sur nos lave-linges dernière génération. Kabary Shop s'occupe de tout, de la commande à votre domicile.",
},
];

// Animation slider

// Remplace le nom de la boutique codé en dur dans les textes par défaut par
// le nom défini dans les Paramètres (settings.siteName).
const withBrand = (str, siteName) =>
  String(str || "").replace(/Kabary Shop/g, siteName || "Kabary Shop");

const Hero = ({ handleOrder }) => {
  const { settings } = useSettings();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);

  // Si l'admin a personnalisé la bannière héro dans les paramètres, on affiche
  // SES publications à la place du carrousel par défaut :
  //   1) la liste de diapositives (Paramètres → Bannière héro), si elle contient
  //      au moins une publication (jusqu'à 10) ;
  //   2) sinon, l'ancienne promotion unique (heroImage / heroTitle / heroSubtitle).
  const customSlides = (Array.isArray(settings.heroSlides) ? settings.heroSlides : [])
    .filter((s) => s && (s.image || s.title || s.description));
  const hasCustomHero = customSlides.length > 0 || Boolean(settings.heroImage);

  const displayList = customSlides.length
    ? customSlides.map((s, i) => ({
        id: s.id || `custom-${i}`,
        img: s.image || "",
        title: s.title || "Offre spéciale",
        description: s.description || "",
      }))
    : hasCustomHero
      ? [{
          id: "custom",
          img: settings.heroImage,
          title: settings.heroTitle || `Offre spéciale ${settings.siteName || "Kabary Shop"}`,
          description:
            settings.heroSubtitle ||
            "Découvrez nos promotions du moment : des réductions exceptionnelles sur une large sélection d'articles.",
        }]
      : ImageList.map((item) => ({
          ...item,
          title: withBrand(item.title, settings.siteName),
          description: withBrand(item.description, settings.siteName),
        }));
  const extendeList = hasCustomHero ? displayList : [...displayList, displayList[0]];

  useEffect(() => {
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setCurrentIndex((prevIndex) => prevIndex + 1);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (currentIndex === extendeList.length - 1) {
      const jumpTimer = setTimeout(() => {
        setIsTransitioning(false);
        setCurrentIndex(0);
      }, 600); // 700ms correspond à ta duration-700
      return () => clearTimeout(jumpTimer);
    }
  }, [currentIndex, extendeList.length]);
  return (
    <div className="relative overflow-hidden bg-gray-100 flex min-h-[480px] sm:min-h-[650px] items-center justify-center dark:bg-gray-950 dark:text-white duration-200">
      {/* background pattern inclinaison du carré*/}
      <div className="bg-linear-to-r from-primary/20 to-secondary h-175 w-225 absolute -top-1/2 right-10 rounded-3xl rotate-25 hidden md:block"></div>

      {/* grand container section hero */}
      <div className="w-full pb-8 px-4 sm:px-5 sm:pb-0">
        {/* Le contenu de mon slider */}
        <div className="relative overflow-hidden w-full h-full">
          <div
            className={`flex ${isTransitioning ? "transition-transform duration-700 ease-in-out" : ""}`}
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {extendeList.map((item, index) => (
              <div key={index} className="min-w-full w-full">
                <HeroCard
                  hero={item.img}
                  title={item.title}
                  description={item.description}
                  handleOrder={handleOrder}
                  priority={index === 0}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
