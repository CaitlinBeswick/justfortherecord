import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eye, EyeOff, Edit2, RotateCcw } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface DigestEmailPreviewProps {
  onSubjectChange?: (subject: string) => void;
}

export function DigestEmailPreview({ onSubjectChange }: DigestEmailPreviewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Editable content
  const [subject, setSubject] = useState("Your Weekly Digest from Just For The Record");
  const [greeting, setGreeting] = useState("Hey {userName}, here's what happened this week");
  const [customNote, setCustomNote] = useState("");
  const [ctaText, setCtaText] = useState("Open Just For The Record");
  
  // Sample data for preview
  const sampleUserActivity = {
    albumsLogged: 7,
    artistsRated: 3,
    topAlbum: { title: "OK Computer", artist: "Radiohead", rating: 5 }
  };
  
  const sampleNewReleases = [
    { artist_name: "Taylor Swift", album_title: "The Tortured Poets Department" },
    { artist_name: "Billie Eilish", album_title: "HIT ME HARD AND SOFT" },
  ];
  
  const sampleFriendActivity = [
    { display_name: "MusicFan42", album_title: "Brat", artist_name: "Charli XCX", rating: 4 },
    { display_name: "VinylCollector", album_title: "Cowboy Carter", artist_name: "Beyoncé", rating: 5 },
  ];
  
  const sampleTrending = [
    { album_title: "Short n' Sweet", artist_name: "Sabrina Carpenter", listen_count: 23 },
    { album_title: "GNX", artist_name: "Kendrick Lamar", listen_count: 18 },
  ];
  
  const sampleAppUpdates = [
    { title: "Trophy Celebrations", description: "Confetti animation when you reach your listening goal!", version: "2.1" },
  ];

  const resetToDefaults = () => {
    setSubject("Your Weekly Digest from Just For The Record");
    setGreeting("Hey {userName}, here's what happened this week");
    setCustomNote("");
    setCtaText("Open Just For The Record");
  };

  // Generate the email HTML
  const generateEmailHtml = () => {
    const baseUrl = 'https://justfortherecord.lovable.app';
    const primaryColor = '#dc2626';
    const bgColor = '#faf8f5';
    const cardBg = '#ffffff';
    const textColor = '#1a1a1a';
    const mutedColor = '#6b7280';
    const borderColor = '#e5e2de';
    const logoDataUri = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij4KICA8Y2lyY2xlIGN4PSIzMiIgY3k9IjMyIiByPSIzMCIgZmlsbD0iIzFhMWExYSIvPgogIDxjaXJjbGUgY3g9IjMyIiBjeT0iMzIiIHI9IjI2IiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMC41Ii8+CiAgPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMjIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIwLjUiLz4KICA8Y2lyY2xlIGN4PSIzMiIgY3k9IjMyIiByPSIxOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjAuNSIvPgogIDxjaXJjbGUgY3g9IjMyIiBjeT0iMzIiIHI9IjEyIiBmaWxsPSIjZGMyNjI2Ii8+CiAgPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iNCIgZmlsbD0iIzFhMWExYSIvPgogIDxjaXJjbGUgY3g9IjMyIiBjeT0iMzIiIHI9IjIiIGZpbGw9IiNmZmYiLz4KPC9zdmc+';

    const displayGreeting = greeting.replace('{userName}', 'John');

    // Custom note section
    const customNoteHtml = customNote ? `
      <div style="margin-bottom: 32px; background-color: ${primaryColor}10; border: 1px solid ${primaryColor}30; border-radius: 12px; padding: 24px;">
        <p style="color: ${textColor}; font-size: 15px; margin: 0; line-height: 1.6;">${customNote}</p>
      </div>
    ` : '';

    // User summary section
    const userSummaryHtml = `
      <div style="margin-bottom: 32px; background-color: ${cardBg}; border: 1px solid ${borderColor}; border-radius: 12px; padding: 24px;">
        <h2 style="font-family: 'Georgia', serif; color: ${textColor}; font-size: 20px; margin: 0 0 16px 0; font-weight: 500;">
          Your Week in Review
        </h2>
        <table style="width: 100%;">
          <tr>
            <td style="text-align: center; padding: 0 12px;">
              <p style="font-size: 32px; font-weight: 600; color: ${primaryColor}; margin: 0;">${sampleUserActivity.albumsLogged}</p>
              <p style="font-size: 14px; color: ${mutedColor}; margin: 4px 0 0 0;">Albums logged</p>
            </td>
            <td style="text-align: center; padding: 0 12px;">
              <p style="font-size: 32px; font-weight: 600; color: ${primaryColor}; margin: 0;">${sampleUserActivity.artistsRated}</p>
              <p style="font-size: 14px; color: ${mutedColor}; margin: 4px 0 0 0;">Artists rated</p>
            </td>
          </tr>
        </table>
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid ${borderColor};">
          <p style="font-size: 12px; color: ${mutedColor}; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Top rated this week</p>
          <p style="font-size: 16px; color: ${textColor}; margin: 0; font-weight: 500;">${sampleUserActivity.topAlbum.title}</p>
          <p style="font-size: 14px; color: ${mutedColor}; margin: 4px 0 0 0;">by ${sampleUserActivity.topAlbum.artist} · ${sampleUserActivity.topAlbum.rating} stars</p>
        </div>
      </div>
    `;

    // New releases section
    const releasesItems = sampleNewReleases.map(r => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid ${borderColor};">
          <a href="${baseUrl}/album/sample" style="color: ${textColor}; text-decoration: none; font-weight: 500;">
            ${r.album_title}
          </a>
          <br>
          <span style="color: ${mutedColor}; font-size: 14px;">by ${r.artist_name}</span>
        </td>
      </tr>
    `).join('');

    const releasesHtml = `
      <div style="margin-bottom: 32px; background-color: ${cardBg}; border: 1px solid ${borderColor}; border-radius: 12px; padding: 24px;">
        <h2 style="font-family: 'Georgia', serif; color: ${textColor}; font-size: 20px; margin: 0 0 16px 0; font-weight: 500;">
          New Releases
        </h2>
        <table style="width: 100%; border-collapse: collapse;">
          ${releasesItems}
        </table>
      </div>
    `;

    // Friend activity section
    const activityItems = sampleFriendActivity.map(a => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid ${borderColor};">
          <span style="color: ${primaryColor}; font-weight: 500;">${a.display_name}</span>
          <span style="color: ${mutedColor};"> listened to </span>
          <a href="${baseUrl}/album/sample" style="color: ${textColor}; text-decoration: none; font-weight: 500;">
            ${a.album_title}
          </a>
          <span style="color: ${mutedColor};"> by ${a.artist_name}</span>
          <span style="color: ${primaryColor}; margin-left: 8px;">★ ${a.rating}</span>
        </td>
      </tr>
    `).join('');

    const activityHtml = `
      <div style="margin-bottom: 32px; background-color: ${cardBg}; border: 1px solid ${borderColor}; border-radius: 12px; padding: 24px;">
        <h2 style="font-family: 'Georgia', serif; color: ${textColor}; font-size: 20px; margin: 0 0 16px 0; font-weight: 500;">
          Friend Activity
        </h2>
        <table style="width: 100%; border-collapse: collapse;">
          ${activityItems}
        </table>
      </div>
    `;

    // Trending section
    const trendingItems = sampleTrending.map(t => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid ${borderColor};">
          <a href="${baseUrl}/album/sample" style="color: ${textColor}; text-decoration: none; font-weight: 500;">
            ${t.album_title}
          </a>
          <br>
          <span style="color: ${mutedColor}; font-size: 14px;">by ${t.artist_name}</span>
          <span style="color: ${mutedColor}; font-size: 13px; margin-left: 8px;">(${t.listen_count} listens)</span>
        </td>
      </tr>
    `).join('');

    const trendingHtml = `
      <div style="margin-bottom: 32px; background-color: ${cardBg}; border: 1px solid ${borderColor}; border-radius: 12px; padding: 24px;">
        <h2 style="font-family: 'Georgia', serif; color: ${textColor}; font-size: 20px; margin: 0 0 16px 0; font-weight: 500;">
          Trending This Week
        </h2>
        <table style="width: 100%; border-collapse: collapse;">
          ${trendingItems}
        </table>
      </div>
    `;

    // App updates section
    const updateItems = sampleAppUpdates.map(u => `
      <div style="padding: 12px 0; border-bottom: 1px solid ${borderColor};">
        <p style="color: ${textColor}; font-weight: 500; margin: 0 0 4px 0;">
          ${u.title}
          <span style="color: ${mutedColor}; font-size: 12px; margin-left: 8px;">v${u.version}</span>
        </p>
        <p style="color: ${mutedColor}; font-size: 14px; margin: 0;">${u.description}</p>
      </div>
    `).join('');

    const updatesHtml = `
      <div style="margin-bottom: 32px; background-color: ${cardBg}; border: 1px solid ${borderColor}; border-radius: 12px; padding: 24px;">
        <h2 style="font-family: 'Georgia', serif; color: ${textColor}; font-size: 20px; margin: 0 0 16px 0; font-weight: 500;">
          What's New
        </h2>
        ${updateItems}
      </div>
    `;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; }
        </style>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${bgColor}; color: ${textColor}; padding: 40px 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto;">
          <!-- Header with Logo -->
          <div style="text-align: center; margin-bottom: 32px;">
            <img src="${logoDataUri}" alt="Just For The Record" style="width: 64px; height: 64px; margin-bottom: 16px; border-radius: 12px; display: block; margin-left: auto; margin-right: auto;" />
            <h1 style="font-family: 'Georgia', serif; color: ${textColor}; font-size: 28px; margin: 0 0 8px 0; font-weight: 500;">Your Weekly Digest</h1>
            <p style="color: ${mutedColor}; font-size: 16px; margin: 0;">${displayGreeting}</p>
          </div>
          
          ${customNoteHtml}
          ${userSummaryHtml}
          ${releasesHtml}
          ${activityHtml}
          ${trendingHtml}
          ${updatesHtml}
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${baseUrl}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
              ${ctaText}
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid ${borderColor}; margin: 32px 0;">
          <p style="color: ${mutedColor}; font-size: 12px; text-align: center; margin: 0;">
            You're receiving this weekly digest because you opted in.
            <br><br>
            <a href="${baseUrl}/profile/settings" style="color: ${mutedColor}; text-decoration: underline;">Manage email preferences</a>
          </p>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Weekly Digest Email</CardTitle>
            <CardDescription>Preview and customize the weekly digest email template</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              {isEditing ? "Done Editing" : "Edit Template"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide Preview
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Show Preview
                </>
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
                <Label htmlFor="subject">Email Subject Line</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    onSubjectChange?.(e.target.value);
                  }}
                  placeholder="Your Weekly Digest from Just For The Record"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="greeting">
                  Greeting Message
                  <span className="text-muted-foreground text-xs ml-2">
                    Use {"{userName}"} for personalization
                  </span>
                </Label>
                <Input
                  id="greeting"
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  placeholder="Hey {userName}, here's what happened this week"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="customNote">
                  Custom Note (Optional)
                  <span className="text-muted-foreground text-xs ml-2">
                    Add a personal message to this week's digest
                  </span>
                </Label>
                <Textarea
                  id="customNote"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="e.g., We've got some exciting updates this week! Check out the new trophy celebration feature..."
                  rows={3}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="ctaText">Call-to-Action Button Text</Label>
                <Input
                  id="ctaText"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="Open Just For The Record"
                />
              </div>
              
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={resetToDefaults}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
      
      <Collapsible open={showPreview}>
        <CollapsibleContent>
          <CardContent className={isEditing ? "" : "border-t pt-4"}>
            <div className="mb-3 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Subject:</strong> {subject}
              </p>
            </div>
            <div 
              className="border rounded-lg overflow-hidden"
              style={{ height: "600px" }}
            >
              <iframe
                srcDoc={generateEmailHtml()}
                title="Email Preview"
                className="w-full h-full border-0"
                sandbox="allow-same-origin"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              This preview uses sample data. Actual emails will contain personalized content for each user.
            </p>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
