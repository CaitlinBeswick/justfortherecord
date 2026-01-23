import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import PricingCard from "@/components/PricingCard";
import { Crown } from "lucide-react";

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="h-8 w-8 text-amber-500" />
            <h1 className="text-4xl font-bold">Membership</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upgrade to Pro for advanced stats, insights, and more features to enhance your music tracking experience.
          </p>
        </div>

        <PricingCard />

      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
