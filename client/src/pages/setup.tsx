import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CameraFeed } from '@/components/camera-feed';
import { PoseOverlay } from '@/components/pose-overlay';
import { usePoseAnalysis } from '@/hooks/use-pose-analysis';
import { useVoiceFeedback } from '@/hooks/use-voice-feedback';
import { apiRequest } from '@/lib/queryClient';
import { CheckCircle, AlertCircle, User, Ruler } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface SetupChecks {
  distance: boolean;
  bodyVisible: boolean;
  plankType: 'high' | 'elbow' | 'unknown';
}

export default function Setup() {
  const [, setLocation] = useLocation();
  const [setupChecks, setSetupChecks] = useState<SetupChecks>({
    distance: false,
    bodyVisible: false,
    plankType: 'unknown',
  });
  const [isReady, setIsReady] = useState(false);
  const isMobile = useIsMobile();
  
  const { currentAnalysis, currentLandmarks, processResults, startAnalysis } = usePoseAnalysis();
  const { speak, isEnabled: voiceEnabled } = useVoiceFeedback();

  const createSession = useMutation({
    mutationFn: async (sessionData: any) => {
      const response = await apiRequest('POST', '/api/sessions', sessionData);
      return response.json();
    },
  });

  useEffect(() => {
    startAnalysis();
  }, [startAnalysis]);

  useEffect(() => {
    if (currentAnalysis) {
      const { plankType } = currentAnalysis;
      
      // PROPER distance check - all scores must be present (more forgiving thresholds)
      const hasGoodScores = currentAnalysis.bodyAlignmentScore >= 20 && 
                           currentAnalysis.kneePositionScore >= 20 && 
                           currentAnalysis.shoulderStackScore >= 20;
      
      // Distance is good if we have meaningful pose analysis scores
      const distance = hasGoodScores;
      
      // Body visible requires plank detection AND good scoring on all metrics
      const bodyVisible = (plankType === 'high' || plankType === 'elbow') && 
                         hasGoodScores;
      
      const newChecks = {
        distance,
        bodyVisible,
        plankType,
      };
      
      setSetupChecks(newChecks);
      
      // All conditions must be genuinely met
      const ready = distance && bodyVisible && (plankType === 'high' || plankType === 'elbow');
      if (ready !== isReady) {
        setIsReady(ready);
        if (ready && voiceEnabled) {
          speak('Setup complete! You can start coaching now.', 'medium');
        }
      }
    }
  }, [currentAnalysis, isReady, speak, voiceEnabled]);

  const handleStartCoaching = async () => {
    if (!isReady) return;
    
    try {
      const session = await createSession.mutateAsync({
        plankType: setupChecks.plankType,
        userId: null, // Anonymous session
      });
      
      setLocation(`/coaching/${session.id}`);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleForceStart = async () => {
    try {
      const session = await createSession.mutateAsync({
        plankType: setupChecks.plankType || 'high',
        userId: null,
      });
      
      setLocation(`/coaching/${session.id}`);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
        <Card className="max-w-md bg-surface/80 border-gray-700">
          <CardContent className="text-center p-8">
            <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Mobile Device Required</h2>
            <p className="text-gray-300">
              This app is optimized for mobile devices. Please access it from your smartphone or tablet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg p-4 landscape:p-2">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-surface/80 border-gray-700 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl text-white">Setup Your Plank</CardTitle>
            <p className="text-gray-300 text-sm">
              {isMobile && 'landscape:' ? 'Rotate to landscape for best experience' : 'Position yourself for optimal tracking'}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Camera Feed */}
            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
              <CameraFeed 
                onResults={processResults}
                className="w-full h-full"
              />
              <PoseOverlay 
                landmarks={currentLandmarks}
                videoElement={undefined}
                className="absolute inset-0 pointer-events-none"
              />
            </div>

            {/* Setup Checks */}
            <div className="grid grid-cols-1 landscape:grid-cols-3 gap-4">
              <Card className="bg-surface-light/50 border-gray-600">
                <CardContent className="p-4 flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    setupChecks.distance ? 'bg-success/20' : 'bg-gray-600'
                  }`}>
                    {setupChecks.distance ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <Ruler className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">Distance</p>
                    <p className="text-xs text-gray-400">
                      {setupChecks.distance ? 'Good distance' : 'Get in plank position'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface-light/50 border-gray-600">
                <CardContent className="p-4 flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    setupChecks.bodyVisible ? 'bg-success/20' : 'bg-gray-600'
                  }`}>
                    {setupChecks.bodyVisible ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <User className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">Body Visible</p>
                    <p className="text-xs text-gray-400">
                      {setupChecks.bodyVisible ? 'Full body detected' : 'Hold plank position'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface-light/50 border-gray-600">
                <CardContent className="p-4 flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    setupChecks.plankType !== 'unknown' ? 'bg-success/20' : 'bg-gray-600'
                  }`}>
                    {setupChecks.plankType !== 'unknown' ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">Plank Type</p>
                    <div className="flex items-center space-x-2">
                      {setupChecks.plankType !== 'unknown' ? (
                        <Badge variant="secondary" className="text-xs">
                          {setupChecks.plankType === 'high' ? 'High Plank' : 'Elbow Plank'}
                        </Badge>
                      ) : (
                        <p className="text-xs text-gray-400">Get in position</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <Button
                onClick={handleStartCoaching}
                disabled={!isReady || createSession.isPending}
                className={`flex-1 py-3 font-semibold ${
                  isReady 
                    ? 'bg-success hover:bg-success/90 text-white' 
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {createSession.isPending ? 'Starting...' : 'Start Coaching'}
              </Button>
              
              <Button
                onClick={handleForceStart}
                disabled={createSession.isPending}
                variant="outline"
                className="px-6 py-3 border-gray-600 text-gray-300 hover:bg-gray-600"
              >
                Force Start
              </Button>
            </div>

            <div className="text-center text-xs text-gray-400">
              Ensure good lighting and stable positioning for best results
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
