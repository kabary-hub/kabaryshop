import React from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useSettings } from "../../context/SettingsContext";



const testimonialData = [
  {
    id: 1,
    name: "Adama Hawa Camara",
    text: "Enfin une boutique où je peux m'habiller et habiller mes enfants au même endroit sans sacrifier le style. Kabary Shop est devenu mon rendez-vous shopping mensuel.",
    img: "/testimon1.jpeg",
  },
  {
    id: 2,
    name: "Kabary mo Rougui",
    text: "En tant qu'homme, j'apprécie la rapidité du service et la qualité des costumes. L'élégance est vraiment au rendez-vous et surtout la livraison rapide.",
    img: "/testimon2.jpeg",
  },
  {
    id: 3,
    name: "Oumou Diop",
    text: "J'ai trouvé la robe de mariage de mes rêves ici. La qualité du tissu est exceptionnelle et les finitions sont dignes d'une grande maison.",
    img: "/testimon3.jpeg",
  },
  {
    id: 4,
    name: "DG Kabary Multiservices",
    text: "Le rayon 'Le meilleur pour vos petits bouts' est une merveille. Les vêtements sont doux, résistants et très mignons. Je recommande vivement.",
    img: "/testimon4.jpeg",
  },
  {
    id: 5,
    name: "Boubacar Kabary Baldé",
    text: "Kabary Shop, c'est vraiment le shopping sans limites. Je trouve toujours des pièces uniques que je ne vois nulle part ailleurs en ville.",
    img: "/testimon5.jpeg",
  },
  {
    id: 6,
    name: "DG/A KMS",
    text: "Les hauts talons que j'ai achetés pour mon mariage sont non seulement magnifiques, mais étonnamment confortables !",
    img: "/testimon6.jpeg",
  },
  {
    id: 7,
    name: "Zainab",
    text: "Une expérience d'achat fluide. Les articles correspondent exactement aux photos du site. Kabary Shop ne déçoit jamais.",
    img: "/testimon7.jpeg",
  },
  {
    id: 8,
    name: "Kadiatou",
    text: "Le service client est exceptionnel. Ils m'ont aidée à choisir la taille parfaite pour ma robe de soirée.",
    img: "/testimon11.jpeg",
  },
  {
    id: 9,
    name: "Aïssatou",
    text: "Des accessoires chics qui font toute la différence. Ma nouvelle pochette Kabary Shop fait fureur au bureau.",
    img: "/testimon9.jpeg",
  },
  {
    id: 10,
    name: "Moussa",
    text: "Qualité premium pour les chemises. C'est devenu ma boutique préférée pour mes tenues professionnelles.",
    img: "/testimon10.jpeg",
  },
  {
    id: 11,
    name: "Julie",
    text: "Rapide, fiable et très stylé. Le concept de Kabary Shop est exactement ce qu'il nous fallait.",
    img: "/testimon12.jpeg",
  },
  {
    id: 12,
    name: "Karim",
    text: "Le shopping sans limites porte bien son nom. Un choix immense et une qualité constante.",
    img: "/testimon8.jpeg",
  },
];

const Testimonial = () => {
  // Paramètres du site (le slider react-slick a déjà une variable « settings »)
  const { settings: siteSettings } = useSettings();
  const siteName = siteSettings.siteName || "Kabary Shop";

  const SliderComponent = Slider.default ? Slider.default : Slider;


  const settings = {
    dots: true,
    arrows: false,
    infinite: true,
    speed: 3500,
    slidesToScroll: 1,
    slidesToShow: 4,
    rows: 2,
    autoplay: true,
    autoplaySpeed: 0,
    cssEase: "ease-in-out",
    pauseOnHover: true,
    pauseOnFocus: true,
    responsive: [
      {
        breakpoint: 10000,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  return (
    
    <div id="temoignages" className="py-10 mb-25">
      <div className="px-4 sm:px-10 w-full mx-auto">
        <div className="py-5 text-center mb-10 max-w-150 mx-auto rounded-tl-full rounded-br-full  dark:bg-primary/40">
          <p className="text-sm sm:text-xl font-bold text-primary" data-aos="fade-up">
            Ce que nos clients disent
          </p>
          <h1 className="text-3xl font-bold" data-aos="fade-up">
            Témoignages
          </h1>
        </div>

        {/* Section Slider */}
        <div data-aos="zoum-in ">
          <SliderComponent {...settings}>
            {testimonialData.map((data) => (
              <div key={data.name} className=" my-6">
                <div className="flex flex-col gap-2 shadow-lg py-8 px-6 mx-4 rounded-xl dark:bg-gray-800  bg-primary/2 relative min-h-50">
                  <div>
                    <img
                      src={data.img}
                      alt=""
                      className="rounded-full w-16 h-16 object-cover border-4 border-white shadow-sm"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div>
                      {/* Le nom de la boutique dans les témoignages suit les paramètres du site */}
                      <p className="text-sm text-gray-700 dark:text-white ">
                        {data.text.replace(/Kabary Shop/g, siteName)}
                      </p>
                      <h1 className="text-xl font-bold text-black/80 dark:text-white">
                        {data.name}
                      </h1>
                    </div>
                  </div>
                  {/* Les guillemets décoratifs */}
                  <p className="text-black/8 dark:text-white/15 text-9xl font-serif absolute top-7.5 right-4 pointer-events-none">
                    ,,
                  </p>
                </div>
              </div>
            ))}
          </SliderComponent>
        </div>
      </div>
    </div>
  );
};
export default Testimonial;
