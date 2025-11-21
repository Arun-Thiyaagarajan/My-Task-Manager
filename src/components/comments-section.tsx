
'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { addComment, updateComment, deleteComment, getUiConfig } from '@/lib/data';
import { Pencil, Trash2, X, Check, MessageSquare } from 'lucide-react';
import { cn, formatTimestamp } from '@/lib/utils';
import type { Comment } from '@/lib/types';

interface CommentsSectionProps {
  taskId: string;
  comments: (Comment | string)[]; // Allow old string format for backward compatibility
  onCommentsUpdate: (newComments: Comment[]) => void;
  readOnly?: boolean;
}

export function CommentsSection({ taskId, comments, onCommentsUpdate, readOnly = false }: CommentsSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const uiConfig = getUiConfig();
  
  const getCommentObject = (comment: Comment | string): Comment => {
      if (typeof comment === 'string') {
          return { text: comment, timestamp: new Date().toISOString() };
      }
      return comment;
  };
  
  const getCommentText = (comment: Comment | string) => typeof comment === 'string' ? comment : comment.text;
  const getCommentTimestamp = (comment: Comment | string) => (typeof comment !== 'string' && comment.timestamp) ? new Date(comment.timestamp) : null;


  const handleAddComment = () => {
    if (newComment.trim()) {
      const updatedTask = addComment(taskId, newComment);
      if (updatedTask?.comments) {
        onCommentsUpdate(updatedTask.comments);
      }
      setNewComment('');
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditingText(getCommentText(comments[index]));
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingText('');
  };

  const handleSaveEdit = (index: number) => {
    if (editingText.trim()) {
      const updatedTask = updateComment(taskId, index, editingText);
      if (updatedTask?.comments) {
        onCommentsUpdate(updatedTask.comments);
      }
      handleCancelEdit();
    }
  };

  const handleDelete = (index: number) => {
    const updatedTask = deleteComment(taskId, index);
    if (updatedTask) {
        onCommentsUpdate(updatedTask.comments || []);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
            <MessageSquare className="h-5 w-5" />
            Comments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
            <div className="space-y-4">
                {comments.map((comment, index) => {
                    const text = getCommentText(comment);
                    const timestamp = getCommentTimestamp(comment);
                    
                    return (
                    <div key={index} className="p-3 rounded-md border bg-muted/50 group">
                        {editingIndex === index ? (
                        <div className="space-y-2">
                            <Textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="bg-background"
                            />
                            <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="ghost" onClick={handleCancelEdit}><X className="h-4 w-4 mr-1" />Cancel</Button>
                            <Button size="sm" onClick={() => handleSaveEdit(index)}><Check className="h-4 w-4 mr-1" />Save</Button>
                            </div>
                        </div>
                        ) : (
                        <div className="flex flex-col justify-between items-start gap-2">
                            <div className="flex justify-between items-start w-full gap-2">
                                <p className="text-foreground/80 whitespace-pre-wrap flex-1 pt-1">{text}</p>
                                {!readOnly && (
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(index)}>
                                        <Pencil className="h-4 w-4" />
                                        <span className="sr-only">Edit comment</span>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                        <span className="sr-only">Delete comment</span>
                                    </Button>
                                </div>
                                )}
                            </div>
                            {timestamp && (
                                <p className="text-xs text-muted-foreground self-end">
                                {formatTimestamp(timestamp, uiConfig.timeFormat)}
                                </p>
                            )}
                        </div>
                        )}
                    </div>
                    )
                })}
                {comments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No comments yet. {readOnly ? '' : 'Add one below!'}</p>}
            </div>
            {!readOnly && (
              <div className="border rounded-lg bg-card mt-4 p-4">
                <div className="flex flex-col gap-2">
                    <label htmlFor="new-comment" className="text-sm font-medium">Add a comment</label>
                    <Textarea
                    id="new-comment"
                    placeholder="Type your comment here..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    />
                    <Button onClick={handleAddComment} className="self-end" disabled={!newComment.trim()}>Add Comment</Button>
                </div>
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
