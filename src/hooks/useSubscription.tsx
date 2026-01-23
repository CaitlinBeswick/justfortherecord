import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type SubscriptionTier = "basic" | "pro";

interface SubscriptionState {
  subscribed: boolean;
  tier: SubscriptionTier;
  productId: string | null;
  subscriptionEnd: string | null;
  billingInterval: string | null;
  isLoading: boolean;
  error: string | null;
}

interface SubscriptionContextType extends SubscriptionState {
  checkSubscription: () => Promise<void>;
  isPro: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// Stripe product and price IDs (LIVE MODE)
export const STRIPE_CONFIG = {
  product_id: "prod_TqSrlvK1Q9mRcO",
  prices: {
    monthly: "price_1Sslw8KILKeJfkeH7oFahkOB",
    // yearly: "price_xxx" // Add when created in Stripe Dashboard
  }
};

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    tier: "basic",
    productId: null,
    subscriptionEnd: null,
    billingInterval: null,
    isLoading: true,
    error: null,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState(prev => ({ 
        ...prev, 
        subscribed: false, 
        tier: "basic", 
        isLoading: false,
        error: null 
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState(prev => ({ 
          ...prev, 
          subscribed: false, 
          tier: "basic", 
          isLoading: false 
        }));
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: error.message 
        }));
        return;
      }

      setState({
        subscribed: data.subscribed || false,
        tier: data.tier || "basic",
        productId: data.product_id || null,
        subscriptionEnd: data.subscription_end || null,
        billingInterval: data.billing_interval || null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  }, [user]);

  // Check subscription on mount and when user changes
  useEffect(() => {
    if (!authLoading) {
      checkSubscription();
    }
  }, [user, authLoading, checkSubscription]);

  // Auto-refresh subscription status every minute
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      checkSubscription();
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const value: SubscriptionContextType = {
    ...state,
    checkSubscription,
    isPro: state.tier === "pro" && state.subscribed,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
