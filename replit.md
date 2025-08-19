# Plank Coach - AI-Powered Form Analysis

## Overview

Plank Coach is a real-time plank form analysis application that uses MediaPipe pose detection to provide live feedback on exercise form. The application runs in mobile browsers and guides users through plank exercises with AI-powered coaching, scoring their body alignment, knee position, and shoulder stacking in real-time. It features a four-screen workflow: startup, setup, coaching, and results, with voice feedback and comprehensive scoring based on pose landmarks.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development/build tooling
- **Routing**: Wouter for client-side routing with a simple four-page flow
- **UI Components**: Radix UI primitives with shadcn/ui components and Tailwind CSS for styling
- **State Management**: React Query (TanStack Query) for server state management with custom hooks for pose analysis
- **Real-time Updates**: WebSocket integration for live pose data streaming during coaching sessions

### Backend Architecture
- **Server**: Express.js with TypeScript running on Node.js
- **API Design**: RESTful endpoints for session management with WebSocket support for real-time pose analysis
- **Storage**: Configurable storage layer with in-memory implementation (MemStorage) for development
- **Session Management**: UUID-based session tracking with pose analysis data collection

### Pose Detection & Analysis
- **Computer Vision**: MediaPipe Pose model for real-time landmark detection
- **Analysis Engine**: Custom pose analysis algorithms calculating body alignment angles, knee position, and shoulder stacking
- **Scoring System**: Mathematical scoring based on angle calculations with progressive penalties and tolerance thresholds
- **Feedback System**: Rule-based coaching messages with voice synthesis for audio guidance

### Data Storage Solutions
- **Database**: Drizzle ORM configured for PostgreSQL with schema for users, sessions, and pose analysis
- **Real-time Data**: WebSocket streaming for live pose analysis data during coaching sessions
- **Session Persistence**: Structured storage of workout sessions with scoring metrics and analysis history

### Mobile-First Design
- **Responsive Layout**: Mobile-optimized interface with orientation-specific screens (portrait/landscape)
- **Camera Integration**: Browser-based camera access with MediaPipe integration for pose detection
- **Touch Interface**: Mobile-friendly controls with large buttons and gesture-based interactions
- **Performance**: Optimized for mobile browsers with 10 FPS analysis rate and efficient rendering

### Scoring & Analytics
- **Multi-metric Analysis**: Three-component scoring system (body alignment, knee position, shoulder stack)
- **Real-time Feedback**: Live coaching with voice synthesis and visual feedback overlays
- **Performance Tracking**: Session-based analytics with improvement suggestions and grade assignments
- **Adaptive Thresholds**: Configurable scoring thresholds based on plank type detection (high vs elbow plank)

## External Dependencies

### Core Technologies
- **MediaPipe**: Google's ML framework for pose detection and landmark extraction
- **React Query**: Server state management and caching for API interactions
- **Drizzle ORM**: Type-safe database interactions with PostgreSQL support
- **Neon Database**: Serverless PostgreSQL database service for data persistence

### UI & Styling
- **Radix UI**: Headless UI primitives for accessible component foundation
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **shadcn/ui**: Pre-built component library built on Radix UI primitives
- **Lucide Icons**: Icon library for consistent UI iconography

### Development Tools
- **Vite**: Frontend build tool with React plugin and development server
- **TypeScript**: Type safety across frontend, backend, and shared schemas
- **ESBuild**: Fast JavaScript bundler for production builds
- **Wouter**: Lightweight client-side routing library

### Browser APIs
- **WebRTC**: Camera access for pose detection in mobile browsers
- **Web Speech API**: Voice synthesis for coaching feedback and instructions
- **WebSocket**: Real-time bidirectional communication for live pose data
- **Canvas API**: Pose overlay rendering and visual feedback display