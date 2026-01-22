import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Send, Trash2, User, ChevronDown, ChevronUp, Reply, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useActivityInteractions, ActivityType } from "@/hooks/useActivityInteractions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";

interface CommentProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface CommentWithReplies {
  id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  parent_comment_id: string | null;
  profile?: CommentProfile;
  replies?: CommentWithReplies[];
}

interface ActivityItemActionsProps {
  activityType: ActivityType;
  activityId: string;
  showInline?: boolean;
}

export function ActivityItemActions({ activityType, activityId, showInline = false }: ActivityItemActionsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);

  const {
    comments,
    likeCount,
    commentCount,
    isLikedByUser,
    toggleLike,
    addComment,
    deleteComment,
    isLiking,
    isAddingComment,
  } = useActivityInteractions(activityType, activityId);

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim() && user) {
      addComment(commentText.trim(), replyingTo?.id);
      setCommentText("");
      setReplyingTo(null);
    }
  };

  const handleReply = (commentId: string, username: string) => {
    setReplyingTo({ id: commentId, username });
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setCommentText("");
  };

  // Count total comments including replies
  const totalCommentCount = comments.reduce((acc, comment) => {
    return acc + 1 + (comment.replies?.length || 0);
  }, 0);

  if (!user) return null;

  const renderComment = (comment: CommentWithReplies, isReply = false) => (
    <div key={comment.id} className={`flex gap-2 p-2 rounded bg-secondary/30 ${isReply ? 'ml-6 border-l-2 border-primary/20' : ''}`}>
      <div 
        className="shrink-0 cursor-pointer"
        onClick={() => navigate(`/user/${comment.user_id}`)}
      >
        {comment.profile?.avatar_url ? (
          <img
            src={comment.profile.avatar_url}
            alt=""
            className={`rounded-full object-cover ${isReply ? 'w-5 h-5' : 'w-6 h-6'}`}
          />
        ) : (
          <div className={`rounded-full bg-secondary flex items-center justify-center ${isReply ? 'w-5 h-5' : 'w-6 h-6'}`}>
            <User className={`text-muted-foreground ${isReply ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span 
            className="text-xs font-medium hover:text-primary cursor-pointer transition-colors"
            onClick={() => navigate(`/user/${comment.user_id}`)}
          >
            {comment.profile?.display_name || comment.profile?.username || 'User'}
          </span>
          <span className="text-xs text-muted-foreground/60">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
          {!isReply && (
            <button
              onClick={() => handleReply(comment.id, comment.profile?.display_name || comment.profile?.username || 'User')}
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
            >
              <Reply className="h-3 w-3" />
              Reply
            </button>
          )}
          {comment.user_id === user.id && (
            <button
              onClick={() => deleteComment(comment.id)}
              className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
        <p className="text-xs text-foreground mt-0.5">{comment.comment_text}</p>
      </div>
    </div>
  );

  return (
    <div className="mt-2">
      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleLike}
          disabled={isLiking}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
        >
          <Heart 
            className={`h-3.5 w-3.5 transition-all ${isLikedByUser ? 'fill-primary text-primary scale-110' : ''}`} 
          />
          <span>{likeCount > 0 ? likeCount : ''}</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          <span>{totalCommentCount > 0 ? totalCommentCount : ''}</span>
          {totalCommentCount > 0 && (
            showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
          )}
        </button>
      </div>

      {/* Comments section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-2 overflow-hidden"
          >
            {/* Existing comments */}
            {comments.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {comments.map((comment) => (
                  <div key={comment.id} className="space-y-1">
                    {renderComment(comment)}
                    {/* Render replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="space-y-1">
                        {comment.replies.map((reply) => renderComment(reply, true))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Reply indicator */}
            {replyingTo && (
              <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                <Reply className="h-3 w-3" />
                <span>Replying to {replyingTo.username}</span>
                <button 
                  onClick={cancelReply}
                  className="ml-auto hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Add comment form */}
            <form onSubmit={handleSubmitComment} className="flex gap-2">
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={replyingTo ? `Reply to ${replyingTo.username}...` : "Add a comment..."}
                className="h-8 text-xs"
                maxLength={500}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!commentText.trim() || isAddingComment}
                className="h-8 px-3"
              >
                <Send className="h-3 w-3" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Lightweight version for batch display
interface ActivityLikeButtonProps {
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  onLikeClick: () => void;
  onCommentClick: () => void;
}

export function ActivityLikeButton({ 
  likeCount, 
  commentCount, 
  isLiked, 
  onLikeClick, 
  onCommentClick 
}: ActivityLikeButtonProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onLikeClick}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        <Heart 
          className={`h-3.5 w-3.5 transition-all ${isLiked ? 'fill-primary text-primary' : ''}`} 
        />
        {likeCount > 0 && <span>{likeCount}</span>}
      </button>

      <button
        onClick={onCommentClick}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        {commentCount > 0 && <span>{commentCount}</span>}
      </button>
    </div>
  );
}
