// api/sitemap.js
// Sitemap dynamique pour Kabary Shop
// Génère le sitemap.xml basé sur les produits et catégories disponibles

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Récupérer les produits depuis Supabase ou localStorage
  let products = [];
  let categories = [];

  try {
    const sb = createClient(
      process.env.VITE_SUPABASE_URL || '',
      process.env.VITE_SUPABASE_ANON_KEY || '',
    );

    // Récupérer les produits actifs
    const { data: productsData, error: productsError } = await sb
      .from('products')
      .select('id, title, updated_at')
      .eq('is_active', true);

    if (!productsError && productsData) {
      products = productsData;
    }
  } catch {
    // Fallback : pas de Supabase, on utilise les données locales via une requête
    // vers le frontend (cette approche est simplifiée pour la démo)
  }

  // Récupérer les catégories (si disponibles via sync_store)
  try {
    const sb = createClient(
      process.env.VITE_SUPABASE_URL || '',
      process.env.VITE_SUPABASE_ANON_KEY || '',
    );

    const { data: categoriesData, error: categoriesError } = await sb
      .from('sync_store')
      .select('value')
      .eq('key', 'categories')
      .single();

    if (!categoriesError && categoriesData?.value) {
      categories = Array.isArray(categoriesData.value) ? categoriesData.value : [];
    }
  } catch {
    // Fallback
  }

  const baseUrl = process.env.VITE_BASE_URL || 'https://kabaryshop.vercel.app';

  // Construire le sitemap
  const urls = [
    { url: baseUrl, changefreq: 'daily', priority: '1.0' },
    { url: `${baseUrl}/femmes`, changefreq: 'weekly', priority: '0.8' },
    { url: `${baseUrl}/hommes`, changefreq: 'weekly', priority: '0.8' },
    { url: `${baseUrl}/enfants`, changefreq: 'weekly', priority: '0.8' },
    { url: `${baseUrl}/electroniques`, changefreq: 'weekly', priority: '0.8' },
    { url: `${baseUrl}/meubles`, changefreq: 'weekly', priority: '0.8' },
    { url: `${baseUrl}/tendances`, changefreq: 'weekly', priority: '0.8' },
    { url: `${baseUrl}/ventes`, changefreq: 'weekly', priority: '0.8' },
    { url: `${baseUrl}/notes`, changefreq: 'monthly', priority: '0.5' },
    { url: `${baseUrl}/contacts`, changefreq: 'monthly', priority: '0.3' },
    { url: `${baseUrl}/cgv`, changefreq: 'yearly', priority: '0.3' },
    { url: `${baseUrl}/confidentialite`, changefreq: 'yearly', priority: '0.3' },
    { url: `${baseUrl}/retours`, changefreq: 'yearly', priority: '0.3' },
    { url: `${baseUrl}/admin/login`, changefreq: 'never', priority: '0.0' },
  ];

  // Ajouter les produits
  for (const product of products) {
    urls.push({
      url: `${baseUrl}/produit/${product.id}`,
      changefreq: 'monthly',
      priority: '0.7',
    });
  }

  // Ajouter les catégories dynamiques
  for (const category of categories) {
    if (category.slug) {
      urls.push({
        url: `${baseUrl}/${category.slug}`,
        changefreq: 'weekly',
        priority: '0.8',
      });
    }
  }

  // Générer le XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.url}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(sitemap);
}
