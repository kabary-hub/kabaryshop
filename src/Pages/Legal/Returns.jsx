// src/Pages/Legal/Returns.jsx
// Politique de Retour / Remboursement - Kabary Shop

import React from 'react';
import { Link } from 'react-router-dom';

const Returns = () => {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <header className="mb-8">
        <Link to="/" className="text-secondary hover:underline mb-4 inline-block">
          ← Retour au site
        </Link>
        <h1 className="text-3xl font-bold mb-2">Politique de Retour & d'échange</h1>
        <p className="text-gray-600">Dernière mise à jour : Septembre 2026</p>
      </header>

      <article className="space-y-6">
        {/* Introduction */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
          <p className="leading-relaxed">
            Kabary Shop s'engage à offrir une expérience d'achat satisfaisante. Cette
            politique explique les conditions de vente et l'absence de droit de rétractation
            après réception, validation et paiement du produit.
          </p>
        </section>

        {/* 1. Droit de Rétractation */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Absence de droit de rétractation</h2>
          <p className="leading-relaxed">
            Conformément à la politique de Kabary Shop, le Client ne bénéficie d'aucun droit de rétractation dès lors que le produit a été réceptionné, validé et payé en totalité.
          </p>
          <p className="leading-relaxed">
            Toute commande réceptionnée, validée et payée par le Client est considérée comme définitive et irréversible. Aucun retour, échange ou remboursement ne sera accepté une fois ces étapes franchies.
          </p>
        </section>

        {/* 2. Retours pour Défaut */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Produit défectueux ou non conforme</h2>
          <p className="leading-relaxed">
            Si vous recevez un produit défectueux ou non conforme (mauvaise taille, couleur différente, etc.), vous devez le signaler à Kabary Shop dans les <strong>06 heures</strong> suivant la réception pour :
          </p>
          <ul className="list-disc list-inside leading-relaxed space-y-2">
            <li>Un <strong>échange</strong> contre un produit correct (si disponible)</li>
            <li>Un <strong>avoir</strong> valable sur une prochaine commande</li>
          </ul>
          <p className="leading-relaxed">
            Aucun remboursement ne sera effectué pour les produits défectueux ou non conformes signalés après ce délai.
          </p>
        </section>

        {/* 3. Conditions de Retour */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Conditions pour un échange accepté</h2>
          <p className="leading-relaxed">
            Pour qu'un échange soit accepté (uniquement en cas de produit défectueux ou non conforme), le produit doit :
          </p>
          <ul className="list-disc list-inside leading-relaxed space-y-2">
            <li>Être <strong>retourné dans son état d'origine</strong> (non porté, non utilisé)</li>
            <li>Avoir <strong>toutes ses étiquettes</strong> et emballages d'origine</li>
            <li>Être accompagné du <strong>numéro de commande</strong> ou de la facture</li>
            <li>Être signalé dans les <strong>06 heures</strong> suivant la réception</li>
          </ul>
          <p className="leading-relaxed">
            Les produits suivants ne sont pas acceptés pour échange :
          </p>
          <ul className="list-disc list-inside leading-relaxed space-y-2">
            <li>Produits portés, utilisés ou endommagés par le client</li>
            <li>Produits sans étiquettes ou emballages d'origine</li>
            <li>Produits personnalisés ou sur mesure (si applicable)</li>
            <li>Produits signalés après 06 heures suivant la réception</li>
          </ul>
        </section>

        {/* 4. Modalités de Retour */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Comment signaler un produit défectueux</h2>
          <p className="leading-relaxed">
            Pour signaler un produit défectueux ou non conforme, suivez ces étapes :
          </p>
          <ol className="list-decimal list-inside leading-relaxed space-y-2">
            <li>
              <strong>Contactez-nous</strong> dans les <strong>06 heures</strong> suivant la réception :
              <ul className="list-disc list-inside mt-1">
                <li>Téléphone / WhatsApp : <strong>+224 620 980 117</strong></li>
                <li>Email : <strong>boubacarelbalde94@gmail.com</strong></li>
              </ul>
            </li>
            <li>
              <strong>Indiquez</strong> :
              <ul className="list-disc list-inside mt-1">
                <li>Votre numéro de commande (CMD-...)</li>
                <li>Le(s) produit(s) concerné(s)</li>
                <li>La nature du défaut ou de la non-conformité</li>
                <li>Des photos du produit</li>
              </ul>
            </li>
            <li>
              <strong>Nous vous indiquerons</strong> la marche à suivre pour l'échange
              (dépôt en boutique ou reprise à domicile selon l'endroit (frais de livraison à la charge du client))
            </li>
            <li>
              <strong>Emballez le produit</strong> soigneusement dans son emballage
              d'originE
            </li>
          </ol>
        </section>

        {/* 5. Remboursement */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Aucun remboursement</h2>
          <p className="leading-relaxed">
            Kabary Shop ne procède à <strong>aucun remboursement</strong> après la réception, la validation et le paiement du produit.
          </p>
          <ul className="list-disc list-inside leading-relaxed space-y-2">
            <li>Aucun remboursement n'est effectué pour changement d'avis</li>
            <li>Aucun remboursement n'est effectué pour produit défectueux ou non conforme (un échange ou un avoir est proposé)</li>
          </ul>
          <p className="leading-relaxed">
            En cas de produit défectueux ou non conforme, un <strong>avoir</strong> ou un <strong>échange</strong> sera proposé, sous réserve 
            de disponibilité du produit alternatif, dans un delais de <strong>10 jours</strong>.
          </p>
        </section>

        {/* 6. Échange */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Échange de produit</h2>
          <p className="leading-relaxed">
            L'échange est uniquement possible en cas de produit défectueux ou non conforme, signalé dans les <strong>06 heures</strong> suivant la réception. Pour un échange :
          </p>
          <ul className="list-disc list-inside leading-relaxed space-y-2">
            <li>Contactez-nous dans les <strong>06 heures</strong> avec votre numéro de commande</li>
            <li>Indiquez le produit souhaité pour l'échange (si disponible)</li>
            <li>Nous organiserons la livraison du nouveau produit ( les frais de livraison\reprise à la charge du client)</li>
          </ul>
          <p className="leading-relaxed">
            Les échanges pour changement d'avis (taille, couleur, etc.) ne sont pas acceptés. Aucun échange n'est possible après <strong>06 heures</strong> suivant la réception et paiement.
          </p>
        </section>

        {/* 7. Contact */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Contact pour les réclamations</h2>
          <p className="leading-relaxed">
            Pour toute question ou réclamation concernant un produit :
          </p>
          <ul className="list-disc list-inside leading-relaxed space-y-1">
            <li>Email : <strong>boubacarelbalde94@gmail.com</strong></li>
            <li>Téléphone / WhatsApp : <strong>+224 620 980 117</strong></li>
            <li>Adresse : Cobayah-Conakry, République de Guinée</li>
            <li>Horaires : <strong>Lu-Dim, 9h-18h</strong> (heure de Conakry)</li>
          </ul>
        </section>
        <Link to="/" className="text-secondary hover:underline mb-4 inline-block">
          ← Retour au site
        </Link>
      </article>

      <footer className="mt-8 pt-4 border-t text-center text-sm text-gray-500">
        <p>© 2026 Kabary Shop. Tous droits réservés.</p>
      </footer>
    </div>
  );
};

export default Returns;