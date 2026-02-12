import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const supported = 
      'serviceWorker' in navigator && 
      'PushManager' in window && 
      'Notification' in window;
    
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Fetch VAPID public key
  useEffect(() => {
    if (!isSupported) return;

    const fetchVapidKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-vapid-key');
        if (error) {
          console.error('Error fetching VAPID key:', error);
          return;
        }
        if (data?.publicKey) {
          setVapidPublicKey(data.publicKey);
        }
      } catch (err) {
        console.error('Failed to fetch VAPID key:', err);
      }
    };

    fetchVapidKey();
  }, [isSupported]);

  // Check current subscription status
  useEffect(() => {
    if (!isSupported || !user) {
      setIsLoading(false);
      return;
    }

    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready as ServiceWorkerRegistration & { pushManager: PushManager };
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          // Verify subscription exists in database
          const { data } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .eq('endpoint', subscription.endpoint)
            .maybeSingle();
          
          setIsSubscribed(!!data);
        } else {
          setIsSubscribed(false);
        }
      } catch (error) {
        console.error('Error checking push subscription:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, [isSupported, user]);

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if (!isSupported) return null;
    
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('Service Worker registered:', registration.scope);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!user || !isSupported) {
      toast.error("Push notifications not supported");
      return false;
    }

    if (!vapidPublicKey) {
      toast.error("Push notifications not configured");
      console.error("VAPID public key not available");
      return false;
    }

    setIsLoading(true);

    try {
      // Request notification permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      
      if (permissionResult !== 'granted') {
        toast.error("Notification permission denied");
        setIsLoading(false);
        return false;
      }

      // Register service worker
      const registration = await registerServiceWorker();
      if (!registration) {
        throw new Error("Failed to register service worker");
      }

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await (registration as ServiceWorkerRegistration & { pushManager: PushManager }).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer
      });

      // Extract keys from subscription
      const subscriptionJson = subscription.toJSON();
      const p256dh = subscriptionJson.keys?.p256dh;
      const auth = subscriptionJson.keys?.auth;

      if (!p256dh || !auth) {
        throw new Error("Failed to get subscription keys");
      }

      // Save subscription to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh,
          auth
        } as any, {
          onConflict: 'user_id,endpoint'
        });

      if (error) throw error;

      // Update profile preference
      await supabase
        .from('profiles')
        .update({ push_notifications_enabled: true } as any)
        .eq('id', user.id);

      setIsSubscribed(true);
      toast.success("Push notifications enabled!");
      return true;

    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error("Failed to enable push notifications");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported, vapidPublicKey, registerServiceWorker]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!user || !isSupported) return false;

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready as ServiceWorkerRegistration & { pushManager: PushManager };
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push
        await subscription.unsubscribe();

        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }

      // Update profile preference
      await supabase
        .from('profiles')
        .update({ push_notifications_enabled: false } as any)
        .eq('id', user.id);

      setIsSubscribed(false);
      toast.success("Push notifications disabled");
      return true;

    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      toast.error("Failed to disable push notifications");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe
  };
}
