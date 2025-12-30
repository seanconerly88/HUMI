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

export default function Comments({ postId, isPremium, onUpgradePress }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commentStatus, setCommentStatus] = useState({ canComment: true, remaining: Infinity });
  
  const userId = auth.currentUser?.uid;
  const userName = auth.currentUser?.displayName || 'Anonymous';

  useEffect(() => {
    loadComments();
    checkCommentStatus();
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
    if (!newComment.trim() || submitting) return;
    
    if (!userId) {
      console.log('User must be logged in to comment');
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
      const comment = await addComment(postId, userId, userName, newComment, isPremium);
      setComments(prev => [comment, ...prev]);
      setNewComment('');
      await checkCommentStatus();
    } catch (error) {
      if (error.message === 'COMMENT_LIMIT_REACHED') {
        if (onUpgradePress) onUpgradePress();
      } else {
        console.error('Error posting comment:', error);
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

  const renderComment = ({ item }) => {
    const isThumbedUp = item.thumbsUpUsers?.includes(userId);
    const isThumbedDown = item.userThumbedDown;
    
    return (
      <View style={styles.commentItem}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUserName}>{item.userName}</Text>
          <Text style={styles.commentTime}>{formatTime(item.createdAt)}</Text>
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
              color={isThumbedUp ? '#6A4B3A' : '#999'} 
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
              color={isThumbedDown ? '#6A4B3A' : '#999'} 
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add a comment..."
          placeholderTextColor="#999"
          value={newComment}
          onChangeText={setNewComment}
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={[styles.submitButton, (!newComment.trim() || submitting) && styles.submitButtonDisabled]}
          onPress={handleSubmitComment}
          disabled={!newComment.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
      
      
      {loading ? (
        <ActivityIndicator style={styles.loader} color="#6A4B3A" />
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
    paddingHorizontal: 0,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 12,
    marginHorizontal: 16,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    maxHeight: 80,
    backgroundColor: '#f9f9f9',
  },
  submitButton: {
    backgroundColor: '#6A4B3A',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
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
    fontSize: 14,
  },
  commentsList: {
    marginTop: 12,
  },
  commentItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
    color: '#6A4B3A',
    fontWeight: '600',
  },
});
