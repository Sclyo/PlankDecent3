import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertSessionSchema, insertPoseAnalysisSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time pose analysis
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('Client connected to pose analysis WebSocket');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'pose_analysis') {
          // Store pose analysis data
          if (message.sessionId && message.data) {
            await storage.createPoseAnalysis({
              sessionId: message.sessionId,
              ...message.data
            });
          }

          // Broadcast to all connected clients (for multi-device support)
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(message));
            }
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from pose analysis WebSocket');
    });
  });

  // Session management routes
  app.post('/api/sessions', async (req, res) => {
    try {
      const sessionData = insertSessionSchema.parse(req.body);
      const session = await storage.createSession(sessionData);
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: 'Invalid session data' });
    }
  });

  app.get('/api/sessions/:id', async (req, res) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch session' });
    }
  });

  app.patch('/api/sessions/:id', async (req, res) => {
    try {
      const session = await storage.updateSession(req.params.id, req.body);
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update session' });
    }
  });

  app.get('/api/sessions/:id/analysis', async (req, res) => {
    try {
      const analysis = await storage.getSessionAnalysis(req.params.id);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch analysis data' });
    }
  });

  return httpServer;
}
