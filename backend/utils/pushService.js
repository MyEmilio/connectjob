const webpush = require("web-push");
const logger = require("./logger");

// VAPID keys for Web Push
// Generate your own keys: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTWKvtgw";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:contact@connectjob.ro";

// Configure web-push
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

/**
 * Save a push subscription for a user (MongoDB)
 */
const saveSubscription = async (userId, subscription) => {
  const User = require("../models/User");
  await User.findByIdAndUpdate(userId, { push_subscription: subscription });
  logger.info("Push subscription saved to DB", { userId });
};

/**
 * Remove a push subscription
 */
const removeSubscription = async (userId) => {
  const User = require("../models/User");
  await User.findByIdAndUpdate(userId, { push_subscription: null });
  logger.info("Push subscription removed from DB", { userId });
};

/**
 * Get subscription for a user
 */
const getSubscription = async (userId) => {
  const User = require("../models/User");
  const user = await User.findById(userId).lean();
  return user?.push_subscription;
};

/**
 * Send a push notification to a user
 */
const sendPushNotification = async (userId, payload) => {
  const subscription = await getSubscription(userId);
  
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
      await removeSubscription(userId);
    }
    
    return { sent: false, error: error.message };
  }
};

/**
 * Send notifications to users who have a category in their favorites
 */
const notifyUsersAboutNewJob = async (job) => {
  const User = require("../models/User");
  
  try {
    // Find users who have this job's category in their favorites and have notifications enabled
    const category = (job.category || "").toLowerCase();
    const users = await User.find({
      push_subscription: { $ne: null },
      notify_new_jobs: true,
      $or: [
        { favorite_categories: category },
        { favorite_categories: job.category },
      ],
    }).lean();

    logger.info("Notifying users about new job", { 
      jobId: job.id || job._id, 
      category, 
      usersCount: users.length 
    });

    const results = await Promise.all(
      users.map(user => 
        sendPushNotification(user._id || user.id, notifications.newJobInCategory(job.title, job.category, job.salary))
      )
    );

    return { notified: results.filter(r => r.sent).length, total: users.length };
  } catch (error) {
    logger.error("Error notifying users about new job", { error: error.message });
    return { notified: 0, error: error.message };
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
    body: `Ai primit ${amount} € pentru "${jobTitle}"`,
    icon: "/logo192.png",
    tag: "payment-released",
    url: "/escrow",
    requireInteraction: true,
  }),

  // New job in favorite category
  newJobInCategory: (jobTitle, category, salary) => ({
    title: "🆕 Job nou în categoria ta!",
    body: `"${jobTitle}" - ${salary} €${category ? ` în ${category}` : ""}`,
    icon: "/logo192.png",
    tag: "new-job-category",
    url: "/jobs",
    requireInteraction: true,
    actions: [
      { action: "view_job", title: "👀 Vezi jobul" },
      { action: "view_all", title: "📋 Toate joburile" },
    ],
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
  notifyUsersAboutNewJob,
  notifications,
  getVapidPublicKey,
};
