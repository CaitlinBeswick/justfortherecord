import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Send, Trash2, User, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useActivityInteractions, ActivityType } from "@/hooks/useActivityInteractions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";

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
      addComment(commentText.trim());
      setCommentText("");
    }
  };

  if (!user) return null;

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
          <span>{commentCount > 0 ? commentCount : ''}</span>
          {commentCount > 0 && (
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
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2 p-2 rounded bg-secondary/30">
                    <div 
                      className="shrink-0 cursor-pointer"
                      onClick={() => navigate(`/user/${comment.user_id}`)}
                    >
                      {comment.profile?.avatar_url ? (
                        <img
                          src={comment.profile.avatar_url}
                          alt=""
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                          <User className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span 
                          className="text-xs font-medium hover:text-primary cursor-pointer transition-colors"
                          onClick={() => navigate(`/user/${comment.user_id}`)}
                        >
                          {comment.profile?.display_name || comment.profile?.username || 'User'}
                        </span>
                        <span className="text-xs text-muted-foreground/60">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
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
                ))}
              </div>
            )}

            {/* Add comment form */}
            <form onSubmit={handleSubmitComment} className="flex gap-2">
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
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
