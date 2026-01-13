import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AverageRatingResult {
  averageRating: number;
  ratingCount: number;
  isLoading: boolean;
}

export function useAverageRating(releaseGroupId: string | undefined): AverageRatingResult {
  const { data, isLoading } = useQuery({
    queryKey: ['average-album-rating', releaseGroupId],
    queryFn: async () => {
      if (!releaseGroupId) return { avg: 0, count: 0 };
      
      const { data, error } = await supabase
        .from('album_ratings')
        .select('rating')
        .eq('release_group_id', releaseGroupId);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return { avg: 0, count: 0 };
      }
      
      const sum = data.reduce((acc, item) => acc + item.rating, 0);
      const avg = sum / data.length;
      
      return { avg, count: data.length };
    },
    enabled: !!releaseGroupId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    averageRating: data?.avg || 0,
    ratingCount: data?.count || 0,
    isLoading,
  };
}

// Hook to get multiple album ratings at once (more efficient for lists)
export function useMultipleAverageRatings(releaseGroupIds: string[]): {
  ratings: Map<string, { average: number; count: number }>;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ['average-album-ratings-batch', releaseGroupIds.sort().join(',')],
    queryFn: async () => {
      if (releaseGroupIds.length === 0) return new Map();
      
      const { data, error } = await supabase
        .from('album_ratings')
        .select('release_group_id, rating')
        .in('release_group_id', releaseGroupIds);
      
      if (error) throw error;
      
      // Group ratings by release_group_id
      const grouped = new Map<string, number[]>();
      data?.forEach(item => {
        const existing = grouped.get(item.release_group_id) || [];
        existing.push(item.rating);
        grouped.set(item.release_group_id, existing);
      });
      
      // Calculate averages
      const result = new Map<string, { average: number; count: number }>();
      grouped.forEach((ratings, id) => {
        const sum = ratings.reduce((acc, r) => acc + r, 0);
        result.set(id, { average: sum / ratings.length, count: ratings.length });
      });
      
      return result;
    },
    enabled: releaseGroupIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return {
    ratings: data || new Map(),
    isLoading,
  };
}
