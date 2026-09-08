// src/Pages/Legal/Returns.jsx
// Politique de Retour / Remboursement - Kabary Shop

import React from 'react';
import { Link } from 'react-router-dom';

const Returns = () => {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <header className="mb-8">
        <Link to="/" className="text-primary hover:underline mb-4 inline-block">
          ← Retour au site
        </Link>
        <h1 className="text-3xl font-bold mb-2">Politique de Retour & Remboursement</h1>
        <p className="text-gray-600">Dernière mise à jour : Septembre 2026</p>
      </header>

      <article className="space-y-6">
        {/* Introduction */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
          <p className="text-gray-700 leading-relaxed">
            Kabary Shop s'engage à offrir une expérience d'achat satisfaisante. Cette
            politique explique comment retourner un produit et obtenir un remboursement
            ou un échange.
          </p>
        </section>

        {/* 1. Droit de Rétractation */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Droit de changer d'avis</h2>
          <p className="text-gray-700 leading-relaxed">
            Vous disposez d'un droit de rétractation de <strong>7 jours</strong> à
            compter de la réception de votre produit pour changer d'avis, sans avoir
            besoin de justifier votre décision.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Pour exercer ce droit, contactez-nous dans ce délai et suivez les modalités
            de retour décrites ci-dessous.
          </p>
        </section>

        {/* 2. Retours pour Défaut */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Retours pour produit défectueux</h2>
          <p className="text-gray-700 leading-relaxed">
            Si vous recevez un produit défectueux ou incorrect (mauvaise taille, couleur
            différente, etc.), vous pouvez le retourner dans les <strong>14 jours</strong>
            suivant la réception pour :
          </p>
          <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2">
            <li>Un <strong>remboursement intégral</strong></li>
            <li>Un <strong>échange</strong> contre un produit correct</li>
          </ul>
          <p className="text-gray-700 leading-relaxed">
            Dans ce cas, aucun frais de retour ne vous est facturé.
          </p>
        </section>

        {/* 3. Conditions de Retour */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Conditions pour un retour accepté</h2>
          <p className="text-gray-700 leading-relaxed">
            Pour que votre retour soit accepté, le produit doit :
          </p>
          <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2">
            <li>Être <strong>retourné dans son état d'origine</strong> (non porté, non utilisé)</li>
            <li>Avoir <strong>toutes ses étiquettes</strong> et emballages d'origine</li>
            <li>Avoir été <strong>nettoyé</strong> (si applicable)</li>
            <li>Être accompagné du <strong>numéro de commande</strong> ou de la facture</li>
          </ul>
          <p className="text-gray-700 leading-relaxed">
            Les produits suivants ne sont pas acceptés pour retour :
          </p>
          <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2">
            <li>Produits portés, utilisés ou endommagés par le client</li>
            <li>Produits sans étiquettes ou emballages d'origine</li>
            <li>Produits personnalisés ou sur mesure (si applicable)</li>
          </ul>
        </section>

        {/* 4. Modalités de Retour */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Comment effectuer un retour</h2>
          <p className="text-gray-700 leading-relaxed">
            Pour retourner un produit, suivez ces étapes :
          </p>
          <ol className="list-decimal list-inside text-gray-700 leading-relaxed space-y-2">
            <li>
              <strong>Contactez-nous</strong> pour faire part de votre souhait de retour :
              <ul className="list-disc list-inside mt-1">
                <li>Téléphone / WhatsApp : +224 620 980 117</li>
                <li>Email : boubacarelbalde94@gmail.com</li>
              </ul>
            </li>
            <li>
              <strong>Indiquez</strong> :
              <ul className="list-disc list-inside mt-1">
                <li>Votre numéro de commande (CMD-...)</li>
                <li>Le(s) produit(s) à retourner</li>
                <li>La raison du retour (changement d'avis, défaut, etc.)</li>
              </ul>
            </li>
            <li>
              <strong>Nous vous indiquerons</strong> le mode de retour le plus adapté
              (dépôt en boutique ou reprise à domicile selon l'endroit)
            </li>
            <li>
              <strong>Emballez le produit</strong> soigneusement dans son emballage
              d'origine si possible
            </li>
          </ol>
        </section>

        {/* 5. Remboursement */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Modalités de remboursement</h2>
          <p className="text-gray-700 leading-relaxed">
            Une fois le retour reçu et inspecté, nous procédons au remboursement :
          </p>
          <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2">
            <li>Le remboursement est effectué sous <strong>14 jours</strong> après réception</li>
            <li>Le remboursement est effectué sur le <strong>même moyen de paiement</strong> que celui utilisé pour l'achat</li>
            <li>Pour les paiements Mobile Money, le remboursement est effectué sur le même numéro</li>
          </ul>
          <p className="text-gray-700 leading-relaxed">
            Si le produit est retourné pour changement d'avis, des frais de livraison
            initiaux peuvent être déduits du remboursement.
          </p>
        </section>

        {/* 6. Échange */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Échange de produit</h2>
          <p className="text-gray-700 leading-relaxed">
            Vous pouvez choisir l'échange au lieu du remboursement si le produit est
            défectueux ou incorrect. Pour un échange :
          </p>
          <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2">
            <li>Contactez-nous avec votre numéro de commande</li>
            <li>Indiquez le produit souhaité pour l'échange (si disponible)</li>
            <li>Nous organiserons la livraison du nouveau produit</li>
          </ul>
          <p className="text-gray-700 leading-relaxed">
            Les échanges pour changement d'avis (taille, couleur, etc.) sont acceptés
            sous réserve de disponibilité du produit alternatif.
          </p>
        </section>

        {/* 7. Contact */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Contact pour les retours</h2>
          <p className="text-gray-700 leading-relaxed">
            Pour toute question sur les retours ou le remboursement :
          </p>
          <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-1">
            <li>Email : boubacarelbalde94@gmail.com</li>
            <li>Téléphone / WhatsApp : +224 620 980 117</li>
            <li>Adresse : Cobayah-Conakry, République de Guinée</li>
            <li>Horaires : Lu-Ven, 9h-17h (heure de Conakry)</li>
          </ul>
        </section>
      </article>

      <footer className="mt-8 pt-4 border-t text-center text-sm text-gray-500">
        <p>© 2026 Kabary Shop. Tous droits réservés.</p>
      </footer>
    </div>
  );
};

export default Returns;
