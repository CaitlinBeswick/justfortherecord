import { Star } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RatingFilterProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function RatingFilter({ value, onChange, label = "Rating" }: RatingFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[140px]">
        <Star className="h-4 w-4 mr-2" />
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Ratings</SelectItem>
        <SelectItem value="5">★★★★★ (5)</SelectItem>
        <SelectItem value="4">★★★★☆ (4+)</SelectItem>
        <SelectItem value="3">★★★☆☆ (3+)</SelectItem>
        <SelectItem value="2">★★☆☆☆ (2+)</SelectItem>
        <SelectItem value="1">★☆☆☆☆ (1+)</SelectItem>
        <SelectItem value="unrated">Unrated</SelectItem>
      </SelectContent>
    </Select>
  );
}
