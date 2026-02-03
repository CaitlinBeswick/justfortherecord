import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, RotateCcw, Play, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { StarRating } from "@/components/ui/StarRating";
import { cn } from "@/lib/utils";

interface DiaryEntry {
  id: string;
  release_group_id: string;
  album_title: string;
  artist_name: string;
  listened_on: string;
  is_relisten: boolean;
  notes: string | null;
  rating?: number | null;
  created_at: string;
}

interface EditDiaryEntryDialogProps {
  entry: DiaryEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (entryId: string, updates: { listened_on: string; is_relisten: boolean; notes: string | null; rating?: number | null }) => void;
  isPending?: boolean;
}

export function EditDiaryEntryDialog({
  entry,
  open,
  onOpenChange,
  onSave,
  isPending = false,
}: EditDiaryEntryDialogProps) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [isRelisten, setIsRelisten] = useState(false);
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Reset form when entry changes
  useEffect(() => {
    if (entry) {
      setDate(new Date(entry.listened_on));
      setIsRelisten(entry.is_relisten);
      setNotes(entry.notes || "");
      setRating(entry.rating ?? 0);
    }
  }, [entry]);

  const handleSave = () => {
    if (!entry || !date) return;
    
    onSave(entry.id, {
      listened_on: format(date, "yyyy-MM-dd"),
      is_relisten: isRelisten,
      notes: notes.trim() || null,
      rating: rating > 0 ? rating : null,
    });
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Edit Diary Entry
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Album info */}
          <div className="text-sm">
            <p className="font-medium text-foreground">{entry.album_title}</p>
            <p className="text-muted-foreground">{entry.artist_name}</p>
          </div>

          {/* Date picker */}
          <div className="space-y-2">
            <Label>Listen Date</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => {
                    setDate(newDate);
                    setCalendarOpen(false);
                  }}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Relisten toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-3">
              {isRelisten ? (
                <RotateCcw className="h-4 w-4 text-primary" />
              ) : (
                <Play className="h-4 w-4 text-green-500" />
              )}
              <div>
                <Label htmlFor="relisten-toggle" className="cursor-pointer">
                  Re-listen
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isRelisten ? "You've heard this before" : "First time listening"}
                </p>
              </div>
            </div>
            <Switch
              id="relisten-toggle"
              checked={isRelisten}
              onCheckedChange={setIsRelisten}
            />
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex items-center gap-3">
              <StarRating
                rating={rating}
                size="lg"
                interactive
                onRatingChange={setRating}
              />
              {rating > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground h-auto py-1 px-2"
                  onClick={() => setRating(0)}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="How was the listening experience?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending || !date}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
