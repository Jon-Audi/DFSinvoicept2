
"use client";

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { useFirebase } from '@/components/firebase-provider';
import { useAuth } from '@/contexts/auth-context';
import type { AppNotification } from '@/types';

export function useNotifications() {
  const { db } = useFirebase();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!db || !user?.email || user.notificationsEnabled === false) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('toEmail', '==', user.email),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          // Convert Firestore Timestamp to ISO string if needed
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
        } as AppNotification;
      });
      setNotifications(items);
      setUnreadCount(items.filter(n => !n.read).length);
    });

    return () => unsubscribe();
  }, [db, user?.email, user?.notificationsEnabled]);

  const markAsRead = async (notificationId: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  };

  const markAllAsRead = async () => {
    if (!db || notifications.length === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.read).forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (e) {
      console.error('Failed to mark all notifications as read:', e);
    }
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
