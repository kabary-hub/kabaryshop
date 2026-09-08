// api/robots.js
// robots.txt pour Kabary Shop

export default function handler(req, res) {
  const baseUrl = process.env.VITE_BASE_URL || 'https://kabaryshop.vercel.app';

  const robots = `User-agent: *
Allow: /
Allow: /femmes
Allow: /hommes
Allow: /enfants
Allow: /electroniques
Allow: /meubles
Allow: /tendances
Allow: /ventes
Allow: /notes
Allow: /contacts
Allow: /cgv
Allow: /confidentialite
Allow: /retours
Allow: /track
Disallow: /admin
Disallow: /staff
Disallow: /api
Disallow: /_next
Disallow: /_vercel

Sitemap: ${baseUrl}/sitemap.xml
`;

  res.setHeader('Content-Type', 'text/plain');
  res.send(robots);
}
