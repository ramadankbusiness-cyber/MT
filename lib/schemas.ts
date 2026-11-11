import { z } from "zod";
import { CLUB_COMMITTEES } from "../data/committees";

export const joinApplicationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  committees: z.array(z.enum(CLUB_COMMITTEES)).min(1).max(3).refine(
    (committees) => new Set(committees).size === committees.length,
    "Choose each committee only once.",
  ),
  message: z.string().trim().min(2).max(2000),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
  rememberMe: z.preprocess((value) => value === true || value === "true", z.boolean()).default(false),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(256),
  newPassword: z.string().min(12).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/),
});

export const accountSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  role: z.enum(["ADMIN", "LEADER", "MEMBER"]),
  committeeId: z.string().trim().min(1).optional().nullable(),
  temporaryPassword: z.string().min(12).max(128).optional(),
});

export const userRoleUpdateSchema = z.object({
  role: z.enum(["ADMIN", "LEADER", "MEMBER"]),
  committeeId: z.string().nullable().optional(),
});

export const teamMemberSchema = z.object({
  name: z.string().trim().min(2).max(100),
  title: z.string().trim().min(2).max(100),
  titleAr: z.string().trim().max(100).optional().nullable(),
  committeeId: z.string().min(1),
  bio: z.string().trim().max(500).optional().nullable(),
  bioAr: z.string().trim().max(500).optional().nullable(),
  socialLinks: z.object({
    website: z.string().url().max(300).optional().or(z.literal("")),
    linkedin: z.string().url().max(300).optional().or(z.literal("")),
    instagram: z.string().url().max(300).optional().or(z.literal("")),
  }).optional().nullable(),
  photoUrl: z.string().url().max(2048).optional().nullable().or(z.literal("")),
  order: z.number().int().min(0).max(10000).optional(),
  visible: z.boolean().optional(),
  userId: z.string().optional().nullable(),
});

export const zoneSchema = z.object({
  name: z.string().trim().min(2).max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().int().min(5).max(5000),
  committeeId: z.string().optional().nullable(),
});

export const zoneCaptureSchema = z.object({
  centerLat: z.number().min(-90).max(90),
  centerLng: z.number().min(-180).max(180),
  radiusMeters: z.number().int().min(10).max(1000),
  locationAccuracy: z.number().min(0).nullable().optional(),
  placeName: z.string().trim().max(100).optional().nullable(),
  zoneId: z.string().optional().nullable(),
});

export const eventSchema = z.object({
  title: z.string().trim().min(2).max(120),
  titleAr: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().min(2).max(2000),
  descriptionAr: z.string().trim().max(2000).optional().nullable(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional().nullable(),
  location: z.string().trim().max(250).optional().nullable(),
  committeeId: z.string().optional().nullable(),
  published: z.boolean().default(true),
  ...zoneCaptureSchema.shape,
}).refine((value) => !value.endsAt || value.endsAt > value.startsAt, {
  message: "End time must be after the event start",
  path: ["endsAt"],
});

export const attendanceSessionSchema = z.object({
  title: z.string().trim().min(2).max(120),
  committeeId: z.string().optional().nullable(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  lateAfterMinutes: z.number().int().min(0).max(240).default(10),
  qrMode: z.enum(["ROTATING", "STATIC"]).default("ROTATING"),
  ...zoneCaptureSchema.shape,
}).refine((value) => value.endsAt > value.startsAt, {
  message: "End time must be after start time",
  path: ["endsAt"],
});

export const checkInSchema = z.object({
  token: z.string().min(16).max(4096),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(10000),
  timestamp: z.number().int().positive(),
  deviceId: z.string().min(8).max(128),
});

export const notificationSchema = z.object({
  title: z.string().trim().min(2).max(120),
  titleAr: z.string().trim().max(120).optional().nullable(),
  message: z.string().trim().min(2).max(3000),
  messageAr: z.string().trim().max(3000).optional().nullable(),
  link: z.string().startsWith("/").max(500).refine((value) => !value.startsWith("//") && !value.includes("\\"), "Use a same-site link").optional().nullable(),
  type: z.enum(["ANNOUNCEMENT", "NEW_EVENT", "EVENT_REMINDER", "SESSION_OPENED", "ATTENDANCE_CONFIRMED", "ATTENDANCE_REJECTED", "ABSENCE_WARNING", "ACCOUNT_CREATED", "PASSWORD_CHANGED", "ROLE_CHANGED", "EXCUSE_DECISION"]).default("ANNOUNCEMENT"),
  audience: z.enum(["EVERYONE", "ROLE", "COMMITTEE", "USERS"]),
  audienceRole: z.enum(["ADMIN", "LEADER", "MEMBER"]).optional(),
  committeeId: z.string().optional(),
  userIds: z.array(z.string()).max(500).optional(),
  scheduledAt: z.coerce.date().optional().nullable(),
  important: z.boolean().default(false),
});

export const notificationPreferenceSchema = z.object({
  type: z.enum(["ANNOUNCEMENT", "NEW_EVENT", "EVENT_REMINDER", "SESSION_OPENED", "ATTENDANCE_CONFIRMED", "ATTENDANCE_REJECTED", "ABSENCE_WARNING", "ACCOUNT_CREATED", "PASSWORD_CHANGED", "ROLE_CHANGED", "EXCUSE_DECISION"]),
  inApp: z.boolean(),
  push: z.boolean(),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({ p256dh: z.string().min(1).max(256), auth: z.string().min(1).max(256) }),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/),
});

export const manualAttendanceSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["PRESENT", "LATE", "ABSENT", "EXCUSED"]),
  reason: z.string().trim().min(3).max(500),
});

export const excuseSchema = z.object({
  sessionId: z.string().min(1),
  reason: z.string().trim().min(3).max(1000),
});

export const excuseReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().trim().max(500).optional().nullable(),
});
