import React, { useEffect, useRef, useState, memo } from "react";
import { IoCloseOutline } from "react-icons/io5";
import { FaCheckCircle } from "react-icons/fa";
import { useSettings } from "../../context/SettingsContext";
import { useCart } from "../../context/CartContext";
import { getAllProducts } from "../../services/productService";
import { convertPrice, formatPrice } from "../../utils/currencyUtils";
import { notifyNewOrder } from "../../utils/notifications";
import { logActivity } from "../../utils/history";
import { isValidPhone, PHONE_ERROR_MESSAGE } from "../../utils/validation";
import {
  sendEmail,
  getSiteName,
  buildOrderConfirmationEmail,
  buildOrderItemsHtml,
} from "../../utils/emailService";

const Popup = memo(({ orderPopup, setOrderPopup, selectedProduct }) => {
  const form = useRef();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  // Détails de la commande validée → affichés dans une modale de confirmation
  const [orderSuccess, setOrderSuccess] = useState(null);
  const { cartItems, getTotalPrice, clearCart, closeCart } = useCart();
  
  let settings = { currency: 'GNF' };
  try {
    const context = useSettings();
    settings = context.settings;
  } catch {
    // Contexte indisponible : on utilise la devise par défaut (GNF)
  }

  // À chaque ouverture du popup, on réinitialise l'écran de confirmation
  useEffect(() => {
    if (orderPopup) setOrderSuccess(null);
  }, [orderPopup]);

  // Vérifier si c'est une commande directe ou depuis le panier.
  // Une commande est "depuis le panier" quand le panier contient des articles,
  // même si un produit seul est aussi passé en prop (ex: clic depuis le panier
  // après fermeture du volet). On privilégie le panier pour garder le récap complet.

  // Résout l'image ACTUELLE du produit depuis le catalogue. L'URL mémorisée
  // dans le panier peut être périmée (hash de build Vite changé après un
  // redéploiement) ou pointer vers un chemin dev-only (« /src/assets/… »)
  // impossible à charger dans un email. On privilégie donc l'image fraîche
  // du catalogue ; à défaut, on garde celle de l'article d'origine.
  const resolveFreshImage = (item) => {
    try {
      const product = getAllProducts().find(
        (p) =>
          String(p.id) === String(item.id) ||
          (item.originalId != null && String(p.id) === String(item.originalId)),
      );
      const fresh =
        product?.img ||
        (Array.isArray(product?.images) ? product.images[0] : "") ||
        "";
      if (fresh) return fresh;
    } catch {
      // Catalogue indisponible : on garde l'image stockée
    }
    return item.image || item.productImage || item.img || "";
  };

  const getFormattedPrice = (priceInGNF) => {
    if (!priceInGNF || priceInGNF === 0) {
      return "Prix sur demande";
    }
    const convertedPrice = convertPrice(priceInGNF, settings.currency);
    return formatPrice(convertedPrice, settings.currency);
  };

  // Générer une référence de commande au format : CMD-YYMMDD-240194XXXX-HHMM
  // Exemple : CMD-260908-2401940001-1430
  // - YYMMDD : date (année sur 2 chiffres, mois, jour)
  // - 240194 : préfixe fixe identifiant les commandes du site
  // - XXXX   : numéro incrémental pour la journée (0001, 0002, …)
  // - HHMM   : heure au format 24h (heures + minutes)
  const generateOrderReference = (existingOrders) => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const datePart = `${yy}${mm}${dd}`;
    // Heure au format HHMM (24h)
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const timePart = `${hh}${min}`;
    // Trouver le numéro séquentiel le plus élevé pour aujourd'hui
    const todayPrefix = `CMD-${datePart}-240194`;
    const maxSeq = existingOrders.reduce((max, order) => {
      const ref = String(order.reference || '');
      // Correspond au format CMD-YYMMDD-240194XXXX-HHMM
      const match = ref.match(/^CMD-\d{6}-240194(\d{4})-\d{4}$/);
      // Vérifier aussi que c'est pour aujourd'hui (même préfixe date)
      if (match && ref.startsWith(todayPrefix)) {
        return Math.max(max, parseInt(match[1], 10));
      }
      return max;
    }, 0);
    const seq = String(maxSeq + 1).padStart(4, '0');
    return `CMD-${datePart}-240194${seq}-${timePart}`;
  };

  // Sauvegarder la commande dans localStorage
  const saveOrderToLocalStorage = (orderData) => {
    try {
      const existingOrders = JSON.parse(localStorage.getItem('shop_orders') || '[]');
      const reference = generateOrderReference(existingOrders);
      // ID numérique unique : max existant + 1 (évite les doublons après suppression)
      const nextId = existingOrders.reduce((max, order) => Math.max(max, order.id || 0), 0) + 1;
      // Construction des articles avec image (publique ou non) pour affichage
      // dans l'email de confirmation client et l'alerte admin.
      const itemsWithImage = orderData.items.map((item) => ({
        ...item,
        image: item.image || item.productImage || item.img || "",
        productImage: item.image || item.productImage || item.img || "",
      }));

      const newOrder = {
        id: nextId,
        reference,
        customer: {
          name: orderData.customerName,
          email: orderData.customerEmail || '',
          phone: orderData.customerPhone,
          address: orderData.customerQuartier
        },
        items: itemsWithImage,
        total: orderData.total,
        status: 'pending',
        date: new Date().toISOString(),
        paymentMethod: 'Mobile Money'
      };
      existingOrders.unshift(newOrder);
      localStorage.setItem('shop_orders', JSON.stringify(existingOrders));
      window.dispatchEvent(new Event('ordersUpdated'));
      return newOrder;
    } catch {
      // Sauvegarde impossible : la commande ne sera pas enregistrée
      return null;
    }
  };

  const sendOrder = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(form.current);
    const customerName = formData.get('form_name');
    const customerEmail = formData.get('user_email');
    const customerQuartier = formData.get('user_quartier');
    const customerPhone = formData.get('user_phone');

    // Validation du téléphone : uniquement des chiffres, 9 à 14 chiffres
    if (!isValidPhone(customerPhone)) {
      setPhoneError(PHONE_ERROR_MESSAGE);
      setIsSubmitting(false);
      return;
    }
    setPhoneError("");

    // Utiliser le panier complet ou le produit individuel
    let itemsToOrder = [];
    let totalAmount = 0;

    if (isCartOrder && cartItems.length > 0) {
      // Commande avec tout le panier — on garde l'ID du produit
      itemsToOrder = cartItems.map(item => ({
        id: item.id || item.originalId,
        name: item.title,
        quantity: item.quantity,
        price: item.priceInGNF,
        image: resolveFreshImage(item)
      }));
      totalAmount = getTotalPrice();
    } else if (selectedProduct) {
      // Commande directe d'un seul produit — on garde l'ID du produit
      itemsToOrder = [{
        id: selectedProduct.id || selectedProduct.originalId,
        name: selectedProduct.title,
        quantity: 1,
        price: selectedProduct.priceInGNF || 0,
        image: resolveFreshImage(selectedProduct)
      }];
      totalAmount = selectedProduct.priceInGNF || 0;
    }

    // Sauvegarder dans localStorage
    const orderData = {
      customerName,
      customerEmail,
      customerPhone,
      customerQuartier,
      items: itemsToOrder,
      total: totalAmount
    };
    
    const savedOrder = saveOrderToLocalStorage(orderData);

    // Notifier l'admin (cloche + push + email selon les paramètres)
    if (savedOrder) {
      notifyNewOrder(savedOrder);
    }

    // Journal central : nouvelle commande client
    if (savedOrder) {
      logActivity({
        type: 'order',
        action: 'nouvelle commande',
        subject: `Commande ${savedOrder.reference || `CMD-${savedOrder.id}`}`,
        details: `${customerName} · ${savedOrder.total.toLocaleString()} GNF · ${itemsToOrder.length} article(s) · Livraison : ${customerQuartier}`,
        actor: { name: customerName, role: 'Client' },
      });
    }

    // Référence lisible de la commande (utilisée partout)
    const orderRef = savedOrder?.reference || (savedOrder ? `CMD-${savedOrder.id}` : '');

    // Email de confirmation au client (Resend via la fonction Vercel) —
    // uniquement si une adresse email a été saisie. En cas d'échec, la
    // commande reste enregistrée (elle est déjà dans localStorage).
    let emailClientOk = false;
    if (customerEmail) {
      try {
        const siteName = getSiteName();
        const itemsHtml = buildOrderItemsHtml(
          itemsToOrder.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            priceLabel: getFormattedPrice(item.price * item.quantity),
            image: item.image || "",
            productImage: item.image || "",
          })),
        );
        const emailResult = await sendEmail({
          to: customerEmail,
          toName: customerName,
          fromName: siteName,
          subject: `✅ Commande ${orderRef} confirmée`,
          html: buildOrderConfirmationEmail({
            siteName,
            customerName,
            orderRef,
            orderDate: new Date().toLocaleString('fr-FR'),
            itemsHtml,
            totalLabel: getFormattedPrice(totalAmount),
            address: customerQuartier,
          }),
        });
        emailClientOk = emailResult.ok;
        if (!emailResult.ok) {
          console.warn('[Commande] Email client échoué:', emailResult.message);
        }
      } catch (err) {
        console.error('[Commande] Exception email client:', err);
      }
    }

    // Affichage de la confirmation : modale dédiée (au lieu d'un alert/console.log)
    setOrderSuccess({
      ref: orderRef || (savedOrder ? `CMD-${savedOrder.id}` : ""),
      name: customerName || "cher client",
      email: customerEmail || "",
      items: itemsToOrder,
      total: totalAmount,
      quartier: customerQuartier,
      emailSent: emailClientOk,
    });

    // Vider le panier après commande
    if (isCartOrder) {
      clearCart();
      closeCart();
    }

    form.current.reset();
    setIsSubmitting(false);
  };

  // Vérifier si c'est une commande directe ou depuis le panier.
  // (défini après les handlers pour réutiliser cartItems à jour)
  const isCartOrder = cartItems.length > 1 || (cartItems.length === 1 && !selectedProduct);

  // Calculer le nombre d'articles dans le panier
  const cartItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Réagir à l'événement émis par le bouton "Passer la commande" du panier.
  // Le panier ferme son volet puis émet 'openCartCheckout' : on ouvre le formulaire
  // de commande avec le contenu du panier ( Récap légué par useCart).
  useEffect(() => {
    if (!orderPopup) {
      const onCartCheckout = () => {
        // Si le panier contient des articles, on ouvre le formulaire de commande.
        if (cartItems.length > 0) {
          setOrderPopup(true);
        }
      };
      window.addEventListener('openCartCheckout', onCartCheckout);
      return () => window.removeEventListener('openCartCheckout', onCartCheckout);
    }
  }, [orderPopup, cartItems.length]);

  return (
    <>
      {orderPopup && (
        <div className="popup">
          {/* Overlay : scrollable en dernier recours + centrage flex → la modale
              reste toujours centrée, même quand le clavier iOS s'ouvre ou que le
              contenu dépasse l'écran (aucun « zoom » ni décalage). */}
          <div
            className="fixed inset-0 bg-black/50 z-[999999] backdrop-blur-sm overflow-y-auto overscroll-contain"
            onKeyDown={(e) => {
              // Échap ferme la modale (cohérent avec la lightbox produit)
              if (e.key === "Escape") {
                setOrderSuccess(null);
                setOrderPopup(false);
              }
            }}
          >
            <div
              className="min-h-full flex items-center justify-center p-3 sm:p-6"
              onClick={(e) => {
                // Fermer si on clique sur le fond (wrapper flex = zone vide)
                if (e.target === e.currentTarget) {
                  setOrderSuccess(null);
                  setOrderPopup(false);
                }
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Commande"
                className="w-full max-w-[500px] shadow-md bg-white dark:bg-gray-700 rounded-2xl duration-200 border border-gray-200 dark:border-gray-600"
              >
                <div className="p-4 sm:p-5 max-h-[calc(100dvh-1.5rem)] sm:max-h-[85vh] overflow-y-auto overscroll-contain">
              <div className="flex items-center justify-between">
                <div>
                  <p className="dark:text-white text-primary dark:bg-gradient-to-r from-primary to-secondary bg-black/90 text-center font-extrabold rounded-b-full">
                    {settings.siteName || 'Kabary Shop'}
                  </p>
                  <h1 className="text-xl font-semibold">
                    {orderSuccess
                      ? "Commande validée ✅"
                      : isCartOrder
                        ? `Votre commande (${cartItemsCount} articles)`
                        : "Votre adresse"}
                  </h1>
                </div>
                <div>
                  <IoCloseOutline
                    className="text-2xl cursor-pointer"
                    onClick={() => {
                      setOrderSuccess(null);
                      setOrderPopup(false);
                    }}
                  />
                </div>
              </div>

              {/* ===== Écran de confirmation de commande (remplace alert/console.log) ===== */}
              {/* Apparition en fondu (pas de zoom : scale fixé à 1 pour éviter
                  l'effet « zoom » sur mobile) */}
              {orderSuccess && (
                <div className="mt-4 text-center animate-fadeIn">
                  <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                    <FaCheckCircle className="text-green-500 text-5xl" />
                  </div>
                  <h2 className="text-2xl font-bold mb-1">Merci {orderSuccess.name} !</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                    Votre commande a bien été validée avec succès.
                  </p>

                  {/* Référence de la commande */}
                  <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 mb-4">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">Référence</p>
                    <p className="text-lg font-bold text-primary">{orderSuccess.ref}</p>
                  </div>

                  {/* Récapitulatif des articles */}
                  <div className="text-left rounded-lg bg-gray-100 dark:bg-gray-800 p-3 mb-4 max-h-52 overflow-y-auto">
                    <p className="font-semibold text-sm mb-2">🛒 Votre commande :</p>
                    {orderSuccess.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 py-2 border-b dark:border-gray-700 text-sm">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-10 h-10 object-cover rounded"
                            loading="lazy"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">Quantité : {item.quantity}</p>
                        </div>
                        <p className="font-semibold text-primary whitespace-nowrap">
                          {(item.price * item.quantity).toLocaleString()} GNF
                        </p>
                      </div>
                    ))}
                    <div className="mt-2 pt-2 border-t dark:border-gray-700 flex justify-between font-bold">
                      <span>Total :</span>
                      <span className="text-primary">{orderSuccess.total.toLocaleString()} GNF</span>
                    </div>
                  </div>

                  {/* Livraison & paiement */}
                  <div className="text-left rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3 mb-4">
                    <p className="text-sm mb-1">
                      <span className="font-semibold">📍
                        
                        
                         Livraison :</span>{" "}
                      <span className="text-gray-600 dark:text-gray-300">{orderSuccess.quartier}</span>
                    </p>
                    <p className="text-xs text-gray-500">💳 Paiement à la livraison </p>
                    {orderSuccess.email && orderSuccess.emailSent && (
                      <p className="text-xs text-green-600 mt-1">
                        ✉️ Email de confirmation envoyé à {orderSuccess.email}
                      </p>
                    )}
                    {orderSuccess.email && !orderSuccess.emailSent && (
                      <p className="text-xs text-orange-500 mt-1">
                        ⚠️ Email non envoyé — vérifiez la console (F12) pour le détail
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setOrderSuccess(null);
                      setOrderPopup(false);
                    }}
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:scale-105 duration-200 text-white py-2.5 px-6 rounded-full text-sm font-semibold"
                  >
                    Continuer mes achats
                  </button>
                </div>
              )}

              {/* ===== Formulaire (masqué après validation) ===== */}
              {!orderSuccess && (
                <>
              {/* Récapitulatif du panier */}
              {isCartOrder && cartItems.length > 0 && (
                <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg max-h-60 overflow-y-auto">
                  <h3 className="font-semibold text-sm mb-2">🛒 Votre panier :</h3>
                  {cartItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 py-2 border-b dark:border-gray-700 text-sm">
                      <img src={item.img} alt={item.title} className="w-10 h-10 object-cover rounded" />
                      <div className="flex-1">
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-gray-500">{getFormattedPrice(item.priceInGNF)} x{item.quantity}</p>
                      </div>
                      <p className="font-semibold text-primary">{(item.priceInGNF * item.quantity).toLocaleString()} GNF</p>
                    </div>
                  ))}
                  <div className="mt-2 pt-2 border-t dark:border-gray-700 flex justify-between font-bold">
                    <span>Total :</span>
                    <span className="text-primary">{getTotalPrice().toLocaleString()} GNF</span>
                  </div>
                </div>
              )}

              {/* Produit individuel (commande directe) */}
              {!isCartOrder && selectedProduct && (
                <div className="mt-2 p-2 bg-primary/15 dark:bg-gray-800 rounded-md border-l-4 border-primary mb-3">
                  <p className="text-[11px] font-bold text-primary truncate">
                    Article: {selectedProduct.title}
                  </p>
                  <p className="text-[11px] font-bold">
                    Prix: {getFormattedPrice(selectedProduct.priceInGNF)}
                  </p>
                </div>
              )}

              {/* Formulaire */}
              <form ref={form} onSubmit={sendOrder} className="mt-4">
                <input type="hidden" name="product_name" value={isCartOrder ? "Commande multiple" : selectedProduct?.title || ""} />
                <input type="hidden" name="product_price" value={isCartOrder ? getTotalPrice() : (selectedProduct?.priceInGNF || 0)} />
                <input type="hidden" name="currency" value={settings.currency} />

                <input
                  name="form_name"
                  type="text"
                  placeholder="Nom complet *"
                  required
                  className="w-full rounded-full border border-gray-300 dark:border-gray-500 dark:bg-gray-800 px-3 py-2 mb-2 text-sm"
                />
                <input
                  name="user_email"
                  type="email"
                  placeholder="Email"
                  className="w-full rounded-full border border-gray-300 dark:border-gray-500 dark:bg-gray-800 px-3 py-2 mb-2 text-sm"
                />
                <input
                  name="user_quartier"
                  type="text"
                  placeholder="Quartier de livraison *"
                  required
                  className="w-full rounded-full border border-gray-300 dark:border-gray-500 dark:bg-gray-800 px-3 py-2 mb-2 text-sm"
                />
                <input
                  name="user_phone"
                  type="tel"
                  pattern="[0-9]*"
                  minLength={9}
                  maxLength={14}
                  placeholder="Téléphone * (9 à 14 chiffres)"
                  required
                  className={`w-full rounded-full border px-3 py-2 mb-1 text-sm dark:bg-gray-800 ${
                    phoneError
                      ? "border-red-500 dark:border-red-500"
                      : "border-gray-300 dark:border-gray-500"
                  }`}
                  onInput={(e) => {
                    // N'accepte que les chiffres
                    e.target.value = e.target.value.replace(/[^0-9]/g, '');
                    if (phoneError) setPhoneError('');
                  }}
                />
                {phoneError && (
                  <p role="alert" className="text-xs text-red-500 mb-2 px-2">
                    {phoneError}
                  </p>
                )}
                
                <div className="flex justify-center">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-primary to-secondary hover:scale-105 duration-200 text-white py-2 px-6 rounded-full text-sm disabled:opacity-50"
                  >
                    {isSubmitting ? "Commande en cours..." : `Confirmer la commande (${(isCartOrder ? getTotalPrice() : (selectedProduct?.priceInGNF || 0)).toLocaleString()} GNF)`}
                  </button>
                </div>
              </form>
                </>
              )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );});
export default Popup;