import { prisma } from '../../config/db.js';
import { NotificationType } from '@prisma/client';
import { UpdateNotificationPreferencesInput } from './notification.schema.js';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  eventKey?: string;
}

export const createNotification = async (params: CreateNotificationParams) => {
  const { userId, type, title, message, link, eventKey } = params;

  if (eventKey) {
    // Idempotent upsert check by eventKey
    const existing = await prisma.notification.findUnique({
      where: {
        userId_eventKey: {
          userId,
          eventKey,
        },
      },
    });

    if (existing) {
      return existing;
    }
  }

  return await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      link,
      eventKey,
    },
  });
};

export const getUserNotifications = async (userId: string, limit: number = 50) => {
  return await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
};

export const getUnreadCount = async (userId: string) => {
  const count = await prisma.notification.count({
    where: {
      userId,
      read: false,
    },
  });
  return { count };
};

export const markAsRead = async (userId: string, notificationId: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    const err: any = new Error('Notification not found');
    err.statusCode = 404;
    throw err;
  }

  if (notification.userId !== userId) {
    const err: any = new Error('Access denied: You do not own this notification');
    err.statusCode = 403;
    throw err;
  }

  return await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
};

export const markAllAsRead = async (userId: string) => {
  return await prisma.notification.updateMany({
    where: {
      userId,
      read: false,
    },
    data: { read: true },
  });
};

export const getPreferences = async (userId: string) => {
  let pref = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (!pref) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });

    pref = await prisma.notificationPreference.create({
      data: {
        userId,
        timezone: user?.timezone || 'UTC',
      },
    });
  }

  return pref;
};

export const updatePreferences = async (
  userId: string,
  data: UpdateNotificationPreferencesInput
) => {
  // Ensure preference record exists
  await getPreferences(userId);

  return await prisma.notificationPreference.update({
    where: { userId },
    data,
  });
};
