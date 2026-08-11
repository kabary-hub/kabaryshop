import React from "react";
import footerLogo from "../../assets/footer/footerLogo.webp";
import {
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaLocationArrow,
  FaMobileAlt,
  FaWhatsapp,
} from "react-icons/fa";
import { useSettings } from "../../context/SettingsContext";
import { grantAdminAccess } from "../../utils/auth";

// Fond noir uni (l'image de fond a été retirée)
const FooterStyle = {
  backgroundColor: "#000000",
  height: "100%",
  width: "100%",
};

const FooterLinks = [
  {
    title: "Femmes",
    link: "/femmes",
  },
  {
    title: "Hommes",
    link: "/hommes",
  },
  {
    title: "Enfants",
    link: "/enfants",
  },
  {
    title: "Électroniques",
    link: "/electroniques",
  },
  {
    title: "Meubles",
    link: "/meubles",
  },
  {
    title: "Tendances",
    link: "/tendances",
  },
  {
    title: "Ventes & Promotions",
    link: "/ventes",
  },
  {
    title: "Mieux notés",
    link: "/notes",
  },
  {
    title: "Contacts",
    link: "/contacts",
  },
];

const Footer = () => {
  const { settings } = useSettings();

  // Logo : celui des paramètres admin s'il existe, sinon le logo par défaut du footer.
  // → le logo changé dans Paramètres se répercute partout (navbar, emails, footer…).
  const displayLogo = settings.siteLogo || footerLogo;

  const whatsappNumber = String(settings.whatsapp || '').replace(/\D/g, '');
  const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber}` : "#";

  return (
    <div style={FooterStyle} className="min-h-100 text-white">
      <div className='container mx-auto w-full'>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 py-10 pt-5 gap-8 sm:gap-10 font-bold'>
          <div className='py-8 px-4 sm:col-span-2 lg:col-span-2'>
            <h1 className='text-2xl sm:text-3xl font-bold mb-3 flex items-center gap-3'>
              <img src={displayLogo} alt="" className="max-w-12.5" />
              {settings.siteName}
            </h1>
            <p className="rounded-bl-4xl rounded-tr-4xl border-2 border-primary px-10 w-135 py-5 italic">
              Votre destination privilégiée pour une mode authentique et <br /> élégante. Chez {settings.siteName}, nous allions qualité supérieure <br /> et tendances actuelles pour sublimer votre style au quotidien <br /> avec  une touche d'excellence.
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
                  className='cursor-pointer hover:translate-x-1 duration-300 underline text-gray-200 hover:text-primary break-words'
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
                <p className="font-light italic underline cursor-pointer hover:text-secondary text-primary break-all">
                  {settings.siteEmail}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="text-center py-10 px-4 border-t-2 border-gray-300/50 mt-10">
        © {new Date().getFullYear()} {settings.siteName}. Tous droits réservés.
      </p>
      {/* 🔐 Lien secret admin — invisible pour les clients, accessible aux administrateurs.
          Au clic, il pose le jeton d'accès : sans lui, la page /admin/login redirige
          vers l'accueil (l'URL tapée directement ne fonctionne pas). */}
      <div className="text-center pb-4">
        <a
          href="/admin/login"
          onClick={grantAdminAccess}
          className="text-2xl text-primary/40 hover:text-primary/60 transition-colors cursor-default select-none"
          title="Espace administration"
        >
          ·
        </a>
      </div>
    </div>
  );
}

export default Footer;