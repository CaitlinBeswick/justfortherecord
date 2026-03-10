import { useNavigate } from "react-router-dom";
import { Bell, Check, Trash2, X, Disc3, UserPlus, Sparkles, Heart, MessageCircle } from "lucide-react";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "new_release":
      return <Disc3 className="h-5 w-5 text-primary" />;
    case "friend_request":
      return <UserPlus className="h-5 w-5 text-primary" />;
    case "app_update":
      return <Sparkles className="h-5 w-5 text-primary" />;
    case "activity_like":
      return <Heart className="h-5 w-5 text-primary" />;
    case "activity_comment":
    case "comment_reply":
      return <MessageCircle className="h-5 w-5 text-primary" />;
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />;
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case "new_release": return "New Release";
    case "friend_request": return "Friend Request";
    case "app_update": return "App Update";
    case "activity_like": return "Like";
    case "activity_comment": return "Comment";
    case "comment_reply": return "Reply";
    default: return "Notification";
  }
};

function NotificationItem({
  notification,
  onNavigate,
  onMarkRead,
  onDelete,
}: {
  notification: Notification;
  onNavigate: (n: Notification) => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "relative flex gap-4 p-4 sm:p-5 rounded-xl border transition-colors cursor-pointer group",
        notification.read
          ? "bg-card border-border hover:bg-muted/40"
          : "bg-primary/5 border-primary/20 hover:bg-primary/10"
      )}
      onClick={() => onNavigate(notification)}
    >
      {!notification.read && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
      )}

      <div className="flex-shrink-0 mt-0.5 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        {getNotificationIcon(notification.type)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {getTypeLabel(notification.type)}
          </span>
          <span className="text-xs text-muted-foreground/60">·</span>
          <span className="text-xs text-muted-foreground/60">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </span>
        </div>
        <h3 className={cn("text-sm sm:text-base", !notification.read && "font-semibold")}>
          {notification.title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
        <p className="text-xs text-muted-foreground/50 mt-2">
          {format(new Date(notification.created_at), "MMM d, yyyy 'at' h:mm a")}
        </p>
      </div>

      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications();

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);

    if (notification.type === "new_release" && notification.data && typeof notification.data === "object") {
      const data = notification.data as Record<string, unknown>;
      if (data.release_group_id && typeof data.release_group_id === "string") {
        navigate(`/album/${data.release_group_id}`);
      } else if (data.artist_id && typeof data.artist_id === "string") {
        navigate(`/artist/${data.artist_id}`);
      }
    } else if (notification.type === "friend_request" && notification.data && typeof notification.data === "object") {
      const data = notification.data as Record<string, unknown>;
      if (data.requester_id && typeof data.requester_id === "string") {
        navigate(`/user/${data.requester_id}`);
      }
    } else if (notification.type === "app_update") {
      const data =
        notification.data && typeof notification.data === "object"
          ? (notification.data as Record<string, unknown>)
          : null;
      const link = data?.link;
      if (typeof link === "string" && link.startsWith("/")) {
        navigate(link);
      } else {
        navigate("/whats-new");
      }
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-serif mb-2">Notifications</h1>
          <p className="text-muted-foreground mb-4">Sign in to see your notifications.</p>
          <Button onClick={() => navigate("/auth")}>Sign In</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-32">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {unreadCount} unread
              </p>
            )}
          </div>
          {notifications.length > 0 && (
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  <Check className="h-4 w-4 mr-1.5" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={clearAllNotifications}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Clear all
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Bell className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-sm mt-1">No notifications to show.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onNavigate={handleNotificationClick}
                onMarkRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
