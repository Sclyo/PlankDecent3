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
        // Import MediaPipe
        const { Pose } = await import('@mediapipe/pose');
        
        // Initialize Pose with local model
        poseRef.current = new Pose({
          locateFile: (file: string) => {
            // Use local model file for pose_landmarker_full.task
            if (file === 'pose_landmarker_full.task') {
              return '/attached_assets/pose_landmarker_full_1755606052928.task';
            }
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
          }
        });

        poseRef.current.setOptions({
          modelComplexity: 1, // Use full model complexity with local file
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
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
