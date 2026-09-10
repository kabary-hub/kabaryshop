import React, { memo } from "react";

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
  {
    title: "Suivre ma commande",
    link: "/track-order",
  },
];

const LegalLinks = [
  {
    title: "CGV",
    link: "/cgv",
  },
  {
    title: "Confidentialité",
    link: "/confidentialite",
  },
  {
    title: "Retours",
    link: "/retours",
  },
];

const Footer = memo(() => {
  const { settings } = useSettings();

  // Logo : celui des paramètres admin s'il existe, sinon le logo par défaut public.
  // → le logo changé dans Paramètres se répercute partout (navbar, emails, footer…).
  const displayLogo = settings.siteLogo || "https://kabaryshop.vercel.app/logo2.png";

  const whatsappNumber = String(settings.whatsapp || '').replace(/\D/g, '');
  const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber}` : "#";

  return (
    <div style={FooterStyle} className="min-h-80 text-white">
      <div className='container mx-auto w-full'>
        <div className='flex flex-col sm:flex-row lg:flex-row py-6 pt-4 gap-4 font-bold items-start' style={{ justifyItems: 'center' }}>
          {/* Colonne 1 : Logo + Description — toujours en haut, centrée horizontalement */}
          <div className='py-8 px-4 overflow-hidden w-full sm:w-full lg:w-1/2 flex justify-center'>
            <div className='text-center'>
            <h1 className='text-xl sm:text-2xl font-bold mb-3 flex items-center justify-center gap-3 mx-auto'>
              <img src={displayLogo} alt="" className="max-w-10" />
              {settings.siteName}
            </h1>
            <div className="rounded-bl-4xl rounded-tr-4xl border-2 border-primary px-5 py-4 italic text-sm leading-relaxed break-words w-[100%] mx-auto">
              Votre destination privilégiée pour une mode authentique et élégante. Chez {settings.siteName}, qualité supérieure et tendances actuelles pour sublimer votre style au quotidien.              </div>
            </div>
          </div>

          {/* Ligne 2 : Liens importants (gauche) + Liens sociaux (droite) — côte à côte sur mobile */}
          <div className='flex flex-row w-full gap-0 sm:gap-4 lg:gap-4'>
            {/* Bloc Liens importants — au milieu */}
            <div className='py-2 px-3 w-full sm:w-1/2 flex justify-center'>
              <div className='text-center w-full'>
              <h3 className='text-base text-primary font-bold mb-2'>Liens importants</h3>
              <div className='flex flex-col gap-y-1'>
                {FooterLinks.map((link) => (
                  <a 
                    key={link.title}
                    href={link.link}
                    className='cursor-pointer hover:translate-x-1 duration-300 underline text-gray-400 hover:text-primary text-xs break-words'
                  >
                    {link.title}
                  </a>
                ))}
              </div>
              </div>
            </div>

            {/* Bloc Liens sociaux — tout à droite */}
            <div className='py-2 px-3 w-full sm:w-1/2 flex
            '>
              <div className=' w-full'>
              <h3 className='text-base font-bold mb-2 block'>Liens Sociaux</h3>
              <div className='flex flex-wrap items-center gap-3 mb-3 mt-5'>
                {settings.social?.instagram && <a href={settings.social.instagram} target="_blank" rel="noreferrer"><FaInstagram className="text-3xl hover:text-primary duration-300" /></a>}
                {whatsappLink !== "#" && <a href={whatsappLink} target="_blank" rel="noreferrer"><FaWhatsapp className="text-3xl hover:text-primary duration-300" /></a>}
                {settings.social?.linkedin && <a href={settings.social.linkedin} target="_blank" rel="noreferrer"><FaLinkedin className="text-3xl hover:text-primary duration-300" /></a>}
                {settings.social?.facebook && <a href={settings.social.facebook} target="_blank" rel="noreferrer"><FaFacebook className="text-3xl hover:text-primary duration-300" /></a>}
                {settings.social?.telegram && <a href={settings.social.telegram} target="_blank" rel="noreferrer"><FaLocationArrow className="text-3xl hover:text-primary duration-300" /></a>}
                
              </div>
              
              {/* Infos de contact dynamiques */}
              <div className='flex flex-col mt-7 gap-2'>
                <div className="flex items-center">
                  <p className="text-xs">{settings.siteName}</p>
                </div>
                <div className="flex items-center">
                  <p className="text-xs">{settings.sitePhone}</p>
                </div>
                <div className="flex items-center">
                  <p className="text-xs font-light italic underline cursor-pointer hover:text-secondary text-primary break-all">
                    {settings.siteEmail}
                  </p>                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mentions légales + copyright — une seule ligne horizontale en bas */}
      <div className="flex flex-wrap items-center justify-center gap-4 py-2 px-4 border-t border-gray-700/50 mt-2 text-xs">
        <span className="text-gray-400 font-semibold uppercase tracking-wider">Mentions légales</span>
        <a href="/cgv" className='cursor-pointer hover:translate-x-1 duration-300 underline text-gray-200 hover:text-primary'>CGV</a>
        <a href="/confidentialite" className='cursor-pointer hover:translate-x-1 duration-300 underline text-gray-200 hover:text-primary'>Confidentialité</a>
        <a href="/retours" className='cursor-pointer hover:translate-x-1 duration-300 underline text-gray-200 hover:text-primary'>Retours</a>
        <span className="text-gray-500">|</span>
        <span className="text-gray-500">© {new Date().getFullYear()} {settings.siteName}. Tous droits réservés.</span>
      </div>
      {/* 🔐 Lien secret admin — invisible pour les clients, accessible aux administrateurs.
          Au clic, il pose le jeton d'accès : sans lui, la page /admin/login redirige
          vers l'accueil (l'URL tapée directement ne fonctionne pas). */}
      <div className="text-center">
        <a
          href="/admin/login"
          onClick={grantAdminAccess}
          className="text-2xl text-primary/20 hover:text-primary/60 transition-colors cursor-default select-none"
          title="Espace administration"
        >
          ·
        </a>
      </div>    </div>
  );
});
export default Footer;