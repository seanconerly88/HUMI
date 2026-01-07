import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove 
} from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

const FREE_TIER_COMMENT_LIMIT = 10;

export async function getMonthlyCommentCount(userId) {
  if (!userId) return 0;
  
  try {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const usageRef = doc(db, 'users', userId, 'usage', monthKey);
    const usageDoc = await getDoc(usageRef);
    
    if (!usageDoc.exists()) {
      return 0;
    }
    
    return usageDoc.data().commentCount || 0;
  } catch (error) {
    console.error('Error getting comment count:', error);
    return 0;
  }
}

export async function incrementCommentCount(userId) {
  if (!userId) return;
  
  try {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const usageRef = doc(db, 'users', userId, 'usage', monthKey);
    
    await setDoc(usageRef, {
      commentCount: increment(1),
      lastUpdated: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error incrementing comment count:', error);
  }
}

export async function canUserComment(userId, isPremiumUser) {
  if (isPremiumUser) return { canComment: true, remaining: Infinity };
  
  const count = await getMonthlyCommentCount(userId);
  const remaining = Math.max(0, FREE_TIER_COMMENT_LIMIT - count);
  
  return {
    canComment: count < FREE_TIER_COMMENT_LIMIT,
    remaining,
    limit: FREE_TIER_COMMENT_LIMIT
  };
}

export async function addComment(postId, userId, userName, text, isPremiumUser) {
  if (!postId || !userId || !text.trim()) {
    throw new Error('Missing required fields');
  }
  
  const commentCheck = await canUserComment(userId, isPremiumUser);
  if (!commentCheck.canComment) {
    throw new Error('COMMENT_LIMIT_REACHED');
  }
  
  try {
    const commentsRef = collection(db, 'postComments', postId, 'comments');
    const newComment = {
      userId,
      userName: userName || 'Anonymous',
      text: text.trim(),
      createdAt: serverTimestamp(),
      thumbsUp: 0,
      thumbsUpUsers: [],
      thumbsDownUsers: []
    };
    
    const docRef = await addDoc(commentsRef, newComment);
    await incrementCommentCount(userId);
    
    return {
      id: docRef.id,
      ...newComment,
      createdAt: new Date()
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
}

export async function getComments(postId, currentUserId) {
  if (!postId) return [];
  
  try {
    const commentsRef = collection(db, 'postComments', postId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          userThumbedDown: data.thumbsDownUsers?.includes(currentUserId) || false
        };
      })
      .filter(comment => !comment.isDeleted);
  } catch (error) {
    console.error('Error getting comments:', error);
    return [];
  }
}

export async function thumbsUpComment(postId, commentId, userId) {
  if (!postId || !commentId || !userId) return;
  
  try {
    const commentRef = doc(db, 'postComments', postId, 'comments', commentId);
    const commentDoc = await getDoc(commentRef);
    
    if (!commentDoc.exists()) return;
    
    const data = commentDoc.data();
    const hasThumbedUp = data.thumbsUpUsers?.includes(userId);
    
    if (hasThumbedUp) {
      await updateDoc(commentRef, {
        thumbsUp: increment(-1),
        thumbsUpUsers: arrayRemove(userId)
      });
      return { action: 'removed' };
    } else {
      await updateDoc(commentRef, {
        thumbsUp: increment(1),
        thumbsUpUsers: arrayUnion(userId),
        thumbsDownUsers: arrayRemove(userId)
      });
      return { action: 'added' };
    }
  } catch (error) {
    console.error('Error toggling thumbs up:', error);
    throw error;
  }
}

export async function thumbsDownComment(postId, commentId, userId) {
  if (!postId || !commentId || !userId) return;
  
  try {
    const commentRef = doc(db, 'postComments', postId, 'comments', commentId);
    const commentDoc = await getDoc(commentRef);
    
    if (!commentDoc.exists()) return;
    
    const data = commentDoc.data();
    const hasThumbedDown = data.thumbsDownUsers?.includes(userId);
    
    if (hasThumbedDown) {
      await updateDoc(commentRef, {
        thumbsDownUsers: arrayRemove(userId)
      });
      return { action: 'removed' };
    } else {
      await updateDoc(commentRef, {
        thumbsDownUsers: arrayUnion(userId),
        thumbsUpUsers: arrayRemove(userId),
        thumbsUp: data.thumbsUpUsers?.includes(userId) ? increment(-1) : increment(0)
      });
      return { action: 'added' };
    }
  } catch (error) {
    console.error('Error toggling thumbs down:', error);
    throw error;
  }
}

export const FREE_COMMENT_LIMIT = FREE_TIER_COMMENT_LIMIT;
