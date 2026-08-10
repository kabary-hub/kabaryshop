import React from "react";
import footerLogo from "../../assets/footer/footerLogo.png";
import {
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaLocationArrow,
  FaMobileAlt,
  FaWhatsapp,
} from "react-icons/fa";
import { useSettings } from "../../context/SettingsContext";

// Fond noir uni (l'image de fond a été retirée)
const FooterStyle = {
  backgroundColor: "#000000",
  height: "100%",
  width: "100%",
};

const FooterLinks = [
  {
    title: "Homme",
    link: "/hommes",
  },
  {
    title: "Mieux notés",
    link: "/notes",
  },
  {
    title: "Enfants",
    link: "/enfants",
  },
  {
    title: "Femmes",
    link: "/femmes",
  },
  {
    title: "Électroniques",
    link: "/electroniques",
  },
  {
    title: "Contacts",
    link: "/contacts",
  },
  {
    title: "Vêtements sur la tendance",
    link: "/tendances",
  },
  {
    title: "Meilleurs vente",
    link: "/ventes",
  },
  {
    title: "Nouvelle tendances",
    link: "/tendances",
  },
];

const Footer = () => {
  const { settings } = useSettings();

  const whatsappNumber = String(settings.whatsapp || '').replace(/\D/g, '');
  const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber}` : "#";

  return (
    <div style={FooterStyle} className="min-h-100 text-white">
      <div className='container mx-auto w-full'>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 py-10 pt-5 gap-10 font-bold'>
          <div className='py-8 px-4'>
            <h1 className='text-3xl font-bold mb-3 flex items-center gap-3'>
              <img src={footerLogo} alt="" className="max-w-12.5" />
              {settings.siteName}
            </h1>
            <p className="rounded-bl-4xl rounded-tr-4xl border-2 border-primary px-5 py-5 italic">
              Votre destination privilégiée pour une mode authentique et élégante. Chez {settings.siteName}, nous allions qualité supérieure et tendances actuelles pour sublimer votre style au quotidien avec une touche d'excellence.
            </p>
          </div>

          {/* Colonne 2 : Liens Importants */}
          <div className='py-8 px-4'>
            <h1 className='text-xl md:text-2xl text-primary font-bold mb-3'>Liens importants</h1>
            <ul className='flex flex-col gap-3'>
              {FooterLinks.map((link) => (
                <a 
                  key={link.title}
                  href={link.link}
                  className='cursor-pointer hover:translate-x-1 duration-300 underline text-gray-200 hover:text-primary'
                >
                  {link.title}
                </a>
              ))}
            </ul>
          </div>
          
          <div className='py-8 px-4'>
            <h1 className='text-xl md:text-2xl font-bold text-primary mb-3'>Liens Important </h1>
            <ul className='flex flex-col gap-3'>
              {FooterLinks.map((link) => (
                <a 
                  key={link.title}
                  href={link.link}
                  className='cursor-pointer hover:translate-x-1 underline duration-300 text-gray-200 hover:text-primary'
                >
                  {link.title}
                </a>
              ))}
            </ul>
          </div>

          {/* Colonne 3 : Réseaux Sociaux & Contact */}
          <div className='py-8 px-4'>
            <h1 className='text-xl font-bold mb-3'>Liens Sociaux</h1>
            <div className='flex flex-wrap items-center gap-3 mb-6'>
              {settings.social?.instagram && <a href={settings.social.instagram} target="_blank" rel="noreferrer"><FaInstagram className="text-3xl hover:text-primary hover:text-5xl duration-300" /></a>}
              {whatsappLink !== "#" && <a href={whatsappLink} target="_blank" rel="noreferrer"><FaWhatsapp className="text-3xl hover:text-primary hover:text-5xl duration-300" /></a>}
              {settings.social?.linkedin && <a href={settings.social.linkedin} target="_blank" rel="noreferrer"><FaLinkedin className="text-3xl hover:text-primary hover:text-5xl duration-300" /></a>}
              {settings.social?.facebook && <a href={settings.social.facebook} target="_blank" rel="noreferrer"><FaFacebook className="text-3xl hover:text-primary hover:text-5xl duration-300" /></a>}
              {settings.social?.telegram && <a href={settings.social.telegram} target="_blank" rel="noreferrer"><FaLocationArrow className="text-3xl hover:text-primary hover:text-5xl duration-300" /></a>}
              <a href="#"><FaMobileAlt className="text-3xl hover:text-primary hover:text-5xl duration-300" /></a>
            </div>
            
            {/* Infos de contact dynamiques */}
            <div className='flex flex-col gap-3'>
              <div className="flex items-center">
                <p>{settings.siteName}</p>
              </div>
              <div className="flex items-center">
                <p>{settings.sitePhone}</p>
              </div>
              <div className="flex items-center">
                <p className="font-light italic underline cursor-pointer hover:text-secondary text-primary">
                  {settings.siteEmail}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="text-center py-10 border-t-2 border-gray-300/50 mt-10">
        © {new Date().getFullYear()} {settings.siteName}. Tous droits réservés.
      </p>
    </div>
  );
}

export default Footer;