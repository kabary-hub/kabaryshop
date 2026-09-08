// src/Pages/Legal/Terms.jsx
// Conditions Générales de Vente (CGV) - Kabary Shop

import React from 'react';
import { Link } from 'react-router-dom';

const Terms = () => {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <header className="mb-8">
        <Link to="/" className="text-secondary hover:underline mb-4 inline-block">
          ← Retour au site
        </Link>
        <h1 className="text-3xl font-bold mb-2">Conditions Générales de Vente</h1>
        <p className="text-gray-600">Dernière mise à jour : Septembre 2026</p>
      </header>

      <article className="space-y-6">
        {/* 1. Objet */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Objet</h2>
          <p className=" leading-relaxed">
            Les présentes Conditions Générales de Vente <strong>(CGV)</strong> ont pour objet de définir
            les conditions dans lesquelles Kabary Shop vend des
            produits à ses clients via le site internet
            https://kabaryshop.vercel.app .
          </p>
          <p className=" leading-relaxed">
            L'utilisation du Site et les achats effectués sur celui-ci sont soumis à
            l'acceptation complète de ces <strong>(CGV)</strong> par le Client.
          </p>
        </section>

        {/* 2. Produits */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Produits et Disponibilité</h2>
          <p className=" leading-relaxed">
            Le Site propose des produits de mode (télephonies, autos, meubles, électroniques, vêtements, sacs, accessoires, etc.)
            disponibles en différentes modèles\tailles, couleurs et catégories.
          </p>
          <p className=" leading-relaxed">
            La disponibilité des produits est indiquée sur le Site. En cas de rupture
            de stock, l'administration s'efforce d'informer le Client avant la validation de la
            commande. La présentation des produits sur le Site ne constitue pas
            engagement de disponibilité permanente.
          </p>
        </section>

        {/* 3. Prix */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Prix et Paiement</h2>
          <p className=" leading-relaxed">
            Les prix affichés sur le Site sont indiqués en Francs Guinéens (<strong>GNF</strong>), Dollard Us (<strong>$</strong>) ou Franc CFA (<strong>Xaf</strong>) et
            comprennent la <strong>(TVA)</strong> si applicable. Ils sont susceptibles d'évolution sans
            préavis, sauf during la validité d'une commande.
          </p>
          <p className=" leading-relaxed">
            Le paiement s'effectue :
          </p>
          <ul className="list-disc list-inside  leading-relaxed space-y-1">
            <li>Par espèces, mobile Money (Orange Money, MTN Money) ou carte de crédits à la livraison</li>
            <li>Par échange bancaire (à convenir avec le client)</li>
          </ul>
          <p className=" leading-relaxed">
            Aucun paiement n'est exigé avant la livraison du produit.
          </p>
        </section>

        {/* 4. Commandes */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Passation de Commande</h2>
          <p className=" leading-relaxed">
            Pour passer une commande, le Client doit :
          </p>
          <ol className="list-decimal list-inside  leading-relaxed space-y-1">
            <li>Sélectionner les produits souhaités</li>
            <li>Préciser la quantité de chaque produit</li>
            <li>Remplir le formulaire de commande avec ses coordonnées</li>
            <li>Confirmer la commande</li>
          </ol>
          <p className=" leading-relaxed">
            Une fois la commande confirmée, le Client reçoit un numéro de référence
            (<strong>format CMD-YYMMDD-NNNN</strong>) qui lui permet de suivre sa commande.
          </p>
        </section>

        {/* 5. Livraison */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Livraison</h2>
          <p className=" leading-relaxed">
            <strong>Kabary Shop</strong> livre ses produits à Conakry, ses environs et partout en guinée.
          </p>
          <ul className="list-disc list-inside  leading-relaxed space-y-2">
            <li>
              <strong>Délai de livraison :</strong> 24h à 48h pour la zone spéciale de conakry et 2 jours à 5 jours en région ( à l'intérieur)  après validation de la
              commande
            </li>
            <li>
              <strong>Coût de livraison :</strong> Inclus dans le prix pour les commandes
              supérieures à <strong>500 000 GNF</strong> pour les vetements et télephones et <strong>5 000 000 GNF</strong>
               pour les meubles. Pour les autres commandes, des frais de
              livraison peuvent s'appliquer (à convenir selon le quartier).
            </li>
            <li>
              <strong>Mode de livraison :</strong> Le produit est livré chez le client
              ou à un point de rendez-vous convenu (<strong>accès motos et voitures</strong>).
            </li>
          </ul>
        </section>

        {/* 6. Retours */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Retours et Remboursements</h2>
          <p className=" leading-relaxed">
            Conformément aux présentes conditions, le Client dispose d'un droit de rétractation uniquement 
            avant la réception, la validation et le paiement du produit. Passé ce stade, aucune rétractation ne sera acceptée.
          </p>
          <p className=" leading-relaxed">
            Le Client reconnaît et accepte que le droit de rétractation ne s'applique pas après 
            la <strong>réception</strong>, la <strong>validation</strong> et le <strong>paiement</strong> du produit.          </p>
          
          <p className=" leading-relaxed">
            En cas de litige, seul le service client de <strong>Kabary Shop</strong> est habilité à examiner les demandes, sans engagement de remboursement.
          </p>
        </section>

        {/* 7. Responsabilité */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Responsabilité</h2>
          <p className=" leading-relaxed">
            <strong>Kabary Shop</strong> s'engage à fournir des produits de qualité. En cas de
            défaut de fabrication, le Client peut reffusé le produit ou l'échangé tout en étant daccord avec 
            la direction générale de <strong>Kabary Shop</strong>.
          </p>
          <p className=" leading-relaxed">
            <strong>Kabary Shop</strong> ne peut être tenu responsable des dommages résultant d'une
            mauvaise utilisation du produit par le Client.
          </p>
        </section>

        {/* 8. Données Personnelles */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Données Personnelles</h2>
          <p className=" leading-relaxed">
            Les données personnelles collectées (nom, email, téléphone, adresse) sont
            utilisées uniquement pour la gestion des commandes et la livraison.
            Elles ne sont pas partagées avec des tiers, sauf obligation légale.
          </p>
          <p className=" leading-relaxed">
            Pour plus de détails, consulter notre Politique de Confidentialité.
          </p>
        </section>

        {/* 9. Litiges */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Litiges</h2>
          <p className=" leading-relaxed">
            En cas de litige non résolu à l'amiable, les parties conviennent de
            recourir aux tribunaux compétents de la République de Guinée, plus
            particulièrement ceux de Conakry.
          </p>
          <p className=" leading-relaxed">
            Le Site est soumis au droit guinéen.
          </p>
        </section>

        {/* 10. Contact */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">10. Contact</h2>
          <p className=" leading-relaxed">
            Pour toute question sur ces CGV ou vos commandes :
          </p>
          <ul className="list-disc list-inside  leading-relaxed space-y-1">
            <li>Email : <strong>boubacarelbalde94@gmail.com</strong></li>
            <li>Téléphone / WhatsApp : <strong>+224 620 980 117</strong></li>
            <li>Adresse : Cobayah-Conakry, République de Guinée</li>
          </ul>
        </section>
        <Link to="/" className="text-secondary hover:underline mb-4 inline-block">
          ← Retour au site
        </Link>
      </article>

      <footer className="mt-8 pt-4 border-t text-center text-sm text-gray-600">
        <p>© 2026 <strong>Kabary Shop</strong>. Tous droits réservés.</p>
      </footer>
    </div>
  );
};

export default Terms;
