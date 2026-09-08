// src/Pages/Legal/Privacy.jsx
// Politique de Confidentialité - Kabary Shop

import React from 'react';
import { Link } from 'react-router-dom';

const Privacy = () => {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <header className="mb-8">
        <Link to="/" className="text-primary hover:underline mb-4 inline-block">
          ← Retour au site
        </Link>
        <h1 className="text-3xl font-bold mb-2">Politique de Confidentialité</h1>
        <p className="">Dernière mise à jour : Septembre 2026</p>
      </header>

      <article className="space-y-6">
        {/* Introduction */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
          <p className="leading-relaxed">
            Kabary Shop respecte la confidentialité de vos données
            personnelles. Cette politique explique comment nous collectons, utilisons
            et protégeons vos informations lorsque vous utilisez notre site et passez
            des commandes.
          </p>
        </section>

        {/* 1. Données Collectées */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Données que nous collectons</h2>
          <p className="leading-relaxed">
            Lors de la passation d'une commande, nous collectons les données suivantes :
          </p>
          <ul className="list-disc list-inside  leading-relaxed space-y-2">
            <li>
              <strong>Nom complet</strong> : Pour identifier le client et personnaliser
              la livraison
            </li>
            <li>
              <strong>Adresse email</strong> : Pas obligatoire; Pour envoyer la confirmation de commande
              et les informations de suivi
            </li>
            <li>
              <strong>Numéro de téléphone</strong> : Pour contacter le client lors de
              la livraison (coordonnées de livraison)
            </li>
            <li>
              <strong>Adresse de livraison</strong> : Pour livrer le produit chez le client
            </li>
            <li>
              <strong>Informations de commande</strong> : Produits sélectionnés, quantités,
              prix, et eventuellement mode de paiement
            </li>
          </ul>
          <p className=" leading-relaxed">
            L'adresse email est facultative mais nous permet de vous envoyer la
            confirmation de commande.
          </p>
        </section>

        {/* 2. Utilisation des Données */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Comment nous utilisons vos données</h2>
          <p className="leading-relaxed">
            Nous utilisons vos données personnelles pour :
          </p>
          <ul className="list-disc list-inside leading-relaxed space-y-2">
            <li>Traiter et livrer vos commandes</li>
            <li>Envoyer des confirmations de commande et des mises à jour de statut</li>
            <li>Contacter le client pour la livraison (Paiement, rendez-vous)</li>
            <li>Gérer les vos commandes </li>
            <li>Améliorer notre service client et l'expérience d'achat</li>
          </ul>
          <p className="leading-relaxed">
            Nous ne vendons pas vos données personnelles à des tiers.
          </p>
        </section>

        {/* 3. Conservation */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Conservation des données</h2>
          <p className="leading-relaxed">
            Nous conservons vos données personnelles aussi longtemps que nécessaire
            pour :
          </p>
          <ul className="list-disc list-inside leading-relaxed space-y-2">
            <li>La gestion des commandes en cours et récentes</li>
            <li>Le suivi des commandes historiques (archivage)</li>
            <li>Le service après-vente</li>
            <li>Le respect d'obligations légales</li>
          </ul>
          <p className="leading-relaxed">
            Les commandes archivées sont conservées de manière sécurisée pour
            permettre le suivi des achats passés si nécessaire.
          </p>
        </section>

        {/* 4. Droits des Utilisateurs */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Vos droits</h2>
          <p className="leading-relaxed">
            Vous disposez des droits suivants sur vos données personnelles :
          </p>
          <ul className="list-disc list-inside  leading-relaxed space-y-2">
            <li>
              <strong>Droit d'accès</strong> : Vous pouvez demander une copie de
              vos données
            </li>
            <li>
              <strong>Droit de rectification</strong> : Vous pouvez demander la
              correction de données inexactes
            </li>
            <li>
              <strong>Droit à l'effacement</strong> : Vous pouvez demander la
              suppression de vos données (dans la mesure où elles sont nécessaires
              pour la gestion des commandes)
            </li>
            <li>
              <strong>Droit de limitation</strong> : Vous pouvez demander la
              limitation du traitement de vos données
            </li>
            <li>
              <strong>Droit à la portabilité</strong> : Vous pouvez demander la
              récupération de vos données dans un format structuré
            </li>
          </ul>
          <p className="leading-relaxed">
            Pour exercer ces droits, contactez-nous par téléphone <strong>+224 620 980 117</strong> ou email <strong>boubacarelbalde94@gmail.com.</strong>
          </p>
        </section>

        {/* 5. Sécurité */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Sécurité des données</h2>
          <p className="leading-relaxed">
            Nous mettons en place des mesures de sécurité pour protéger vos données :
          </p>
          <ul className="list-disc list-inside leading-relaxed space-y-2">
            <li>Stockage sécurisé des données de commande</li>
            <li>Accès limité aux données (uniquement l'administration autorisé)</li>
            <li>Utilisation de Supabase pour la synchronisation sécurisée</li>
            <li>Authentification admin avec 2FA pour l'accès aux données sensibles</li>
          </ul>
          <p className="leading-relaxed">
            Nous ne garantissons pas une sécurité à 100% sur internet, mais nous
            faisons de notre mieux pour protéger vos informations.
          </p>
        </section>

        {/* 6. Cookies */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Cookies</h2>
          <p className="leading-relaxed">
            Le Site utilise des cookies pour fonctionner correctement :
          </p>
          <ul className="list-disc list-inside leading-relaxed space-y-2">
            <li>
              <strong>Cookies strictement nécessaires</strong> : Pour le panier,
              l'authentification admin, les paramètres du site
            </li>
            <li>
              <strong>Cookies de suivi (optionnel)</strong> : Si nous intégrons
              Google Analytics ou Plausible, des cookies de suivi peuvent être
              utilisés pour améliorer le site
            </li>
          </ul>
          <p className="leading-relaxed">
            Vous pouvez refuser les cookies non essentiels dans les paramètres de
            votre navigateur.
          </p>
        </section>

        {/* 7. Transferts Internationaux */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Transferts de données</h2>
          <p className="leading-relaxed">
            Vos données sont principalement stockées en Guinée. Si nous utilisons
            Supabase (infrastructure cloud basée en Europe), vos données peuvent être
            transférées vers des serveurs situés en dehors de la Guinée. Ces
            transferts sont effectués conformément aux normes de protection des
            données applicables.
          </p>
        </section>

        {/* 8. Contact */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Contact</h2>
          <p className="leading-relaxed">
            Pour toute question sur cette politique de confidentialité ou pour
            exercer vos droits, contactez-nous :
          </p>
          <ul className="list-disc list-inside leading-relaxed space-y-1">
            <li>Email : <strong>boubacarelbalde94@gmail.com.</strong></li>
            <li>Téléphone / WhatsApp : <strong>+224 620 980 117</strong></li>
            <li>Adresse : Cobayah-Conakry, République de Guinée</li>
          </ul>
        </section>
        <Link to="/" className="text-secondary hover:underline mb-4 text-right inline-block">
          ← Retour au site
        </Link>
      </article>

      <footer className="mt-8 pt-4 border-t text-center text-sm text-gray-600">
        <p>© 2026 <strong>Kabary Shop</strong>. Tous droits réservés.</p>
      </footer>
    </div>
  );
};

export default Privacy;
