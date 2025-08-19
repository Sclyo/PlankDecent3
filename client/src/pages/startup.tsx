import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Play, BarChart3 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Startup() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();

  const handleStartSession = async () => {
    try {
      // Create session directly and go to coaching
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plankType: 'unknown', // Will be detected in coaching
          userId: null,
        }),
      });
      
      if (response.ok) {
        const session = await response.json();
        setLocation(`/coaching/${session.id}`);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-surface/80 border-gray-700 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-success/20 rounded-full flex items-center justify-center">
            <Activity className="w-8 h-8 text-success" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Plank Coach</CardTitle>
          <p className="text-gray-300 mt-2">
            Real-time form analysis with AI-powered coaching
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
                <Activity className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-xs text-gray-400">Real-time Analysis</p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <BarChart3 className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-xs text-gray-400">Live Scoring</p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto">
                <Play className="w-6 h-6 text-purple-400" />
              </div>
              <p className="text-xs text-gray-400">Voice Coaching</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-white">What we analyze:</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span>Body alignment (Shoulder-Hip-Ankle)</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span>Knee position and leg straightness</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span>Shoulder stack alignment</span>
              </li>
            </ul>
          </div>

          <Button 
            onClick={handleStartSession}
            className="w-full bg-success hover:bg-success/90 text-white font-semibold py-3"
            size="lg"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Session
          </Button>

          <p className="text-xs text-gray-400 text-center">
            {isMobile ? 'Rotate to landscape for coaching mode' : 'Best viewed on mobile device'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
