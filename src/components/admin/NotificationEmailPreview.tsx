import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Edit2, RotateCcw, Loader2, Send } from "lucide-react";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type NotificationType = "new_release" | "friend_request" | "friend_accepted" | "generic";

const SAMPLE_DATA: Record<NotificationType, { title: string; message: string; data?: Record<string, unknown> }> = {
  new_release: {
    title: "New Release: Brat by Charli xcx",
    message: "Charli xcx just released a new album!",
    data: {
      release_group_id: "b3b98b9c-3373-4c6e-b149-4ecfa498a814",
      artist_id: "260b6184-8828-48eb-945c-bc4cb6fc34ca",
      artist_name: "Charli xcx",
      album_title: "Brat",
      release_date: "2024-06-07",
    },
  },
  friend_request: {
    title: "New Follow Request",
    message: "Someone wants to follow you!",
    data: { requester_name: "MusicFan42" },
  },
  friend_accepted: {
    title: "You're Now Connected!",
    message: "Your follow request was accepted!",
    data: { accepter_name: "VinylCollector" },
  },
  generic: {
    title: "Just For The Record",
    message: "You have a new notification on Just For The Record.",
  },
};

function formatDateDDMMYYYY(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return dateStr;
  }
}

function generateNotificationEmailHtml(
  type: NotificationType,
  sampleTitle: string,
  sampleMessage: string,
  sampleData?: Record<string, unknown>,
  artistName?: string,
  albumTitle?: string,
  releaseDate?: string,
) {
  const baseUrl = 'https://justfortherecord.lovable.app';

  const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Just For The Record</title>
</head>
<body style="margin:0;padding:0;background-color:#dc2626;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#dc2626;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <img src="${baseUrl}/email-logo.png" alt="Just For The Record" width="48" height="48" style="border-radius:50%;display:block;margin:0 auto 12px auto;" />
              <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">Just For The Record</span>
            </td>
          </tr>
        </table>
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:40px 36px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;padding:20px 36px;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
                <a href="${baseUrl}/profile/settings" style="color:#9ca3af;text-decoration:underline;">Manage email preferences</a>
                &nbsp;·&nbsp;
                <a href="${baseUrl}" style="color:#9ca3af;text-decoration:underline;">justfortherecord.lovable.app</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const data = sampleData || {};
  const aName = artistName || data.artist_name as string || "Charli xcx";
  const aTitle = albumTitle || data.album_title as string || "Brat";
  const rDate = releaseDate || data.release_date as string || "2024-06-07";
  const rgId = data.release_group_id as string || "sample";
  const artistId = data.artist_id as string || "sample";
  const albumUrl = `${baseUrl}/album/${rgId}`;
  const artistUrl = `${baseUrl}/artist/${artistId}`;
  const coverArtUrl = `https://coverartarchive.org/release-group/${rgId}/front-250`;
  const releaseDateStr = rDate ? formatDateDDMMYYYY(rDate) : '';

  if (type === "new_release") {
    return emailWrapper(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="width:48px;height:48px;background-color:#dc2626;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
          <span style="font-size:24px;">🎵</span>
        </div>
        <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 4px 0;">New Release</h1>
        <p style="color:#6b7280;font-size:14px;margin:0;">From an artist you follow</p>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr>
          <td width="100" valign="top" style="padding-right:20px;">
            <img src="${coverArtUrl}" alt="${aTitle}" width="100" height="100" style="border-radius:8px;display:block;object-fit:cover;background-color:#f3f4f6;" />
          </td>
          <td valign="top">
            <h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 4px 0;">${aTitle}</h2>
            <p style="color:#dc2626;font-size:15px;font-weight:600;margin:0 0 8px 0;">
              <a href="${artistUrl}" style="color:#dc2626;text-decoration:none;">${aName}</a>
            </p>
            ${releaseDateStr ? `<p style="color:#9ca3af;font-size:13px;margin:0;">Released ${releaseDateStr}</p>` : ''}
          </td>
        </tr>
      </table>
      <div style="text-align:center;margin:32px 0;">
        <a href="${albumUrl}" style="display:inline-block;background-color:#dc2626;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">Listen Now</a>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
        You're receiving this because you follow <a href="${artistUrl}" style="color:#dc2626;text-decoration:none;">${aName}</a> on Just For The Record.
      </p>
    `);
  }

  if (type === "friend_request") {
    const requesterName = data.requester_name as string || "MusicFan42";
    return emailWrapper(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="width:64px;height:64px;background-color:#fef2f2;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:32px;">👋</div>
        <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 8px 0;">New Follow Request</h1>
        <p style="color:#374151;font-size:16px;margin:0;">
          <strong style="color:#dc2626;">${requesterName}</strong> wants to follow you on Just For The Record.
        </p>
      </div>
      <div style="text-align:center;margin:32px 0;">
        <a href="${baseUrl}/profile/friends" style="display:inline-block;background-color:#dc2626;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">View Request</a>
      </div>
    `);
  }

  if (type === "friend_accepted") {
    const accepterName = data.accepter_name as string || "VinylCollector";
    return emailWrapper(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="width:64px;height:64px;background-color:#fef2f2;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:32px;">🎉</div>
        <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 8px 0;">You're Now Connected!</h1>
        <p style="color:#374151;font-size:16px;margin:0 0 8px 0;">
          <strong style="color:#dc2626;">${accepterName}</strong> accepted your follow request!
        </p>
        <p style="color:#6b7280;font-size:14px;margin:0;">You can now see their listening activity and diary entries.</p>
      </div>
      <div style="text-align:center;margin:32px 0;">
        <a href="${baseUrl}/following" style="display:inline-block;background-color:#dc2626;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">See Their Activity</a>
      </div>
    `);
  }

  // Generic
  return emailWrapper(`
    <div style="text-align:center;margin-bottom:28px;">
      <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 8px 0;">${sampleTitle}</h1>
      <p style="color:#374151;font-size:16px;line-height:1.6;margin:0;">${sampleMessage}</p>
    </div>
    <div style="text-align:center;margin:32px 0;">
      <a href="${baseUrl}" style="display:inline-block;background-color:#dc2626;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">Open Just For The Record</a>
    </div>
  `);
}

export function NotificationEmailPreview() {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<NotificationType>("new_release");

  // Editable fields for new_release
  const [artistName, setArtistName] = useState("Charli xcx");
  const [albumTitle, setAlbumTitle] = useState("Brat");
  const [releaseDate, setReleaseDate] = useState("2024-06-07");

  // Editable fields for friend types
  const [friendName, setFriendName] = useState("MusicFan42");

  // Editable fields for generic
  const [genericTitle, setGenericTitle] = useState("Just For The Record");
  const [genericMessage, setGenericMessage] = useState("You have a new notification.");

  const resetToDefaults = () => {
    const defaults = SAMPLE_DATA[selectedType];
    if (selectedType === "new_release") {
      setArtistName("Charli xcx");
      setAlbumTitle("Brat");
      setReleaseDate("2024-06-07");
    } else if (selectedType === "friend_request") {
      setFriendName("MusicFan42");
    } else if (selectedType === "friend_accepted") {
      setFriendName("VinylCollector");
    } else {
      setGenericTitle(defaults.title);
      setGenericMessage(defaults.message);
    }
  };

  const getCurrentData = (): Record<string, unknown> => {
    if (selectedType === "new_release") {
      return {
        ...SAMPLE_DATA.new_release.data,
        artist_name: artistName,
        album_title: albumTitle,
        release_date: releaseDate,
      };
    }
    if (selectedType === "friend_request") return { requester_name: friendName };
    if (selectedType === "friend_accepted") return { accepter_name: friendName };
    return {};
  };

  const getCurrentTitle = () => {
    if (selectedType === "new_release") return `New Release: ${albumTitle} by ${artistName}`;
    if (selectedType === "friend_request") return "New Follow Request";
    if (selectedType === "friend_accepted") return "You're Now Connected!";
    return genericTitle;
  };

  const getCurrentMessage = () => {
    if (selectedType === "generic") return genericMessage;
    return SAMPLE_DATA[selectedType].message;
  };

  const handleSendTest = async () => {
    setIsSendingTest(true);
    setTestDialogOpen(false);

    try {
      const { data, error } = await supabase.functions.invoke("send-notification-email", {
        body: {
          notification_type: selectedType,
          title: getCurrentTitle(),
          message: getCurrentMessage(),
          data: getCurrentData(),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Test email sent!",
        description: "Check your inbox for the notification email.",
      });
    } catch (error) {
      console.error("Failed to send test notification:", error);
      toast({
        title: "Failed to send",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const emailHtml = generateNotificationEmailHtml(
    selectedType,
    getCurrentTitle(),
    getCurrentMessage(),
    getCurrentData(),
    selectedType === "new_release" ? artistName : undefined,
    selectedType === "new_release" ? albumTitle : undefined,
    selectedType === "new_release" ? releaseDate : undefined,
  );

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-lg">Notification Emails</CardTitle>
            <CardDescription>Preview and test notification email templates</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <AlertDialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={isSendingTest}>
                  {isSendingTest ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Test to Me
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Send Test Notification?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will send a test "{selectedType.replace(/_/g, ' ')}" notification email to your email address.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSendTest}>Send Test Email</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
              <Edit2 className="h-4 w-4 mr-2" />
              {isEditing ? "Cancel" : "Edit Sample Data"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? (
                <><EyeOff className="h-4 w-4 mr-2" />Hide Preview</>
              ) : (
                <><Eye className="h-4 w-4 mr-2" />Show Preview</>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <Collapsible open={isEditing}>
        <CollapsibleContent>
          <CardContent className="border-t pt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Notification Type</Label>
                <Select value={selectedType} onValueChange={(v) => setSelectedType(v as NotificationType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new_release">New Release</SelectItem>
                    <SelectItem value="friend_request">Follow Request</SelectItem>
                    <SelectItem value="friend_accepted">Follow Accepted</SelectItem>
                    <SelectItem value="generic">Generic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedType === "new_release" && (
                <>
                  <div className="grid gap-2">
                    <Label>Artist Name</Label>
                    <Input value={artistName} onChange={(e) => setArtistName(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Album Title</Label>
                    <Input value={albumTitle} onChange={(e) => setAlbumTitle(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Release Date</Label>
                    <Input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
                  </div>
                </>
              )}

              {(selectedType === "friend_request" || selectedType === "friend_accepted") && (
                <div className="grid gap-2">
                  <Label>{selectedType === "friend_request" ? "Requester Name" : "Accepter Name"}</Label>
                  <Input value={friendName} onChange={(e) => setFriendName(e.target.value)} />
                </div>
              )}

              {selectedType === "generic" && (
                <>
                  <div className="grid gap-2">
                    <Label>Title</Label>
                    <Input value={genericTitle} onChange={(e) => setGenericTitle(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Message</Label>
                    <Input value={genericMessage} onChange={(e) => setGenericMessage(e.target.value)} />
                  </div>
                </>
              )}

              <Button variant="ghost" size="sm" onClick={resetToDefaults} className="w-fit">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={showPreview}>
        <CollapsibleContent>
          <CardContent className={isEditing ? "" : "border-t pt-4"}>
            <div className="mb-3 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Subject:</strong> {getCurrentTitle()}
              </p>
            </div>
            <div className="border rounded-lg overflow-hidden" style={{ height: "600px" }}>
              <iframe
                srcDoc={emailHtml}
                title="Notification Email Preview"
                className="w-full h-full border-0"
                sandbox="allow-same-origin"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              This preview uses sample data. Actual emails will contain real notification content.
            </p>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
