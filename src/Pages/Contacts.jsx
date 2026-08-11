import React from "react";
import Banner from "../components/Banner/Banner";
import { FaPhone, FaEnvelope, FaWhatsapp, FaMapMarkerAlt } from "react-icons/fa";
import ImgContact from "../assets/background-pages/contact.webp";
import { useSettings } from "../context/SettingsContext";

const Contacts = () => {
  const { settings } = useSettings();
  const whatsappNumber = String(settings.whatsapp || '').replace(/\D/g, '');
  const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber}` : "#";

  return (
    <div className="pt-6">
      <Banner 
        title={settings.contactPageTitle || "Contactez-nous"}
        subtitle={settings.contactPageSubtitle || "Nous sommes à votre écoute pour toute question"}
        bgImage={ImgContact}
      />

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          
          {/* Colonne 1 : Infos de contact */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">
              {settings.contactSectionTitle || "Nos Coordonnées"}
            </h2>
            <div className="flex items-center gap-4">
              <FaPhone className="text-primary text-xl" />
              <p>{settings.sitePhone}</p>
            </div>
            <div className="flex items-center gap-4">
              <FaEnvelope className="text-primary text-xl" />
              <p>{settings.siteEmail}</p>
            </div>
            <div className="flex items-center gap-4">
              <FaMapMarkerAlt className="text-primary text-xl" />
              <p>{settings.siteAddress}</p>
            </div>
            <div className="flex items-center gap-4">
              <FaWhatsapp className="text-green-500 text-xl" />
              <a href={whatsappLink} target="_blank" rel="noreferrer" className="hover:text-primary transition">
                {settings.contactWhatsappNote || "Disponible sur WhatsApp 24h/7j"}
              </a>
            </div>
            
          </div>

          {/* Colonne 2 : Carte de remerciement */}
          <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-2xl">
            <h2 className="text-2xl font-bold mb-4">
              {settings.contactThankTitle || "Merci de votre visite !"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {settings.siteDescription}{' '}
              {settings.contactThankMessage || "N'hésitez pas à nous contacter pour vos commandes spéciales ou pour en savoir plus sur nos délais de livraison."}{' '}
              {settings.deliveryInfo && `(${settings.deliveryInfo}).`}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Contacts;