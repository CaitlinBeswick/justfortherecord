import { useState } from "react";
import { CalendarIcon, RotateCcw, Plus } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

interface LogListenDialogProps {
  releaseGroupId: string;
  albumTitle: string;
  artistName: string;
  hasListenedBefore?: boolean;
  trigger?: React.ReactNode;
}

export function LogListenDialog({
  releaseGroupId,
  albumTitle,
  artistName,
  hasListenedBefore = false,
  trigger,
}: LogListenDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [isRelisten, setIsRelisten] = useState(hasListenedBefore);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in to log listens");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("diary_entries").insert({
      user_id: user.id,
      release_group_id: releaseGroupId,
      album_title: albumTitle,
      artist_name: artistName,
      listened_on: format(date, "yyyy-MM-dd"),
      is_relisten: isRelisten,
      notes: notes || null,
    });

    setSaving(false);

    if (error) {
      console.error("Error logging listen:", error);
      toast.error("Failed to log listen");
    } else {
      toast.success(isRelisten ? "Re-listen logged!" : "Listen logged!");
      queryClient.invalidateQueries({ queryKey: ["diary-entries"] });
      queryClient.invalidateQueries({ queryKey: ["album-diary-entries", releaseGroupId] });
      setOpen(false);
      setNotes("");
      setDate(new Date());
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Log
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Log Listen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Album Info */}
          <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
            <p className="font-medium text-sm">{albumTitle}</p>
            <p className="text-xs text-muted-foreground">{artistName}</p>
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Date Listened</Label>
            <Popover>
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
                  onSelect={(d) => d && setDate(d)}
                  disabled={(d) => d > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Re-listen Checkbox */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card/50">
            <Checkbox
              id="relisten"
              checked={isRelisten}
              onCheckedChange={(checked) => setIsRelisten(checked === true)}
            />
            <div className="flex-1">
              <Label htmlFor="relisten" className="cursor-pointer flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-primary" />
                Re-listen
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Check if you've listened to this album before
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="How was this listen?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full"
          >
            {saving ? "Logging..." : isRelisten ? "Log Re-listen" : "Log Listen"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
