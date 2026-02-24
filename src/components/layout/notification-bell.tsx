
"use client";

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '@/hooks/use-notifications';
import { getEmployeeNameFromEmail } from '@/lib/employee-utils';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AppNotification } from '@/types';

function NotificationItem({
  notification,
  onRead,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
}) {
  const fromName = getEmployeeNameFromEmail(notification.fromEmail);
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });

  return (
    <div
      className={`px-3 py-2.5 cursor-pointer hover:bg-accent rounded transition-colors ${
        !notification.read ? 'bg-primary/5' : ''
      }`}
      onClick={() => !notification.read && onRead(notification.id)}
    >
      <div className="flex items-start gap-2">
        <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${notification.read ? 'bg-transparent' : 'bg-primary'}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug">
            <span className="font-semibold">{fromName}</span>
            {' shared '}
            <span className="font-semibold">{notification.docType} {notification.docNumber}</span>
            {' with you'}
          </p>
          {notification.message && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              &ldquo;{notification.message}&rdquo;
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
        </div>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Icon
            name={unreadCount > 0 ? "BellRing" : "Bell"}
            className={`h-4 w-4 transition-colors ${unreadCount > 0 ? 'text-primary' : ''}`}
          />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[1.1rem] h-[1.1rem] px-0.5 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center leading-none ring-2 ring-background">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-0.5 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.preventDefault(); markAllAsRead(); }}
            >
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto py-1">
          {notifications.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              <Icon name="Bell" className="h-6 w-6 mx-auto mb-2 opacity-30" />
              No notifications
            </div>
          ) : (
            notifications.slice(0, 20).map(n => (
              <NotificationItem key={n.id} notification={n} onRead={markAsRead} />
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
