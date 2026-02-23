import { Bell, Check, Trash2, X, Disc3, UserPlus, Sparkles, Heart, MessageCircle } from "lucide-react";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const navigate = useNavigate();
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
    
    // Navigate based on notification type and data
    if (notification.type === 'new_release' && notification.data && typeof notification.data === 'object') {
      const data = notification.data as Record<string, unknown>;
      if (data.release_group_id && typeof data.release_group_id === 'string') {
        navigate(`/album/${data.release_group_id}`);
      } else if (data.artist_id && typeof data.artist_id === 'string') {
        navigate(`/artist/${data.artist_id}`);
      }
    } else if (notification.type === 'friend_request' && notification.data && typeof notification.data === 'object') {
      const data = notification.data as Record<string, unknown>;
      if (data.requester_id && typeof data.requester_id === 'string') {
        navigate(`/user/${data.requester_id}`);
      }
    } else if (notification.type === 'app_update') {
      const data = (notification.data && typeof notification.data === 'object')
        ? (notification.data as Record<string, unknown>)
        : null;
      const link = data?.link;
      if (typeof link === 'string' && link.startsWith('/')) {
        navigate(link);
      } else {
        navigate('/whats-new');
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_release':
        return <Disc3 className="h-4 w-4 text-primary" />;
      case 'friend_request':
        return <UserPlus className="h-4 w-4 text-primary" />;
      case 'app_update':
        return <Sparkles className="h-4 w-4 text-primary" />;
      case 'activity_like':
        return <Heart className="h-4 w-4 text-primary" />;
      case 'activity_comment':
      case 'comment_reply':
        return <MessageCircle className="h-4 w-4 text-primary" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" side="bottom" sideOffset={8} collisionPadding={{ top: 16, bottom: 16, left: 16, right: 8 }} avoidCollisions={true}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {notifications.length > 0 && (
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs h-7"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllNotifications}
                className="text-xs h-7 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-20 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 hover:bg-muted/50 cursor-pointer transition-colors relative group",
                    !notification.read && "bg-primary/5"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm",
                        !notification.read && "font-medium"
                      )}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  {!notification.read && (
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
