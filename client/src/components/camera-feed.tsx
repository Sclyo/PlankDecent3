import { useEffect, useRef } from 'react';
import { useMediaPipe } from '@/hooks/use-mediapipe';
import { Card } from '@/components/ui/card';
import { AlertCircle, Camera } from 'lucide-react';

interface CameraFeedProps {
  onResults?: (results: any) => void;
  className?: string;
}

export function CameraFeed({ onResults, className = '' }: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isLoaded, isInitialized, error, initializeCamera, stopCamera, onResults: setOnResults } = useMediaPipe();

  useEffect(() => {
    if (onResults) {
      setOnResults(onResults);
    }
  }, [onResults, setOnResults]);

  useEffect(() => {
    const startCamera = async () => {
      if (isLoaded && videoRef.current && !isInitialized) {
        try {
          await initializeCamera(videoRef.current);
        } catch (err) {
          console.error('Failed to start camera:', err);
        }
      }
    };

    startCamera();
  }, [isLoaded, initializeCamera, isInitialized]);

  // Separate cleanup effect to prevent camera blinking
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (error) {
    return (
      <Card className={`flex items-center justify-center bg-red-900/20 border-red-500/20 ${className}`}>
        <div className="text-center p-8">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-300 mb-2">Camera Error</h3>
          <p className="text-red-400">{error}</p>
        </div>
      </Card>
    );
  }

  if (!isLoaded) {
    return (
      <Card className={`flex items-center justify-center bg-surface/80 ${className}`}>
        <div className="text-center p-8">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-300">Loading MediaPipe...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl bg-gray-900 ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
        style={{ transform: 'scaleX(-1)' }} // Mirror the video
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ transform: 'scaleX(-1)' }}
      />
      
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
          <div className="text-center">
            <Camera className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-300">Initializing camera...</p>
          </div>
        </div>
      )}
    </div>
  );
}
