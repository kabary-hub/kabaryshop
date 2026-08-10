import React, { useEffect, useState } from "react";
import { FaStar } from "react-icons/fa";
import { getAllProducts } from "../Products/products";

// Calcule les meilleures ventes réelles à partir des commandes enregistrées
const getTopSellingProducts = (orders, allProducts) => {
  const sales = {};
  orders.forEach((order) => {
    if (!order.items || !Array.isArray(order.items)) return;
    order.items.forEach((item) => {
      const key = item.id ? String(item.id) : (item.name || "Produit inconnu");
      if (!sales[key]) {
        sales[key] = { id: item.id || null, name: item.name || "Produit inconnu", quantity: 0, revenue: 0 };
      }
      sales[key].quantity += item.quantity || 1;
      sales[key].revenue += (item.price || 0) * (item.quantity || 1);
    });
  });

  return Object.values(sales)
    .map((data) => {
      // Retrouver le produit réel : d'abord par ID exact, sinon par nom
      const product = data.id
        ? allProducts.find((p) => String(p.id) === String(data.id))
        : undefined;
      const fallback =
        product ||
        allProducts.find(
          (p) => (p.title || p.name || "").toLowerCase() === data.name.toLowerCase(),
        );
      return {
        id: fallback?.id || data.id,
        img: fallback?.img,
        title: fallback?.title || data.name,
        priceInGNF: fallback?.priceInGNF,
        description: fallback?.description || fallback?.desc || "",
        quantity: data.quantity,
        revenue: data.revenue,
      };
    })
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, 4);
};

const TopProducts = ({ handleOrder }) => {
  const [topProducts, setTopProducts] = useState([]);
  const [hasOrders, setHasOrders] = useState(true);

  const loadTopProducts = () => {
    try {
      const savedOrders = localStorage.getItem('shop_orders');
      const orders = savedOrders ? JSON.parse(savedOrders) : [];
      const allProducts = getAllProducts();
      setHasOrders(orders.length > 0);
      setTopProducts(getTopSellingProducts(orders, allProducts));
    } catch (error) {
      console.error("Erreur chargement meilleures ventes:", error);
      setHasOrders(false);
      setTopProducts([]);
    }
  };

  useEffect(() => {
    loadTopProducts();
    const handleUpdate = () => loadTopProducts();
    window.addEventListener('ordersUpdated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('ordersUpdated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return (
    <div className="dark:bg-gray-950 dark:text-white duration-300">
      <div className="container mx-auto border-b border-yellow-600 ">
        {/* Header section  */}
        <div className="text-left mb-24">
          <p data-aos="fade-up" className="text-sm sm:text-xl font-bold text-primary">
            Nos meilleures ventes
          </p>
          <h1 data-aos="fade-up" className="text-4xl font-bold">
            Les incontournables de la saison réunis au même endroit
          </h1>
          <p data-aos="fade-up" className="text-sm xs:text text-gray-400">
            Explorez une sélection rigoureuse des pièces les plus convoitées du
            moment, du chic décontracté aux tenues de soirée, <br />
            de la mode enfant aux costumes élégants, bref, venez découvrir ce qui définit le style de cette saison chez Kabary Shop.
          </p>
        </div>

        {/* Body section  */}
        {!hasOrders ? (
          <div className="mb-10 text-center py-10">
            <p className="text-gray-400">
              Aucune commande pour le moment. Les meilleures ventes apparaîtront
              ici dès les premières commandes.
            </p>
          </div>
        ) : topProducts.length === 0 ? (
          <div className="mb-10 text-center py-10">
            <p className="text-gray-400">
              Aucune vente enregistrée pour le moment.
            </p>
          </div>
        ) : (
          <div className=" mb-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-5 place-items-center ">
            {topProducts.map((data, index) => {
              return (
                <div
                  key={data.id || index}
                  data-aos="zoom-out"
                  className="rounded-r-2xl bg-white dark:bg-gray-800 hover:bg-gradient-to-b from-gray-600 to-secondary dark:hover-bg-primary hover:text-white relative shadow-xl duration-300 
              group max-w-[300px]"
                >
                  {/* images section  */}
                  <div className="h-[150px] w-[200px] mx-auto overflow-hidden flex items-center justify-center">
                    <img
                      src={data.img}
                      alt={data.title}
                      className="max-w-[185px] max-h-[150px] object-contain block mx-auto transform  group-hover:scale-180 group-hover:-translate-y-10 duration-300 drop-shadow-md group-hover:rounded-tl-2xl px-1"
                    />
                  </div>
                  {/* Details  section  */}
                  <div className="p-4 text-center">
                    <div className="w-full flex items-center justify-center gap-1">
                      <FaStar className="inline text-yellow-400" />
                      <FaStar className="inline text-yellow-400" />
                      <FaStar className="inline text-yellow-400" />
                      <FaStar className="inline text-yellow-400" />
                      <FaStar className="inline text-yellow-400" />
                    </div>
                    <h1 className="text-xl font-bold">{data.title}</h1>
                    {data.priceInGNF ? (
                      <p className="text-sm font-bold text-primary mt-1">
                        {data.priceInGNF.toLocaleString()} GNF
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 my-2">
                        Prix sur demande
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mb-2">
                      {data.quantity} vendu{data.quantity > 1 ? "s" : ""}
                    </p>
                    <button
                      className="bg-primary hover:scale-105 duration-300 text-white py-1 px-4 rounded-full mt-2 group-hover:bg-white group-hover:text-primary"
                      onClick={() => handleOrder && handleOrder({ ...data, id: data.id, img: data.img })}
                    >
                      Acheter
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopProducts;
