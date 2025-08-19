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
    
    if (!canvas || !ctx) return;
    
    if (!landmarks || landmarks.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // Get the parent container (video container)
    const container = canvas.parentElement;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    
    // Set canvas to match container exactly
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.width = containerRect.width;
    canvas.height = containerRect.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set drawing styles for MediaPipe green
    ctx.fillStyle = '#00FF00'; // Bright green for MediaPipe landmarks
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 4;
    
    console.log('Drawing landmarks on canvas:', canvas.width, 'x', canvas.height, 'landmarks:', landmarks.length);

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

    // Draw connections first (skeleton)
    const connections = [
      // Head
      [0, 1], [1, 2], [2, 3], [3, 7],
      [0, 4], [4, 5], [5, 6], [6, 8],
      // Body
      [9, 10], [11, 12], [11, 13], [13, 15],
      [15, 17], [15, 19], [15, 21], [17, 19],
      [12, 14], [14, 16], [16, 18], [16, 20],
      [16, 22], [18, 20], [11, 23], [12, 24],
      [23, 24], [23, 25], [24, 26], [25, 27],
      [26, 28], [27, 29], [28, 30], [29, 31], [30, 32],
      [27, 31], [28, 32]
    ];
    
    // Draw connections
    ctx.lineWidth = 2;
    connections.forEach(([startIdx, endIdx]) => {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      
      if (start && end && 
          (start.visibility || 0) > 0.3 && 
          (end.visibility || 0) > 0.3) {
        
        const startX = start.x * canvas.width;
        const startY = start.y * canvas.height;
        const endX = end.x * canvas.width;
        const endY = end.y * canvas.height;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    });
    
    // Draw landmark points
    landmarks.forEach((landmark, index) => {
      if (landmark && (landmark.visibility || 0) > 0.3) {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        
        // Draw landmark point with MediaPipe green
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add glow effect for key joints
        const keyJoints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]; // Important joints
        if (keyJoints.includes(index)) {
          ctx.shadowColor = '#00FF00';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, 2 * Math.PI);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    });

  }, [landmarks, videoElement]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ 
        transform: 'scaleX(-1)', // Mirror to match video
        zIndex: 10
      }}
    />
  );
}
