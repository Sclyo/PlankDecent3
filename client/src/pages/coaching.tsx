import { useState, useEffect, useRef } from 'react';

// Web Speech API types
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: any) => void;
  onstart: () => void;
  onend: () => void;
  onerror: (event: any) => void;
}
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
  
  const [isRunning, setIsRunning] = useState(false); // Start paused until pose detected
  const [sessionTime, setSessionTime] = useState(0);
  const [lastFeedbackTime, setLastFeedbackTime] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [lastAnnouncementTime, setLastAnnouncementTime] = useState(0);
  const [fullBodyDetected, setFullBodyDetected] = useState(false);
  const [plankTypeDetected, setPlankTypeDetected] = useState(false);
  const [detectedPlankType, setDetectedPlankType] = useState<'high' | 'elbow' | 'unknown'>('unknown');
  const [isListening, setIsListening] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionStartTime = useRef<number>(0);
  const analysisDataRef = useRef<any[]>([]);
  const recognitionRef = useRef<any>(null);
  const stablePlankTypeRef = useRef<'high' | 'elbow' | 'unknown'>('unknown');
  const stablePlankStartTimeRef = useRef<number>(0);

  const { currentAnalysis, currentLandmarks, processResults, startAnalysis, stopAnalysis } = usePoseAnalysis({
    onAnalysisUpdate: (analysis) => {
      // Store analysis data for final calculations
      analysisDataRef.current.push({
        ...analysis,
        timestamp: Date.now(),
      });
      
      // Check if position is stable (same plank type for 1 second)
      if (analysis.plankType !== 'unknown' && 
          analysis.bodyAlignmentScore >= 40 && 
          analysis.kneePositionScore >= 40) {
        
        const now = Date.now();
        
        // If plank type changed, reset stability timer
        if (analysis.plankType !== stablePlankTypeRef.current) {
          stablePlankTypeRef.current = analysis.plankType;
          stablePlankStartTimeRef.current = now;
        }
        
        // Check if position has been stable for 1 second
        const stableForMs = now - stablePlankStartTimeRef.current;
        
        // If stable for 1 second and not yet identified
        if (!plankTypeDetected && stableForMs >= 1000) {
          setPlankTypeDetected(true);
          setDetectedPlankType(analysis.plankType);
          setFullBodyDetected(true);
          
          // Announce the specific plank type
          const announcement = analysis.plankType === 'high' 
            ? 'High plank identified' 
            : 'Elbow plank identified';
          speak(announcement, 'high');
          
          // Start timer after identification
          if (!hasStarted) {
            setTimeout(() => {
              setHasStarted(true);
              setIsRunning(true);
              sessionStartTime.current = Date.now();
              setLastAnnouncementTime(Date.now());
              speak('Timer started', 'high');
            }, 1500);
          }
        }
      } else {
        // Reset stability tracking if position is lost
        if (stablePlankTypeRef.current !== 'unknown') {
          stablePlankTypeRef.current = 'unknown';
          stablePlankStartTimeRef.current = 0;
        }
      }
      
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

  // Timer effect with voice announcements every 10 seconds
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && hasStarted) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartTime.current) / 1000);
        setSessionTime(elapsed);
        
        // Voice announcement every 10 seconds
        if (elapsed > 0 && elapsed % 10 === 0) {
          const currentTime = Date.now();
          // Only announce if we haven't announced in the last 5 seconds (prevents duplicates)
          if (currentTime - lastAnnouncementTime >= 5000) {
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            
            let timeAnnouncement = '';
            if (minutes > 0) {
              timeAnnouncement = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
              if (seconds > 0) {
                timeAnnouncement += ` ${seconds} second${seconds !== 1 ? 's' : ''}`;
              }
            } else {
              timeAnnouncement = `${seconds} second${seconds !== 1 ? 's' : ''}`;
            }
            
            speak(`${timeAnnouncement} completed. Keep holding!`, 'medium');
            setLastAnnouncementTime(currentTime);
          }
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, hasStarted, lastAnnouncementTime, speak]);

  // Always run analysis to detect pose
  useEffect(() => {
    startAnalysis();
    return () => stopAnalysis();
  }, [startAnalysis, stopAnalysis]);

  // Voice recognition setup and management
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognitionRef.current = recognition;
    }
  }, []);

  // Voice command handler for stop
  useEffect(() => {
    if (recognitionRef.current && hasStarted && isRunning && voiceEnabled) {
      const recognition = recognitionRef.current;
      
      recognition.onresult = (event: any) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript.toLowerCase().trim();
        
        if (transcript.includes('stop')) {
          handleStop();
        }
      };
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onend = () => {
        setIsListening(false);
        // Restart if still in session
        if (hasStarted && isRunning) {
          setTimeout(() => {
            try {
              recognition.start();
            } catch (error) {
            }
          }, 500);
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Voice recognition error:', event.error);
        setIsListening(false);
      };
      
      try {
        recognition.start();
      } catch (error) {
      }
    } else if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
        }
      }
    };
  }, [hasStarted, isRunning, voiceEnabled]);

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
    
    // Calculate final scores from all analysis data
    const analysisData = analysisDataRef.current;
    console.log('Calculating final scores from', analysisData.length, 'data points');
    
    if (analysisData.length > 0 && sessionId) {
      // Calculate averages from all analysis data points
      const avgBodyAlignment = Math.round(
        analysisData.reduce((sum, data) => sum + data.bodyAlignmentScore, 0) / analysisData.length
      );
      const avgKneePosition = Math.round(
        analysisData.reduce((sum, data) => sum + data.kneePositionScore, 0) / analysisData.length
      );
      const avgShoulderStack = Math.round(
        analysisData.reduce((sum, data) => sum + data.shoulderStackScore, 0) / analysisData.length
      );
      const avgOverallScore = Math.round((avgBodyAlignment + avgKneePosition + avgShoulderStack) / 3);
      
      const plankType = analysisData[analysisData.length - 1]?.plankType || 'unknown';
      
      console.log('Final scores:', {
        avgOverallScore,
        avgBodyAlignment,
        avgKneePosition, 
        avgShoulderStack,
        plankType
      });
      
      await updateSession.mutateAsync({
        endTime: new Date(),
        duration: sessionTime,
        averageScore: avgOverallScore,
        bodyAlignmentScore: avgBodyAlignment,
        kneePositionScore: avgKneePosition,
        shoulderStackScore: avgShoulderStack,
        plankType,
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
    <div className="h-screen w-screen bg-dark-bg relative overflow-hidden">
      {/* Camera Feed */}
      <div className="absolute inset-0 bg-gray-900">
        <CameraFeed 
          onResults={processResults}
          className="w-full h-full"
        />
        {currentLandmarks.length > 0 && (
          <PoseOverlay 
            landmarks={currentLandmarks}
            videoElement={undefined}
            className=""
          />
        )}
      </div>

      {/* Top Status Bar */}
      <div className="absolute top-2 left-2 right-2 flex justify-between items-center z-20">
        <div className="flex items-center space-x-2">
          {/* Session Timer */}
          <Card className="bg-surface/80 backdrop-blur-sm px-3 py-1">
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3 text-success" />
              <span className="font-medium text-sm text-white">
                {formatTime(sessionTime)}
              </span>
            </div>
          </Card>
          
          {/* Detection Status */}
          <Card className="bg-surface/80 backdrop-blur-sm px-3 py-1">
            <div className="text-white text-xs">
              <span className="font-semibold text-success">
                {!fullBodyDetected ? 'Detecting...' :
                 !plankTypeDetected ? 'Plank type...' :
                 !hasStarted ? 'Ready' :
                 detectedPlankType === 'high' ? 'High Plank' : 'Elbow Plank'}
              </span>
              {isListening && hasStarted && (
                <span className="ml-1 text-gray-300">(Say "stop")</span>
              )}
            </div>
          </Card>
        </div>

        {/* Voice Feedback Toggle */}
        <Button
          onClick={toggleVoice}
          variant="ghost"
          size="sm"
          className="bg-surface/80 backdrop-blur-sm hover:bg-surface-light/80 p-2"
        >
          {voiceEnabled ? (
            <Volume2 className="w-4 h-4 text-success" />
          ) : (
            <VolumeX className="w-4 h-4 text-gray-400" />
          )}
        </Button>
      </div>

      {/* Horizontal Metrics Bar - Top */}
      {currentAnalysis && (
        <div className="absolute top-16 left-2 right-2 z-20">
          <div className="flex justify-between space-x-2">
            <Card className="bg-surface/80 backdrop-blur-sm p-2 flex-1 text-center">
              <div className="text-xs text-gray-300">Body</div>
              <div className={`text-lg font-bold ${currentAnalysis.bodyAlignmentScore >= 70 ? 'text-success' : 'text-error'}`}>
                {currentAnalysis.bodyAlignmentScore}
              </div>
            </Card>
            <Card className="bg-surface/80 backdrop-blur-sm p-2 flex-1 text-center">
              <div className="text-xs text-gray-300">Knee</div>
              <div className={`text-lg font-bold ${currentAnalysis.kneePositionScore >= 70 ? 'text-success' : 'text-error'}`}>
                {currentAnalysis.kneePositionScore}
              </div>
            </Card>
            <Card className="bg-surface/80 backdrop-blur-sm p-2 flex-1 text-center">
              <div className="text-xs text-gray-300">Shoulder</div>
              <div className={`text-lg font-bold ${currentAnalysis.shoulderStackScore >= 70 ? 'text-success' : 'text-error'}`}>
                {currentAnalysis.shoulderStackScore}
              </div>
            </Card>
            <Card className="bg-surface/80 backdrop-blur-sm p-2 flex-1 text-center">
              <div className="text-xs text-gray-300">Overall</div>
              <div className={`text-lg font-bold ${getOverallScoreColor(currentAnalysis.overallScore)}`}>
                {currentAnalysis.overallScore}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Bottom - Feedback & Controls */}
      <div className="absolute bottom-2 left-2 right-2 z-20">
        {/* Live Feedback or Getting Ready Message */}
        {!hasStarted ? (
          <Card className="bg-blue-500/90 backdrop-blur-sm p-3 mb-3 text-center">
            <div className="text-white text-sm">
              {currentLandmarks.length === 0 ? 'Position yourself in camera view' :
               !fullBodyDetected ? 'Stand where your full body is visible' :
               !plankTypeDetected ? 'Get in plank position' :
               'Hold position - timer will start soon!'}
            </div>
          </Card>
        ) : currentAnalysis?.feedback && currentAnalysis.feedback.length > 0 && (
          <Card className="bg-warning/90 backdrop-blur-sm p-3 mb-3 text-center">
            <div className="text-black text-sm font-medium">
              {currentAnalysis.feedback[0]}
            </div>
          </Card>
        )}

        {/* Control Buttons */}
        <div className="flex justify-center space-x-4">
          <Button
            onClick={handlePauseResume}
            variant="ghost"
            size="sm"
            className="bg-surface/80 backdrop-blur-sm hover:bg-surface-light/80 px-4 py-2"
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 mr-1" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1" />
                Resume
              </>
            )}
          </Button>

          <Button
            onClick={handleStop}
            size="sm"
            className="bg-error/80 backdrop-blur-sm hover:bg-error px-4 py-2"
          >
            <Square className="w-4 h-4 mr-1" />
            Stop
          </Button>
        </div>
      </div>
    </div>
  );
}
