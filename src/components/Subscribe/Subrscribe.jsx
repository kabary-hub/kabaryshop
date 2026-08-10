import React, { useRef, useState } from "react";
import SubscribeImage from "../../assets/website/banner.jpeg";
import {
  addSubscriber,
  markDeviceSubscribed,
} from "../../utils/subscribers";
import {
  sendEmail,
  getSiteName,
  buildNewsletterConfirmationEmail,
} from "../../utils/emailService";
import { logActivity } from "../../utils/history";

// Grande image d'un site e-commerce propre : attire l'œil et donne envie de
// revenir se connecter régulièrement. Fallback : image locale du site.
const ECOMMERCE_SHOWCASE_IMAGE =
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=80";

const Subrscribe = () => {
  const formNewsletter = useRef();
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [message, setMessage] = useState("");

  const subscribeNewsletter = (e) => {
    e.preventDefault();
    setStatus("sending");
    setMessage("");

    // 1. Enregistrer l'abonné localement (liste utilisée pour les notifications)
    const email = formNewsletter.current?.user_email?.value || "";
    addSubscriber(email);
    markDeviceSubscribed();

    // Journal central : nouvel abonnement newsletter
    logActivity({
      type: "subscriber",
      action: "abonnement",
      subject: email,
      details: "Nouvel abonné à la newsletter depuis le site public",
      actor: { name: email.split("@")[0] || email, role: "Client" },
    });

    // 2. Email de confirmation (Resend via la fonction Vercel)
    const siteName = getSiteName();
    sendEmail({
      to: email,
      toName: email.split("@")[0] || email,
      fromName: siteName,
      subject: `Bienvenue sur ${siteName} 👋`,
      html: buildNewsletterConfirmationEmail({ siteName, email }),
    })
      .then((res) => {
        // Même si l'email échoue, l'abonnement local est conservé
        setStatus("success");
        setMessage(
          res.ok
            ? "Merci ! Vous recevrez nos nouveaux arrivages par email."
            : "Merci ! Votre abonnement est enregistré. Vous serez informé des nouveaux arrivages.",
        );
        e.target.reset(); // Vide le champ après l'envoi
      })
      .catch(() => {
        // Erreur réseau : l'abonnement local est conservé
        setStatus("success");
        setMessage(
          "Merci ! Votre abonnement est enregistré. Vous serez informé des nouveaux arrivages.",
        );
        e.target.reset();
      })
      .finally(() => setStatus("idle"));
  };

  return (
    <div
      data-aos="zoom-in"
      className="mb-20 drop-shadow-[0px_15px_12px_rgba(0,0,0,0.4)] text-white"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[420px] overflow-hidden rounded-3xl shadow-2xl">
        {/* Grande image e-commerce : impressionnante et propre */}
        <div className="relative h-64 lg:h-auto">
          <img
            src={ECOMMERCE_SHOWCASE_IMAGE}
            alt="Boutique en ligne moderne Kabary Shop"
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = SubscribeImage;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-2xl sm:text-3xl font-extrabold drop-shadow-lg">
              {"Une expérience shopping élégante & moderne"}
            </p>
            <p className="text-sm text-white/90 mt-1 drop-shadow">
              Qualité, tendances et livraison rapide — rejoignez des milliers de clients satisfaits.
            </p>
          </div>
        </div>

        {/* Formulaire d'inscription sur fond sombre élégant */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md space-y-6">
            <h1 className="text-2xl sm:text-3xl font-bold">
              Soyez informé des nouveaux arrivages
            </h1>
            <p className="text-sm text-white/70">
              Inscrivez-vous gratuitement pour recevoir nos meilleures offres et
              les nouveautés directement dans votre boîte mail.
            </p>
            <form
              ref={formNewsletter}
              onSubmit={subscribeNewsletter}
              className="w-full"
            >
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  name="user_email"
                  data-aos="fade-up"
                  type="email"
                  required
                  placeholder="Entrer votre email..."
                  className="w-full p-3 text-black bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  data-aos="fade-up-left"
                  type="submit"
                  disabled={status === "sending"}
                  className="bg-gradient-to-r from-primary to-secondary hover:scale-105 hover:text-black duration-200 text-white px-6 py-3 rounded-md cursor-pointer disabled:opacity-60 disabled:scale-100 font-semibold"
                >
                  {status === "sending" ? "Envoi..." : "S'abonner"}
                </button>
              </div>
              {message && (
                <p
                  role={status === "error" ? "alert" : "status"}
                  className={`mt-3 text-sm text-center sm:text-left font-medium ${
                    status === "error" ? "text-red-300" : "text-green-300"
                  }`}
                >
                  {message}
                </p>
              )}
            </form>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/60">
              <span className="flex items-center gap-1.5">✓ Livraison 24h/48h</span>
              <span className="flex items-center gap-1.5">✓ Paiement Mobile Money</span>
              <span className="flex items-center gap-1.5">✓ Qualité garantie</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subrscribe;
