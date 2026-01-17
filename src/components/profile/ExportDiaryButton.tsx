import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DiaryEntry {
  id: string;
  release_group_id: string;
  album_title: string;
  artist_name: string;
  listened_on: string;
  is_relisten: boolean;
  notes: string | null;
}

interface AlbumRating {
  release_group_id: string;
  rating: number;
  loved: boolean;
  review_text?: string | null;
}

interface ExportDiaryButtonProps {
  entries: DiaryEntry[];
  ratings: AlbumRating[];
  year: number;
}

export function ExportDiaryButton({ entries, ratings, year }: ExportDiaryButtonProps) {
  const ratingsMap = new Map(ratings.map(r => [r.release_group_id, r]));

  const handleExport = () => {
    if (entries.length === 0) {
      toast.error("No entries to export");
      return;
    }

    // Create CSV content
    const headers = [
      "Date",
      "Album",
      "Artist",
      "Type",
      "Rating",
      "Loved",
      "Notes",
      "Review"
    ];

    const rows = entries.map(entry => {
      const rating = ratingsMap.get(entry.release_group_id);
      return [
        entry.listened_on,
        `"${entry.album_title.replace(/"/g, '""')}"`,
        `"${entry.artist_name.replace(/"/g, '""')}"`,
        entry.is_relisten ? "Re-listen" : "First listen",
        rating?.rating?.toString() || "",
        rating?.loved ? "Yes" : "",
        entry.notes ? `"${entry.notes.replace(/"/g, '""')}"` : "",
        rating?.review_text ? `"${rating.review_text.replace(/"/g, '""')}"` : ""
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `diary-${year}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${entries.length} entries`);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      className="h-8 gap-1.5"
    >
      <Download className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Export CSV</span>
    </Button>
  );
}
