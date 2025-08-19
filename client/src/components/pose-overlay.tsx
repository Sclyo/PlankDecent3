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
    
    console.log('PoseOverlay render - landmarks:', landmarks?.length, 'video:', !!videoElement);
    
    if (!canvas || !ctx) {
      console.log('No canvas or context');
      return;
    }
    
    if (!landmarks || landmarks.length === 0) {
      console.log('No landmarks to draw');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // Set canvas size to match the container
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    console.log('Canvas size:', canvas.width, 'x', canvas.height);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set drawing styles for MediaPipe green
    ctx.fillStyle = '#00FF00'; // Bright green for MediaPipe landmarks
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 3;

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

    // Draw ALL landmarks as green dots (MediaPipe style)
    landmarks.forEach((landmark, index) => {
      if (landmark && (landmark.visibility || 0) > 0.3) {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        
        // Draw landmark point with MediaPipe green
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI); // Larger dots
        ctx.fill();
        
        // Add glow effect
        ctx.shadowColor = '#00FF00';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        console.log(`Drawing landmark ${index} at (${x.toFixed(1)}, ${y.toFixed(1)})`);
      }
    });
    
    console.log('Finished drawing', landmarks.length, 'landmarks');

  }, [landmarks, videoElement]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ transform: 'scaleX(-1)' }} // Mirror to match video
    />
  );
}
