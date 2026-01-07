import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import Icon from './Icon';
import { auth } from '../../config/firebaseConfig';
import { 
  getComments, 
  addComment, 
  thumbsUpComment, 
  thumbsDownComment,
  canUserComment,
  FREE_COMMENT_LIMIT
} from '../../src/services/commentService';
import { isSuperAdmin, softDeleteComment } from '../../src/services/adminService';

export default function Comments({ postId, isPremium, onUpgradePress }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commentStatus, setCommentStatus] = useState({ canComment: true, remaining: Infinity });
  const [showInput, setShowInput] = useState(false);
  const [justPosted, setJustPosted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deletingComment, setDeletingComment] = useState(null);
  
  const userId = auth.currentUser?.uid;
  const fullName = auth.currentUser?.displayName || 'Anonymous';
  const userName = fullName.split(' ')[0];

  useEffect(() => {
    loadComments();
    checkCommentStatus();
    setIsAdmin(isSuperAdmin());
  }, [postId]);

  const loadComments = async () => {
    setLoading(true);
    const loadedComments = await getComments(postId, userId);
    setComments(loadedComments);
    setLoading(false);
  };

  const checkCommentStatus = async () => {
    if (userId) {
      const status = await canUserComment(userId, isPremium);
      setCommentStatus(status);
    }
  };

  const handleSubmitComment = async () => {
    console.log('Post button pressed', { newComment: newComment.trim(), submitting });
    if (!newComment.trim() || submitting) return;
    
    if (!userId) {
      console.log('User must be logged in to comment');
      if (Platform.OS === 'web') {
        window.alert('Please log in to post a comment');
      }
      return;
    }
    
    if (!commentStatus.canComment) {
      if (Platform.OS === 'web') {
        if (onUpgradePress) onUpgradePress();
      } else {
        Alert.alert(
          'Comment Limit Reached',
          `You've used all ${FREE_COMMENT_LIMIT} free comments this month. Upgrade to Premium for unlimited comments!`,
          [
            { text: 'Maybe Later', style: 'cancel' },
            { text: 'Upgrade', onPress: onUpgradePress }
          ]
        );
      }
      return;
    }
    
    setSubmitting(true);
    try {
      console.log('Attempting to add comment to post:', postId);
      const comment = await addComment(postId, userId, userName, newComment, isPremium);
      console.log('Comment added successfully:', comment);
      setComments(prev => [comment, ...prev]);
      setNewComment('');
      setShowInput(false);
      setJustPosted(true);
      setTimeout(() => setJustPosted(false), 3000);
      await checkCommentStatus();
    } catch (error) {
      console.error('Error posting comment:', error);
      if (error.message === 'COMMENT_LIMIT_REACHED') {
        if (onUpgradePress) onUpgradePress();
      } else {
        if (Platform.OS === 'web') {
          window.alert('Failed to post comment. Please check your connection and try again.');
        }
      }
    }
    setSubmitting(false);
  };

  const handleThumbsUp = async (commentId) => {
    if (!userId) return;
    try {
      await thumbsUpComment(postId, commentId, userId);
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          const wasThumbedUp = c.thumbsUpUsers?.includes(userId);
          const wasThumbedDown = c.userThumbedDown;
          return {
            ...c,
            thumbsUp: wasThumbedUp ? c.thumbsUp - 1 : c.thumbsUp + 1,
            thumbsUpUsers: wasThumbedUp 
              ? c.thumbsUpUsers.filter(id => id !== userId)
              : [...(c.thumbsUpUsers || []), userId],
            userThumbedDown: false
          };
        }
        return c;
      }));
    } catch (error) {
      console.error('Error with thumbs up:', error);
    }
  };

  const handleThumbsDown = async (commentId) => {
    if (!userId) return;
    try {
      await thumbsDownComment(postId, commentId, userId);
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          const wasThumbedDown = c.userThumbedDown;
          const wasThumbedUp = c.thumbsUpUsers?.includes(userId);
          return {
            ...c,
            thumbsUp: wasThumbedUp ? c.thumbsUp - 1 : c.thumbsUp,
            thumbsUpUsers: wasThumbedUp 
              ? c.thumbsUpUsers.filter(id => id !== userId)
              : c.thumbsUpUsers,
            userThumbedDown: !wasThumbedDown
          };
        }
        return c;
      }));
    } catch (error) {
      console.error('Error with thumbs down:', error);
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getFirstName = (name) => {
    if (!name || name === 'Anonymous') return 'Anonymous';
    return name.split(' ')[0];
  };

  const handleDeleteComment = async (commentId) => {
    if (!isAdmin) return;
    
    const confirmDelete = Platform.OS === 'web' 
      ? window.confirm('Remove this comment?')
      : await new Promise(resolve => {
          Alert.alert(
            'Remove Comment',
            'This will remove the comment for all users.',
            [
              { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
              { text: 'Remove', onPress: () => resolve(true), style: 'destructive' }
            ]
          );
        });
    
    if (!confirmDelete) return;
    
    setDeletingComment(commentId);
    try {
      await softDeleteComment(postId, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to delete comment');
      } else {
        Alert.alert('Error', 'Failed to delete comment');
      }
    }
    setDeletingComment(null);
  };

  const renderComment = ({ item }) => {
    const isThumbedUp = item.thumbsUpUsers?.includes(userId);
    const isThumbedDown = item.userThumbedDown;
    const displayName = getFirstName(item.userName);
    const isBeingDeleted = deletingComment === item.id;
    
    return (
      <View style={[styles.commentItem, isBeingDeleted && styles.deletingComment]}>
        <View style={styles.commentHeader}>
          <View style={styles.commentHeaderLeft}>
            <Text style={styles.commentUserName}>{displayName}</Text>
            <Text style={styles.commentTime}>{formatTime(item.createdAt)}</Text>
          </View>
          {isAdmin && (
            <TouchableOpacity 
              style={styles.adminDeleteButton}
              onPress={() => handleDeleteComment(item.id)}
              disabled={isBeingDeleted}
            >
              {isBeingDeleted ? (
                <ActivityIndicator size="small" color="#dc3545" />
              ) : (
                <Icon name="trash-outline" size={14} color="#dc3545" />
              )}
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.commentText}>{item.text}</Text>
        <View style={styles.commentActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleThumbsUp(item.id)}
          >
            <Icon 
              name="thumbs-up" 
              size={16} 
              color={isThumbedUp ? '#8B4513' : '#999'} 
            />
            <Text style={[styles.actionCount, isThumbedUp && styles.activeCount]}>
              {item.thumbsUp || 0}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleThumbsDown(item.id)}
          >
            <Icon 
              name="thumbs-down" 
              size={16} 
              color={isThumbedDown ? '#8B4513' : '#999'} 
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Icon name="chatbubbles-outline" size={14} color="#8B4513" />
        <Text style={styles.sectionTitle}>Community</Text>
      </View>
      
      {justPosted && (
        <View style={styles.successBanner}>
          <Icon name="checkmark-circle" size={16} color="#4CAF50" />
          <Text style={styles.successText}>Comment posted!</Text>
        </View>
      )}
      
      {!showInput ? (
        <TouchableOpacity 
          style={styles.addCommentButton}
          onPress={() => setShowInput(true)}
        >
          <Icon name="chatbubble-outline" size={16} color="#8B4513" />
          <Text style={styles.addCommentText}>Add a comment...</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Write your comment..."
            placeholderTextColor="#999"
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
            autoFocus
          />
          <View style={styles.inputActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                setShowInput(false);
                setNewComment('');
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.submitButton, (!newComment.trim() || submitting) && styles.submitButtonDisabled]}
              onPress={() => {
                console.log('TouchableOpacity onPress fired');
                handleSubmitComment();
              }}
              disabled={!newComment.trim() || submitting}
              activeOpacity={0.7}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {loading ? (
        <ActivityIndicator style={styles.loader} color="#8B4513" />
      ) : comments.length === 0 ? (
        <Text style={styles.noComments}>No comments yet. Be the first!</Text>
      ) : (
        <FlatList
          data={comments}
          renderItem={renderComment}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          style={styles.commentsList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAF8F5',
    marginTop: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 69, 19, 0.1)',
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 69, 19, 0.08)',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B4513',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    gap: 6,
  },
  successText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  addCommentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 10,
    marginHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 69, 19, 0.12)',
    gap: 8,
  },
  addCommentText: {
    color: '#666',
    fontSize: 14,
  },
  inputContainer: {
    marginTop: 10,
    marginHorizontal: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    maxHeight: 100,
    backgroundColor: '#fff',
    minHeight: 60,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelText: {
    color: '#666',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  limitText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  loader: {
    marginTop: 20,
  },
  noComments: {
    textAlign: 'center',
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
    fontSize: 14,
    fontStyle: 'italic',
  },
  commentsList: {
    marginTop: 12,
  },
  commentItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 69, 19, 0.06)',
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminDeleteButton: {
    padding: 4,
  },
  deletingComment: {
    opacity: 0.5,
  },
  commentUserName: {
    fontWeight: '600',
    fontSize: 14,
    color: '#333',
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
  },
  commentText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    fontSize: 13,
    color: '#999',
  },
  activeCount: {
    color: '#8B4513',
    fontWeight: '600',
  },
});
