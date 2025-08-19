import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, real, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  startTime: timestamp("start_time").notNull().defaultNow(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in seconds
  plankType: text("plank_type").notNull(), // 'high' or 'elbow'
  averageScore: real("average_score"),
  bodyAlignmentScore: real("body_alignment_score"),
  kneePositionScore: real("knee_position_score"),
  shoulderStackScore: real("shoulder_stack_score"),
  completed: boolean("completed").notNull().default(false),
});

export const poseAnalysis = pgTable("pose_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sessions.id),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  bodyAlignmentAngle: real("body_alignment_angle"),
  kneeAngle: real("knee_angle"),
  shoulderStackAngle: real("shoulder_stack_angle"),
  overallScore: real("overall_score"),
  feedback: text("feedback"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  startTime: true,
  endTime: true,
});

export const insertPoseAnalysisSchema = createInsertSchema(poseAnalysis).omit({
  id: true,
  timestamp: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertPoseAnalysis = z.infer<typeof insertPoseAnalysisSchema>;
export type PoseAnalysis = typeof poseAnalysis.$inferSelect;
