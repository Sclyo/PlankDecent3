import { type User, type InsertUser, type Session, type InsertSession, type PoseAnalysis, type InsertPoseAnalysis } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined>;
  getUserSessions(userId: string): Promise<Session[]>;
  
  createPoseAnalysis(analysis: InsertPoseAnalysis): Promise<PoseAnalysis>;
  getSessionAnalysis(sessionId: string): Promise<PoseAnalysis[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private sessions: Map<string, Session>;
  private poseAnalysis: Map<string, PoseAnalysis>;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.poseAnalysis = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = randomUUID();
    const session: Session = {
      ...insertSession,
      id,
      startTime: new Date(),
      endTime: null,
      duration: null,
      averageScore: null,
      bodyAlignmentScore: null,
      kneePositionScore: null,
      shoulderStackScore: null,
      completed: false,
    };
    this.sessions.set(id, session);
    return session;
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(
      (session) => session.userId === userId
    );
  }

  async createPoseAnalysis(insertAnalysis: InsertPoseAnalysis): Promise<PoseAnalysis> {
    const id = randomUUID();
    const analysis: PoseAnalysis = {
      ...insertAnalysis,
      id,
      timestamp: new Date(),
    };
    this.poseAnalysis.set(id, analysis);
    return analysis;
  }

  async getSessionAnalysis(sessionId: string): Promise<PoseAnalysis[]> {
    return Array.from(this.poseAnalysis.values()).filter(
      (analysis) => analysis.sessionId === sessionId
    );
  }
}

export const storage = new MemStorage();
