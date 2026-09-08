// src/Pages/Legal/Terms.jsx
// Conditions Générales de Vente (CGV) - Kabary Shop

import React from 'react';
import { Link } from 'react-router-dom';

const Terms = () => {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <header className="mb-8">
        <Link to="/" className="text-primary hover:underline mb-4 inline-block">
          ← Retour au site
        </Link>
        <h1 className="text-3xl font-bold mb-2">Conditions Générales de Vente</h1>
        <p className="text-gray-600">Dernière mise à jour : Septembre 2026</p>
      </header>

      <article className="space-y-6">
        {/* 1. Objet */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Objet</h2>
          <p className="text-gray-700 leading-relaxed">
            Les présentes Conditions Générales de Vente (CGV) ont pour objet de définir
            les conditions dans lesquelles Kabary Shop (ci-après « le Site ») vend des
            produits à ses clients (ci-après « le Client ») via le site internet
            https://kabaryshop.vercel.app (ci-après « le Site »).
          </p>
          <p className="text-gray-700 leading-relaxed">
            L'utilisation du Site et les achats effectués sur celui-ci sont soumis à
            l'acceptation complète de ces CGV par le Client.
          </p>
        </section>

        {/* 2. Produits */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Produits et Disponibilité</h2>
          <p className="text-gray-700 leading-relaxed">
            Le Site propose des produits de mode (vêtements, sacs, accessoires, etc.)
            disponibles en différentes tailles, couleurs et catégories.
          </p>
          <p className="text-gray-700 leading-relaxed">
            La disponibilité des produits est indiquée sur le Site. En cas de rupture
            de stock, le Site s'efforce d'informer le Client avant la validation de la
            commande. La présentation des produits sur le Site ne constitue pas
            engagement de disponibilité permanente.
          </p>
        </section>

        {/* 3. Prix */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Prix et Paiement</h2>
          <p className="text-gray-700 leading-relaxed">
            Les prix affichés sur le Site sont indiqués en Francs Guinéens (GNF) et
            comprennent la TVA si applicable. Ils sont susceptibles d'évolution sans
            préavis, sauf during la validité d'une commande.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Le paiement s'effectue :
          </p>
          <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-1">
            <li>Par Mobile Money (Orange Money, MTN Money) à la livraison</li>
            <li>Par échange bancaire (à convenir avec le client)</li>
          </ul>
          <p className="text-gray-700 leading-relaxed">
            Aucun paiement n'est exigé avant la livraison du produit.
          </p>
        </section>

        {/* 4. Commandes */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Passation de Commande</h2>
          <p className="text-gray-700 leading-relaxed">
            Pour passer une commande, le Client doit :
          </p>
          <ol className="list-decimal list-inside text-gray-700 leading-relaxed space-y-1">
            <li>Sélectionner les produits souhaités</li>
            <li>Préciser la quantité de chaque produit</li>
            <li>Remplir le formulaire de commande avec ses coordonnées</li>
            <li>Confirmer la commande</li>
          </ol>
          <p className="text-gray-700 leading-relaxed">
            Une fois la commande confirmée, le Client reçoit un numéro de référence
            (format CMD-YYMMDD-NNNN) qui lui permet de suivre sa commande.
          </p>
        </section>

        {/* 5. Livraison */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Livraison</h2>
          <p className="text-gray-700 leading-relaxed">
            Kabary Shop livre ses produits à Conakry et ses environs.
          </p>
          <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2">
            <li>
              <strong>Délai de livraison :</strong> 24h à 48h après validation de la
              commande (jours ouvrés)
            </li>
            <li>
              <strong>Coût de livraison :</strong> Inclus dans le prix pour les commandes
              supérieures à 300 000 GNF. Pour les autres commandes, des frais de
              livraison peuvent s'appliquer (à convenir selon le quartier).
            </li>
            <li>
              <strong>Mode de livraison :</strong> Le produit est livré chez le client
              ou à un point de rendez-vous convenu.
            </li>
          </ul>
        </section>

        {/* 6. Retours */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Retours et Remboursements</h2>
          <p className="text-gray-700 leading-relaxed">
            Le Client dispose d'un droit de rétractation de 7 jours à compter de la
            réception du produit pour changer d'avis.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Pour exercer ce droit, le Client doit :
          </p>
          <ol className="list-decimal list-inside text-gray-700 leading-relaxed space-y-1">
            <li>Contacter Kabary Shop par téléphone (+224 620 980 117) ou par email</li>
            <li>Retourner le produit dans son état d'origine (avec étiquettes, non porté)</li>
            <li>Justifier de l'achat (numéro de commande)</li>
          </ol>
          <p className="text-gray-700 leading-relaxed">
            Le remboursement est effectué sous 14 jours après réception du retour.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Les produits défectueux ou incorrects sont acceptés pour retour dans les
            14 jours suivant la réception, avec remboursement intégral ou échange.
          </p>
        </section>

        {/* 7. Responsabilité */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Responsabilité</h2>
          <p className="text-gray-700 leading-relaxed">
            Kabary Shop s'engage à fournir des produits de qualité. En cas de
            défaut de fabrication, le Client peut retourner le produit pour
            remboursement ou échange dans les conditions prévues à l'article 6.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Kabary Shop ne peut être tenu responsable des dommages résultant d'une
            mauvaise utilisation du produit par le Client.
          </p>
        </section>

        {/* 8. Données Personnelles */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Données Personnelles</h2>
          <p className="text-gray-700 leading-relaxed">
            Les données personnelles collectées (nom, email, téléphone, adresse) sont
            utilisées uniquement pour la gestion des commandes et la livraison.
            Elles ne sont pas partagées avec des tiers, sauf obligation légale.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Pour plus de détails, consulter notre Politique de Confidentialité.
          </p>
        </section>

        {/* 9. Litiges */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Litiges</h2>
          <p className="text-gray-700 leading-relaxed">
            En cas de litige non résolu à l'amiable, les parties conviennent de
            recourir aux tribunaux compétents de la République de Guinée, plus
            particulièrement ceux de Conakry.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Le Site est soumis au droit guinéen.
          </p>
        </section>

        {/* 10. Contact */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">10. Contact</h2>
          <p className="text-gray-700 leading-relaxed">
            Pour toute question sur ces CGV ou vos commandes :
          </p>
          <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-1">
            <li>Email : boubacarelbalde94@gmail.com</li>
            <li>Téléphone / WhatsApp : +224 620 980 117</li>
            <li>Adresse : Cobayah-Conakry, République de Guinée</li>
          </ul>
        </section>
      </article>

      <footer className="mt-8 pt-4 border-t text-center text-sm text-gray-500">
        <p>© 2026 Kabary Shop. Tous droits réservés.</p>
      </footer>
    </div>
  );
};

export default Terms;
