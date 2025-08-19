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
        console.log('Starting MediaPipe load...');
        
        // Import MediaPipe
        const { Pose } = await import('@mediapipe/pose');
        console.log('MediaPipe imported successfully');
        
        // Initialize Pose with default CDN (the local model approach has issues)
        poseRef.current = new Pose({
          locateFile: (file: string) => {
            console.log('MediaPipe requesting file:', file);
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
          }
        });

        poseRef.current.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.3, // Lower for mobile
          minTrackingConfidence: 0.3
        });

        poseRef.current.onResults((results: any) => {
          console.log('MediaPipe results:', results);
          if (results.poseLandmarks && results.poseLandmarks.length > 0) {
            console.log('Pose landmarks detected:', results.poseLandmarks.length);
          }
          if (resultsCallbackRef.current) {
            resultsCallbackRef.current(results);
          }
        });

        console.log('MediaPipe pose initialized');
        setIsLoaded(true);
      } catch (err) {
        console.error('MediaPipe loading error:', err);
        setError('Failed to load MediaPipe: ' + (err as Error).message);
      }
    };

    loadMediaPipe();
  }, []);

  const initializeCamera = async (videoElement: HTMLVideoElement) => {
    console.log('Initializing camera...');
    if (!isLoaded || !poseRef.current) {
      throw new Error('MediaPipe not loaded');
    }

    try {
      const { Camera } = await import('@mediapipe/camera_utils');
      console.log('Camera utils imported');
      
      cameraRef.current = new Camera(videoElement, {
        onFrame: async () => {
          if (poseRef.current && videoElement.videoWidth > 0) {
            await poseRef.current.send({ image: videoElement });
          }
        },
        width: 640,
        height: 480
      });

      console.log('Starting camera...');
      await cameraRef.current.start();
      console.log('Camera started successfully');
      setIsInitialized(true);
    } catch (err) {
      console.error('Camera initialization error:', err);
      setError('Failed to initialize camera: ' + (err as Error).message);
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
