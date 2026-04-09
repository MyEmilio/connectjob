const webpush = require("web-push");
const logger = require("./logger");

// VAPID keys for Web Push
// Generate your own keys: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTWKvtgw";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:contact@connectjob.ro";

// Configure web-push
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// In-memory subscription store (in production, use MongoDB)
const subscriptions = new Map(); // userId -> subscription

/**
 * Save a push subscription for a user
 */
const saveSubscription = (userId, subscription) => {
  subscriptions.set(String(userId), subscription);
  logger.info("Push subscription saved", { userId });
};

/**
 * Remove a push subscription
 */
const removeSubscription = (userId) => {
  subscriptions.delete(String(userId));
  logger.info("Push subscription removed", { userId });
};

/**
 * Get subscription for a user
 */
const getSubscription = (userId) => {
  return subscriptions.get(String(userId));
};

/**
 * Send a push notification to a user
 */
const sendPushNotification = async (userId, payload) => {
  const subscription = getSubscription(userId);
  
  if (!subscription) {
    logger.debug("No push subscription for user", { userId });
    return { sent: false, reason: "no_subscription" };
  }

  try {
    const notificationPayload = JSON.stringify({
      title: payload.title || "ConnectJob",
      body: payload.body || "",
      icon: payload.icon || "/logo192.png",
      badge: "/logo192.png",
      tag: payload.tag || "connectjob-notification",
      data: {
        url: payload.url || "/",
        ...payload.data,
      },
      actions: payload.actions || [],
      requireInteraction: payload.requireInteraction || false,
    });

    await webpush.sendNotification(subscription, notificationPayload);
    logger.info("Push notification sent", { userId, title: payload.title });
    return { sent: true };
  } catch (error) {
    logger.error("Push notification failed", { userId, error: error.message });
    
    // Remove invalid subscriptions
    if (error.statusCode === 410 || error.statusCode === 404) {
      removeSubscription(userId);
    }
    
    return { sent: false, error: error.message };
  }
};

/**
 * Notification templates
 */
const notifications = {
  // Application accepted
  applicationAccepted: (workerName, jobTitle, employerName) => ({
    title: "🎉 Aplicare acceptată!",
    body: `${employerName} ți-a acceptat aplicarea pentru "${jobTitle}"`,
    icon: "/logo192.png",
    tag: "application-accepted",
    url: "/chat",
    requireInteraction: true,
    actions: [
      { action: "open_chat", title: "💬 Contactează" },
      { action: "view_job", title: "📋 Vezi detalii" },
    ],
  }),

  // Application rejected
  applicationRejected: (workerName, jobTitle) => ({
    title: "📋 Actualizare aplicare",
    body: `Aplicarea ta pentru "${jobTitle}" nu a fost acceptată. Continuă să aplici!`,
    icon: "/logo192.png",
    tag: "application-rejected",
    url: "/jobs",
  }),

  // New message received
  newMessage: (senderName, messagePreview, conversationId) => ({
    title: `💬 Mesaj nou de la ${senderName}`,
    body: messagePreview.length > 60 ? messagePreview.substring(0, 60) + "..." : messagePreview,
    icon: "/logo192.png",
    tag: `message-${conversationId}`,
    url: "/chat",
    data: { conversationId },
    requireInteraction: false,
  }),

  // New application received (for employers)
  newApplication: (workerName, jobTitle) => ({
    title: "📩 Aplicare nouă!",
    body: `${workerName} a aplicat pentru "${jobTitle}"`,
    icon: "/logo192.png",
    tag: "new-application",
    url: "/jobs",
    requireInteraction: true,
    actions: [
      { action: "view_applications", title: "👀 Vezi aplicații" },
    ],
  }),

  // Contract signed
  contractSigned: (otherPartyName, jobTitle) => ({
    title: "✍️ Contract semnat!",
    body: `Contractul pentru "${jobTitle}" a fost semnat de ambele părți`,
    icon: "/logo192.png",
    tag: "contract-signed",
    url: "/contract",
    requireInteraction: true,
  }),

  // Payment released
  paymentReleased: (amount, jobTitle) => ({
    title: "💰 Plată primită!",
    body: `Ai primit ${amount} RON pentru "${jobTitle}"`,
    icon: "/logo192.png",
    tag: "payment-released",
    url: "/escrow",
    requireInteraction: true,
  }),
};

/**
 * Get VAPID public key for client
 */
const getVapidPublicKey = () => VAPID_PUBLIC_KEY;

module.exports = {
  saveSubscription,
  removeSubscription,
  getSubscription,
  sendPushNotification,
  notifications,
  getVapidPublicKey,
};
