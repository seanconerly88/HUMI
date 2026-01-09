import { auth, db } from '../../config/firebaseConfig';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const SUPER_ADMIN_EMAILS = [
  'conerly.sean@gmail.com',
  'hello@gethumi.co'
];

export const isSuperAdmin = () => {
  const user = auth.currentUser;
  if (!user || !user.email) return false;
  return SUPER_ADMIN_EMAILS.some(
    adminEmail => user.email.toLowerCase() === adminEmail.toLowerCase()
  );
};

export const softDeletePost = async (postId) => {
  if (!isSuperAdmin()) {
    throw new Error('Unauthorized: Only super admin can delete posts');
  }
  
  const user = auth.currentUser;
  const postRef = doc(db, 'logsMomentsImages', postId);
  
  await updateDoc(postRef, {
    isPublic: false,
    deletedAt: serverTimestamp(),
    deletedBy: user.uid,
    deletedByEmail: user.email
  });
  
  return true;
};

export const softDeleteComment = async (postId, commentId) => {
  if (!isSuperAdmin()) {
    throw new Error('Unauthorized: Only super admin can delete comments');
  }
  
  const user = auth.currentUser;
  const commentRef = doc(db, 'postComments', postId, 'comments', commentId);
  
  await updateDoc(commentRef, {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: user.uid,
    deletedByEmail: user.email
  });
  
  return true;
};
