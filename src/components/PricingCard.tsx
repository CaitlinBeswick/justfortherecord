import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Crown, Loader2 } from "lucide-react";
import { useSubscription, STRIPE_CONFIG } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const PricingCard = () => {
  const { isPro, tier, subscriptionEnd, billingInterval, isLoading: subLoading, checkSubscription } = useSubscription();
  const { user } = useAuth();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!user) {
      toast.error("Please sign in to subscribe");
      return;
    }

    setIsCheckoutLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to subscribe");
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          priceId: STRIPE_CONFIG.prices.monthly,
          billingCycle: 'monthly',
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;

    setIsPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to manage subscription");
        return;
      }

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening portal:', error);
      toast.error("Failed to open subscription portal. Please try again.");
    } finally {
      setIsPortalLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const features = [
    "Log unlimited albums",
    "Rate and review music",
    "Create custom lists",
    "Follow friends",
    "Track listening goals",
  ];

  const proFeatures = [
    "Advanced stats & insights",
    "Annual listening reports",
    "Trend analysis",
    "Priority support",
  ];

  if (subLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
      {/* Basic Tier */}
      <Card className={`relative ${tier === 'basic' && !isPro ? 'border-primary ring-2 ring-primary' : ''}`}>
        {tier === 'basic' && !isPro && (
          <Badge className="absolute -top-2 left-4 bg-primary">Current Plan</Badge>
        )}
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Basic
          </CardTitle>
          <CardDescription>Free forever</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-6">£0<span className="text-sm font-normal text-muted-foreground">/month</span></div>
          <ul className="space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                {feature}
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" disabled>
            {tier === 'basic' ? 'Current Plan' : 'Downgrade'}
          </Button>
        </CardFooter>
      </Card>

      {/* Pro Tier */}
      <Card className={`relative ${isPro ? 'border-amber-500 ring-2 ring-amber-500' : 'border-amber-500/50'}`}>
        {isPro && (
          <Badge className="absolute -top-2 left-4 bg-amber-500">Your Plan</Badge>
        )}
        <div className="absolute -top-2 right-4">
          <Badge variant="secondary" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
            <Sparkles className="h-3 w-3 mr-1" />
            Pro
          </Badge>
        </div>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Pro
          </CardTitle>
          <CardDescription>For music enthusiasts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-2">
            £0.99<span className="text-sm font-normal text-muted-foreground">/month</span>
          </div>
          {isPro && subscriptionEnd && (
            <p className="text-xs text-muted-foreground mb-4">
              Renews {formatDate(subscriptionEnd)} ({billingInterval})
            </p>
          )}
          <ul className="space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                {feature}
              </li>
            ))}
            {proFeatures.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <Sparkles className="h-4 w-4" />
                {feature}
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          {isPro ? (
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleManageSubscription}
              disabled={isPortalLoading}
            >
              {isPortalLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Manage Subscription'
              )}
            </Button>
          ) : (
            <Button 
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              onClick={handleSubscribe}
              disabled={isCheckoutLoading || !user}
            >
              {isCheckoutLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : !user ? (
                'Sign in to Subscribe'
              ) : (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default PricingCard;
