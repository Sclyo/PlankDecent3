import { useState, useEffect, useRef } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CameraFeed } from '@/components/camera-feed';
import { MetricsPanel } from '@/components/metrics-panel';
import { PoseOverlay } from '@/components/pose-overlay';
import { usePoseAnalysis } from '@/hooks/use-pose-analysis';
import { useVoiceFeedback } from '@/hooks/use-voice-feedback';
import { useWebSocket } from '@/hooks/use-websocket';
import { apiRequest } from '@/lib/queryClient';
import { SCORE_THRESHOLDS } from '@/lib/constants';
import { 
  Clock, 
  VolumeX, 
  Volume2, 
  Pause, 
  Play, 
  Square, 
  Settings,
  Wifi,
  WifiOff 
} from 'lucide-react';

export default function Coaching() {
  const [match, params] = useRoute('/coaching/:sessionId');
  const [, setLocation] = useLocation();
  const sessionId = params?.sessionId;
  
  const [isRunning, setIsRunning] = useState(true);
  const [sessionTime, setSessionTime] = useState(0);
  const [lastFeedbackTime, setLastFeedbackTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionStartTime = useRef<number>(Date.now());

  const { currentAnalysis, currentLandmarks, processResults, startAnalysis, stopAnalysis } = usePoseAnalysis({
    onAnalysisUpdate: (analysis) => {
      // Send real-time data via WebSocket
      if (isConnected && sessionId) {
        sendMessage({
          type: 'pose_analysis',
          sessionId,
          data: {
            bodyAlignmentAngle: analysis.bodyAlignmentAngle,
            kneeAngle: analysis.kneeAngle,
            shoulderStackAngle: analysis.shoulderStackAngle,
            overallScore: analysis.overallScore,
            feedback: analysis.feedback.join(', '),
          },
        });
      }
    },
  });

  const { speak, toggle: toggleVoice, isEnabled: voiceEnabled } = useVoiceFeedback();
  const { isConnected, sendMessage } = useWebSocket();

  // Fetch session data
  const { data: session } = useQuery({
    queryKey: ['/api/sessions', sessionId],
    enabled: !!sessionId,
  });

  // Update session mutation
  const updateSession = useMutation({
    mutationFn: async (updates: any) => {
      const response = await apiRequest('PATCH', `/api/sessions/${sessionId}`, updates);
      return response.json();
    },
  });

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning) {
      interval = setInterval(() => {
        setSessionTime(Math.floor((Date.now() - sessionStartTime.current) / 1000));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  // Start analysis when component mounts
  useEffect(() => {
    if (isRunning) {
      startAnalysis();
    } else {
      stopAnalysis();
    }
  }, [isRunning, startAnalysis, stopAnalysis]);

  // Voice feedback for critical issues
  useEffect(() => {
    if (!currentAnalysis || !voiceEnabled) return;

    const now = Date.now();
    const feedbackDelay = 5000; // 5 seconds between feedback messages

    if (now - lastFeedbackTime < feedbackDelay) return;

    const { feedback, overallScore } = currentAnalysis;
    
    if (feedback.length > 0 && overallScore < SCORE_THRESHOLDS.GOOD) {
      // Prioritize most critical feedback
      const criticalFeedback = feedback[0];
      speak(criticalFeedback, 'medium');
      setLastFeedbackTime(now);
    }
  }, [currentAnalysis, voiceEnabled, speak, lastFeedbackTime]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePauseResume = () => {
    setIsRunning(!isRunning);
    if (isRunning) {
      speak('Session paused', 'high');
    } else {
      speak('Session resumed', 'high');
      sessionStartTime.current = Date.now() - sessionTime * 1000;
    }
  };

  const handleStop = async () => {
    setIsRunning(false);
    stopAnalysis();
    speak('Session completed', 'high');
    
    // Update session with final data
    if (currentAnalysis && sessionId) {
      await updateSession.mutateAsync({
        endTime: new Date(),
        duration: sessionTime,
        averageScore: currentAnalysis.overallScore,
        bodyAlignmentScore: currentAnalysis.bodyAlignmentScore,
        kneePositionScore: currentAnalysis.kneePositionScore,
        shoulderStackScore: currentAnalysis.shoulderStackScore,
        completed: true,
      });
    }
    
    setLocation(`/results/${sessionId}`);
  };

  const getOverallScoreColor = (score: number): string => {
    if (score >= SCORE_THRESHOLDS.EXCELLENT) return 'text-success';
    if (score >= SCORE_THRESHOLDS.GOOD) return 'text-warning';
    return 'text-error';
  };

  const getScoreStatus = (score: number): string => {
    if (score >= SCORE_THRESHOLDS.EXCELLENT) return 'Excellent Form';
    if (score >= SCORE_THRESHOLDS.GOOD) return 'Good Form';
    return 'Needs Improvement';
  };

  const calculateStrokeDashoffset = (score: number): number => {
    const circumference = 2 * Math.PI * 40; // radius = 40
    return circumference - (score / 100) * circumference;
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-xl font-semibold mb-2">Session Not Found</h2>
          <Button onClick={() => setLocation('/')} variant="outline">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-dark-bg relative flex items-center justify-center overflow-hidden">
      {/* Camera Feed */}
      <div className="absolute inset-0 bg-gray-900">
        <CameraFeed 
          onResults={processResults}
          className="w-full h-full"
        />
        <PoseOverlay 
          landmarks={currentLandmarks}
          videoElement={null}
          className="absolute inset-0 pointer-events-none"
        />
      </div>

      {/* Top Status Bar */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
        <div className="flex items-center space-x-3">
          {/* Session Timer */}
          <Card className="bg-surface/80 backdrop-blur-sm px-4 py-2">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-success" />
              <span className="font-medium text-lg text-white">
                {formatTime(sessionTime)}
              </span>
            </div>
          </Card>
          
          {/* Plank Type */}
          {session && (
            <Card className="bg-surface/80 backdrop-blur-sm px-4 py-2">
              <div className="text-white">
                <span className="text-sm text-gray-300">Detected: </span>
                <span className="font-semibold text-success">
                  {session?.plankType === 'high' ? 'High Plank' : 'Elbow Plank'}
                </span>
              </div>
            </Card>
          )}
        </div>

        {/* Voice Feedback Toggle */}
        <Button
          onClick={toggleVoice}
          variant="ghost"
          size="icon"
          className="bg-surface/80 backdrop-blur-sm hover:bg-surface-light/80"
        >
          {voiceEnabled ? (
            <Volume2 className="w-5 h-5 text-success" />
          ) : (
            <VolumeX className="w-5 h-5 text-gray-400" />
          )}
        </Button>
      </div>

      {/* Left Side - Metrics */}
      {currentAnalysis && (
        <MetricsPanel
          bodyAlignmentScore={currentAnalysis.bodyAlignmentScore}
          kneePositionScore={currentAnalysis.kneePositionScore}
          shoulderStackScore={currentAnalysis.shoulderStackScore}
          bodyAlignmentAngle={currentAnalysis.bodyAlignmentAngle}
          kneeAngle={currentAnalysis.kneeAngle}
          shoulderStackAngle={currentAnalysis.shoulderStackAngle}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20"
        />
      )}

      {/* Right Side - Overall Score */}
      {currentAnalysis && (
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20">
          <Card className="bg-surface/80 backdrop-blur-sm p-6 text-center min-w-[180px]">
            <div className="text-sm text-gray-300 mb-2">Overall Score</div>
            <div className="relative mb-4">
              <svg className="w-24 h-24 transform -rotate-90 mx-auto" viewBox="0 0 100 100">
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="#334155" 
                  strokeWidth="8" 
                  fill="none"
                />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="#1DB584" 
                  strokeWidth="8" 
                  fill="none"
                  strokeDasharray="251.2"
                  strokeDashoffset={calculateStrokeDashoffset(currentAnalysis.overallScore)}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-3xl font-bold ${getOverallScoreColor(currentAnalysis.overallScore)}`}>
                  {currentAnalysis.overallScore}
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-400">
              {getScoreStatus(currentAnalysis.overallScore)}
            </div>
          </Card>
        </div>
      )}

      {/* Bottom - Feedback & Controls */}
      <div className="absolute bottom-4 left-4 right-4 z-20">
        {/* Live Feedback */}
        {currentAnalysis?.feedback && currentAnalysis.feedback.length > 0 && (
          <Card className="bg-warning/90 backdrop-blur-sm p-4 mb-4 text-center">
            <div className="flex items-center justify-center space-x-2">
              <span className="font-medium text-black">
                {currentAnalysis.feedback[0]}
              </span>
            </div>
          </Card>
        )}

        {/* Control Buttons */}
        <div className="flex justify-center space-x-6">
          <Button
            onClick={handlePauseResume}
            variant="ghost"
            className="bg-surface/80 backdrop-blur-sm hover:bg-surface-light/80 px-8 py-4"
          >
            {isRunning ? (
              <>
                <Pause className="w-5 h-5 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Resume
              </>
            )}
          </Button>

          <Button
            onClick={handleStop}
            className="bg-error/80 backdrop-blur-sm hover:bg-error px-8 py-4"
          >
            <Square className="w-5 h-5 mr-2" />
            Stop
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="absolute top-1/2 right-4 transform translate-y-16 z-10">
        <Card className="bg-surface/60 backdrop-blur-sm p-2" title="Connection Status">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-success" />
          ) : (
            <WifiOff className="w-4 h-4 text-error" />
          )}
        </Card>
      </div>
    </div>
  );
}
