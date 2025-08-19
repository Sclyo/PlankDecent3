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

  const { currentAnalysis, currentLandmarks, processResults, startAnalysis, stopAnalysis } = usePoseAnalysis({
    onAnalysisUpdate: (analysis) => {
      // Store analysis data for final calculations
      analysisDataRef.current.push({
        ...analysis,
        timestamp: Date.now(),
      });
      
      // Debug current analysis
      console.log('Pose analysis:', {
        plankType: analysis.plankType,
        overallScore: analysis.overallScore,
        bodyAlignment: analysis.bodyAlignmentScore,
        hasStarted,
        landmarks: currentLandmarks.length
      });
      
      // Detection flow: When three indicators are green, detect full body AND plank type immediately
      const hasGoodScores = analysis.bodyAlignmentScore >= 30 && 
                           analysis.kneePositionScore >= 30 && 
                           analysis.shoulderStackScore >= 30;
      
      // Step 1: Detect full body AND plank type simultaneously when indicators are green
      if (!fullBodyDetected && hasGoodScores && currentLandmarks.length > 0 && analysis.plankType !== 'unknown') {
        console.log('🎯 FULL BODY AND PLANK TYPE DETECTED!');
        setFullBodyDetected(true);
        setPlankTypeDetected(true);
        setDetectedPlankType(analysis.plankType);
        speak('Full body identified', 'high');
        
        // Announce plank type immediately after
        setTimeout(() => {
          speak(`Plank type: ${analysis.plankType}`, 'high');
        }, 1500);
      }
      
      // Step 2: Start timer
      if (fullBodyDetected && plankTypeDetected && !hasStarted && analysis.plankType !== 'unknown' && analysis.overallScore > 30) {
        console.log(`🎯 STARTING SESSION! Plank: ${analysis.plankType}, Score: ${analysis.overallScore}`);
        setHasStarted(true);
        setIsRunning(true);
        sessionStartTime.current = Date.now();
        setLastAnnouncementTime(Date.now());
        
        // Announce timer start after plank type announcement
        setTimeout(() => {
          speak('Timer started', 'high');
        }, 3000);
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
            
            console.log(`🎙️ Voice announcement: ${timeAnnouncement}`);
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

  // Voice recognition setup
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript.toLowerCase().trim();
        
        console.log('Voice command:', transcript);
        
        if (transcript.includes('stop')) {
          console.log('Stop command detected');
          handleStop();
        }
      };
      
      recognition.onstart = () => {
        setIsListening(true);
        console.log('Voice recognition started');
      };
      
      recognition.onend = () => {
        setIsListening(false);
        console.log('Voice recognition ended');
        // Restart recognition if session is running
        if (hasStarted && isRunning) {
          setTimeout(() => {
            try {
              recognition.start();
            } catch (error) {
              console.log('Recognition restart failed:', error);
            }
          }, 100);
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Voice recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
  }, [hasStarted, isRunning]);

  // Start/stop voice recognition based on session state
  useEffect(() => {
    if (recognitionRef.current) {
      if (hasStarted && isRunning && voiceEnabled) {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.log('Recognition start failed:', error);
        }
      } else {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.log('Recognition stop failed:', error);
        }
      }
    }
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
    <div className="h-screen w-screen bg-dark-bg relative flex items-center justify-center overflow-hidden">
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
          
          {/* Detection Status */}
          <Card className="bg-surface/80 backdrop-blur-sm px-4 py-2">
            <div className="text-white">
              <span className="text-sm text-gray-300">Status: </span>
              <span className="font-semibold text-success">
                {!fullBodyDetected ? 'Detecting body...' :
                 !plankTypeDetected ? 'Detecting plank type...' :
                 !hasStarted ? 'Ready to start' :
                 detectedPlankType === 'high' ? 'High Plank' : 'Elbow Plank'}
              </span>
            </div>
          </Card>
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
        {/* Live Feedback or Getting Ready Message */}
        {!hasStarted ? (
          <Card className="bg-blue-500/90 backdrop-blur-sm p-4 mb-4 text-center">
            <div className="flex items-center justify-center space-x-2">
              <span className="font-medium text-white">
                {currentLandmarks.length === 0 ? 'Position yourself in camera view' :
                 !fullBodyDetected ? 'Stand where your full body is visible' :
                 !plankTypeDetected ? 'Get in plank position' :
                 'Hold position - timer will start soon!'}
              </span>
              {isListening && hasStarted && (
                <span className="text-xs text-gray-300 ml-2">(Say "stop" to end)</span>
              )}
            </div>
          </Card>
        ) : currentAnalysis?.feedback && currentAnalysis.feedback.length > 0 && (
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
