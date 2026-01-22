import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { VinylBackground } from "@/components/VinylBackground";
import { Sparkles, Calendar, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, format } from "date-fns";
import { useNavigate } from "react-router-dom";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const WhatsNew = () => {
  const navigate = useNavigate();
  
  const { data: updates = [], isLoading } = useQuery({
    queryKey: ['app-updates-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_updates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const handleUpdateClick = (link: string | null) => {
    if (link) {
      navigate(link);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <div className="gradient-hero absolute inset-0" />
      <VinylBackground fadeHeight="200%" density="sparse" />
      <Navbar />
      
      <main className="relative container mx-auto px-4 pt-24 pb-20 flex-1">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="font-serif text-4xl text-foreground">What's New</h1>
          </div>
          <p className="text-muted-foreground mb-8">
            Latest updates and improvements to Just For The Record
          </p>

          {isLoading ? (
            <div className="space-y-6 max-w-2xl">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-card/50 rounded-xl p-6 border border-border/50">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : updates.length === 0 ? (
            <div className="text-center py-20">
              <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No updates yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Check back soon for new features!</p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6 max-w-2xl"
            >
              {updates.map((update) => (
                <motion.div
                  key={update.id}
                  variants={itemVariants}
                  onClick={() => handleUpdateClick(update.link)}
                  className={`bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50 hover:border-primary/30 transition-colors ${update.link ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-foreground text-lg">{update.title}</h2>
                        {update.version && (
                          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                            v{update.version}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span title={format(new Date(update.created_at), 'PPP')}>
                          {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {update.link && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{update.description}</p>
                  {update.link && (
                    <p className="text-xs text-primary mt-3 flex items-center gap-1">
                      View feature <ChevronRight className="h-3 w-3" />
                    </p>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default WhatsNew;
