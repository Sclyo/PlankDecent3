import { useEffect, useRef } from 'react';
import { POSE_LANDMARKS, CONFIDENCE_THRESHOLD } from '@/lib/constants';

interface PoseOverlayProps {
  landmarks?: any[];
  videoElement?: HTMLVideoElement;
  className?: string;
}

export function PoseOverlay({ landmarks, videoElement, className = '' }: PoseOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!canvas || !ctx || !landmarks || !videoElement) return;

    // Set canvas size to match video
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set drawing styles
    ctx.fillStyle = '#1DB584';
    ctx.strokeStyle = '#1DB584';
    ctx.lineWidth = 2;

    // Draw connections
    const connections = [
      // Body outline
      [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
      [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
      [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
      [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
      
      // Arms
      [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
      [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
      [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
      [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
      
      // Legs
      [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
      [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
      [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
      [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
    ];

    // Draw connections
    connections.forEach(([startIdx, endIdx]) => {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      
      if (start && end && 
          start.visibility > CONFIDENCE_THRESHOLD && 
          end.visibility > CONFIDENCE_THRESHOLD) {
        
        ctx.beginPath();
        ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
        ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
        ctx.stroke();
      }
    });

    // Draw key landmarks
    const keyLandmarks = [
      POSE_LANDMARKS.LEFT_SHOULDER,
      POSE_LANDMARKS.RIGHT_SHOULDER,
      POSE_LANDMARKS.LEFT_ELBOW,
      POSE_LANDMARKS.RIGHT_ELBOW,
      POSE_LANDMARKS.LEFT_WRIST,
      POSE_LANDMARKS.RIGHT_WRIST,
      POSE_LANDMARKS.LEFT_HIP,
      POSE_LANDMARKS.RIGHT_HIP,
      POSE_LANDMARKS.LEFT_KNEE,
      POSE_LANDMARKS.RIGHT_KNEE,
      POSE_LANDMARKS.LEFT_ANKLE,
      POSE_LANDMARKS.RIGHT_ANKLE,
    ];

    keyLandmarks.forEach((landmarkIdx) => {
      const landmark = landmarks[landmarkIdx];
      if (landmark && landmark.visibility > CONFIDENCE_THRESHOLD) {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        
        // Draw landmark point
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add glow effect
        ctx.shadowColor = '#1DB584';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

  }, [landmarks, videoElement]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ transform: 'scaleX(-1)' }} // Mirror to match video
    />
  );
}
