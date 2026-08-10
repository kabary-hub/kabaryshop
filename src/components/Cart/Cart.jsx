import React from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { convertPrice, formatPrice } from '../../utils/currencyUtils';

const Cart = () => {
  const { cartItems, removeFromCart, updateQuantity, getTotalPrice, getTotalItems, isCartOpen, closeCart, clearCart } = useCart();
  const { settings } = useSettings();

  const getFormattedPrice = (priceInGNF) => {
    if (!priceInGNF || priceInGNF === 0) return "Prix sur demande";
    const convertedPrice = convertPrice(priceInGNF, settings.currency);
    return formatPrice(convertedPrice, settings.currency);
  };

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black bg-opacity-50 flex justify-center pt-3">
      <div className="w-full sm:w-[400px] md:w-[450px] lg:w-[500px] h-full bg-white dark:bg-gray-900 flex flex-col shadow-xl animate-slideInRight">
        
        {/* En-tête fixe */}
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShoppingBag size={20} />
            Mon panier ({getTotalItems()} articles)
          </h2>
          <button 
            onClick={closeCart} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenu scrollable - prend tout l'espace restant */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
              <ShoppingBag size={60} className="text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 text-center">Votre panier est vide</p>
              <button 
                onClick={closeCart}
                className="mt-4 text-primary hover:underline"
              >
                Continuer mes achats
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map(item => (
                <div key={item.id} className="flex gap-3 border-b dark:border-gray-700 pb-3">
                  <img 
                    src={item.img} 
                    alt={item.title} 
                    loading="lazy"
                    decoding="async"
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0" 
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                    <p className="text-xs text-gray-500 truncate">{item.color || "Multiples couleurs"}</p>
                    <p className="text-sm font-bold text-primary mt-1">{getFormattedPrice(item.priceInGNF)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 hover:bg-red-100 rounded ml-auto text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-primary whitespace-nowrap">
                      {(item.priceInGNF * item.quantity).toLocaleString()} GNF
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pied de page fixe */}
        {cartItems.length > 0 && (
          <div className="border-t dark:border-gray-700 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex-shrink-0 bg-white dark:bg-gray-900">
            <div className="flex justify-between mb-3">
              <span className="font-semibold">Total :</span>
              <span className="font-bold text-xl text-primary">{getTotalPrice().toLocaleString()} GNF</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">*Livraison gratuite à partir de 200 000 GNF</p>
            <button
              onClick={() => {
                closeCart();
                window.dispatchEvent(new CustomEvent('openCartCheckout'));
              }}
              className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/90 transition font-semibold"
            >
              Passer la commande
            </button>
            <button
              onClick={clearCart}
              className="w-full mt-2 border py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm"
            >
              Vider le panier
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Cart;