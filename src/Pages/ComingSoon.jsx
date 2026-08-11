// src/Pages/ComingSoon.jsx
// Écran « Ouverture prochaine » — affiché à la place du site quand le mode
// d'attente est actif (bascule en 1 clic depuis Admin → sidebar).
// Si une date d'ouverture automatique est planifiée, un compte à rebours
// s'affiche jusqu'au lancement du site.
import React, { useEffect, useState } from "react";
import { useSettings } from "../context/SettingsContext";
import { getTimeUntilOpen, formatOpenDate } from "../utils/visibility";

const ComingSoon = () => {
  const { settings } = useSettings();
  const siteName = settings.siteName || "Kabary Shop";
  const facebookUrl =
    settings.social?.facebook || "https://www.facebook.com/boubacarelbalde";

  // Compte à rebours (rafraîchi chaque minute) vers l'ouverture planifiée.
  // Timer inactif quand aucune date n'est planifiée.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!settings.scheduledOpenDate) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, [settings.scheduledOpenDate]);
  const remaining = getTimeUntilOpen(settings.scheduledOpenDate, now);
  const openDateLabel = formatOpenDate(settings.scheduledOpenDate);

  return (
    <>
      <style>{`
        /* Écran « Ouverture prochaine » — CSS autonome, aucune dépendance */
        .coming-soon {
          position: relative;
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 1rem;
          overflow: hidden;
          /* Couleur de secours (le panorama est dans .cs-bg ci-dessous) */
          background: #0b0f1a;
          color: #ffffff;
          font-family: "Segoe UI", system-ui, -apple-system, Arial, sans-serif;
          text-align: center;
        }
        /* Calque panorama : photo + voile, animé en zoom très lent */
        .cs-bg {
          position: absolute; inset: 0; z-index: 0;
          background:
            linear-gradient(135deg, rgba(5, 10, 20, 0.48) 0%, rgba(8, 14, 26, 0.54) 55%, rgba(5, 8, 16, 0.62) 100%),
            url('/conakry-panorama.jpg') center / cover no-repeat;
          /* Zoom avant lent, une seule fois, puis maintien (aucun dézoom) */
          animation: cs-zoom 60s ease-out forwards;
          transform-origin: center;
          will-change: transform;
          pointer-events: none;
        }
        @keyframes cs-zoom {
          from { transform: scale(1); }
          to   { transform: scale(1.08); }
        }
        .coming-soon * { margin: 0; box-sizing: border-box; }
        .cs-glow { position: absolute; border-radius: 9999px; filter: blur(90px); pointer-events: none; }
        .cs-glow-1 { width: 26rem; height: 26rem; left: -8rem; top: -8rem; background: rgba(22, 163, 74, 0.25); }
        .cs-glow-2 { width: 26rem; height: 26rem; right: -8rem; bottom: -8rem; background: rgba(245, 158, 11, 0.18); }
        .cs-ring {
          position: absolute; left: 50%; top: 50%; width: 34rem; height: 34rem;
          transform: translate(-50%, -50%);
          border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 9999px;
          pointer-events: none;
        }
        .cs-inner { position: relative; z-index: 1; max-width: 42rem; width: 100%; }
        .cs-inner h1, .cs-inner p { text-shadow: 0 2px 14px rgba(0, 0, 0, 0.65); }
        .cs-logo {
          width: 7.5rem; height: 7.5rem; margin: 0 auto 1.75rem;
          display: flex; align-items: center; justify-content: center;
          border-radius: 1.4rem;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 22px 50px -14px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.14) inset;
          padding: 0.5rem;
          overflow: hidden;
        }
        .cs-logo img {
          width: 100%; height: 100%; object-fit: contain; display: block;
        }
        .cs-name { font-size: clamp(2.2rem, 6vw, 3.5rem); font-weight: 800; letter-spacing: -0.02em; }
        .cs-tagline { margin-top: 0.6rem; font-size: clamp(1.05rem, 3vw, 1.4rem); font-weight: 600; color: #4ade80; }
        .cs-divider { width: 6rem; height: 1px; margin: 1.4rem auto; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent); }
        .cs-message { font-size: clamp(0.95rem, 2.6vw, 1.15rem); line-height: 1.7; color: #cbd5e1; }
        .cs-message strong { color: #ffffff; }
        .cs-facebook {
          display: inline-flex; align-items: center; gap: 0.65rem;
          margin-top: 2rem; padding: 0.8rem 1.8rem; border-radius: 9999px;
          background: #1877f2; color: #ffffff; font-weight: 600;
          text-decoration: none; font-size: 1rem;
          box-shadow: 0 12px 30px -10px rgba(24, 119, 242, 0.6);
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .cs-facebook:hover { transform: scale(1.05); background: #0f6ad4; }
        .cs-facebook svg { width: 1.15rem; height: 1.15rem; fill: #ffffff; }
        .cs-countdown {
          display: inline-flex; gap: 0.9rem; margin-top: 1.6rem;
          padding: 0.9rem 1.4rem;
          border-radius: 1.2rem;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(6px);
        }
        .cs-cd-cell { display: flex; flex-direction: column; align-items: center; min-width: 3.6rem; }
        .cs-cd-num { font-size: 1.9rem; font-weight: 800; line-height: 1.1; color: #ffffff; }
        .cs-cd-label { margin-top: 0.15rem; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; }
        .cs-footer { margin-top: 3rem; font-size: 0.75rem; color: #64748b; }
        @media (max-width: 480px) { .cs-ring { display: none; } }
        /* Respect des préférences de mouvement réduit */
        @media (prefers-reduced-motion: reduce) {
          .cs-bg { animation: none; }
        }
      `}</style>
      <div className="coming-soon">
        <div className="cs-bg" />
        <div className="cs-glow cs-glow-1" />
        <div className="cs-glow cs-glow-2" />
        <div className="cs-ring" />
        <div className="cs-inner">
          <div className="cs-logo">
            <img src="/logo2.png" alt={siteName} />
          </div>
          <h1 className="cs-name">{siteName}</h1>
          <p className="cs-tagline">Plateforme numérique guinéenne</p>
          <div className="cs-divider" />
          {remaining ? (
            <>
              <p className="cs-message">
                Ouverture prévue{openDateLabel ? ` le ${openDateLabel}` : " dans quelques semaines"}.
                <br />
                <strong>Abonnez-vous à notre page Facebook pour être informé !</strong>
              </p>
              <div className="cs-countdown" role="timer" aria-label="Compte à rebours avant l'ouverture">
                <div className="cs-cd-cell">
                  <span className="cs-cd-num">{remaining.days}</span>
                  <span className="cs-cd-label">jours</span>
                </div>
                <div className="cs-cd-cell">
                  <span className="cs-cd-num">{remaining.hours}</span>
                  <span className="cs-cd-label">heures</span>
                </div>
                <div className="cs-cd-cell">
                  <span className="cs-cd-num">{remaining.minutes}</span>
                  <span className="cs-cd-label">min</span>
                </div>
              </div>
            </>
          ) : (
            <p className="cs-message">
              {/* Date planifiée atteinte (fenêtre < 30 s avant la bascule auto) */}
              {settings.scheduledOpenDate
                ? "Ouverture imminente ! La boutique arrive dans quelques instants."
                : "Ouverture prévue dans quelques semaines."}
              <br />
              <strong>Abonnez-vous à notre page Facebook pour être informé !</strong>
            </p>
          )}
          <a
            className="cs-facebook"
            href={facebookUrl}
            target="_blank"
            rel="noreferrer"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Suivre sur Facebook
          </a>
          <p className="cs-footer">
            © 2026 {siteName} — République de Guinée · Photo : Conakry (Kaloum),
            vue drone — CC BY-SA 4.0, Wikimedia Commons
          </p>
        </div>
      </div>
    </>
  );
};

export default ComingSoon;
