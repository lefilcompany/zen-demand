import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAz0LHEMeuvAfP-NaiSk3jw1VNUIc0Ct14",
  authDomain: "soma-notifications.firebaseapp.com",
  projectId: "soma-notifications",
  storageBucket: "soma-notifications.firebasestorage.app",
  messagingSenderId: "471966948414",
  appId: "1:471966948414:web:4d33c7c8e2976a0fbec56f"
};

const VAPID_KEY = "BLJfh1Op3Lx2ZaHUboq0nR83mPcCOHoq1fANzmbb4awSIaX16jP0f4rr9_feQ_IFj1-wkoGoRkq5josFXPsXqw4";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

let messaging: Messaging | null = null;

// Only initialize messaging in browser environment with service worker support
export function getFirebaseMessaging(): Messaging | null {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  
  if (!messaging) {
    try {
      messaging = getMessaging(app);
    } catch (error) {
      console.error("Error initializing Firebase Messaging:", error);
      return null;
    }
  }
  
  return messaging;
}

export async function requestNotificationPermission(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    
    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }

    const fcmMessaging = getFirebaseMessaging();
    if (!fcmMessaging) {
      console.error("Firebase Messaging not available");
      return null;
    }

    // Register service worker first
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    
    // Get FCM token
    const token = await getToken(fcmMessaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    console.log("FCM Token obtained:", token);
    return token;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
}

export function onForegroundMessage(callback: (payload: any) => void): (() => void) | null {
  const fcmMessaging = getFirebaseMessaging();
  if (!fcmMessaging) return null;

  return onMessage(fcmMessaging, (payload) => {
    console.log("Foreground message received:", payload);
    callback(payload);
  });
}

export { app };
