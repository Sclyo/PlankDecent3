import { useEffect, useRef, useState } from 'react';

interface MediaPipeHook {
  isLoaded: boolean;
  isInitialized: boolean;
  error: string | null;
  initializeCamera: (videoElement: HTMLVideoElement) => Promise<void>;
  stopCamera: () => void;
  onResults: (callback: (results: any) => void) => void;
}

export function useMediaPipe(): MediaPipeHook {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const poseRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const resultsCallbackRef = useRef<((results: any) => void) | null>(null);

  useEffect(() => {
    const loadMediaPipe = async () => {
      try {
        // Dynamically import MediaPipe
        const { Pose } = await import('@mediapipe/pose');
        const { Camera } = await import('@mediapipe/camera_utils');
        
        // Initialize Pose
        poseRef.current = new Pose({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
          }
        });

        poseRef.current.setOptions({
          modelComplexity: 0, // Lighter model for mobile performance
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.3, // Lower for better mobile detection
          minTrackingConfidence: 0.3
        });

        poseRef.current.onResults((results: any) => {
          if (resultsCallbackRef.current) {
            resultsCallbackRef.current(results);
          }
        });

        setIsLoaded(true);
      } catch (err) {
        setError('Failed to load MediaPipe');
        console.error('MediaPipe loading error:', err);
      }
    };

    loadMediaPipe();
  }, []);

  const initializeCamera = async (videoElement: HTMLVideoElement) => {
    if (!isLoaded || !poseRef.current) {
      throw new Error('MediaPipe not loaded');
    }

    try {
      const { Camera } = await import('@mediapipe/camera_utils');
      
      cameraRef.current = new Camera(videoElement, {
        onFrame: async () => {
          if (poseRef.current) {
            await poseRef.current.send({ image: videoElement });
          }
        },
        width: 640, // Lower resolution for better mobile performance
        height: 480
      });

      await cameraRef.current.start();
      setIsInitialized(true);
    } catch (err) {
      setError('Failed to initialize camera');
      console.error('Camera initialization error:', err);
      throw err;
    }
  };

  const stopCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    setIsInitialized(false);
  };

  const onResults = (callback: (results: any) => void) => {
    resultsCallbackRef.current = callback;
  };

  return {
    isLoaded,
    isInitialized,
    error,
    initializeCamera,
    stopCamera,
    onResults,
  };
}
