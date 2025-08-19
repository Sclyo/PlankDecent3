import { useEffect, useRef } from 'react';

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
    
    // Ensure canvas matches container size exactly for proper alignment
    const containerRect = container.getBoundingClientRect();
    canvas.width = containerRect.width;
    canvas.height = containerRect.height;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set MediaPipe green drawing styles
    ctx.fillStyle = '#00FF00';
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 3;
    
    console.log('Drawing pose overlay - Canvas:', canvas.width, 'x', canvas.height, 'Landmarks:', landmarks.length);

    // MediaPipe pose connections (standard skeleton)
    const poseConnections = [
      // Face
      [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
      // Body torso
      [9, 10], [11, 12], [11, 23], [12, 24], [23, 24],
      // Arms
      [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
      [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
      // Legs
      [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
      [24, 26], [26, 28], [28, 30], [28, 32], [30, 32]
    ];
    
    // Draw skeleton connections
    ctx.lineWidth = 2;
    poseConnections.forEach(([startIdx, endIdx]) => {
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
        
        // Draw landmark dot
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Highlight key joints (shoulders, hips, knees, ankles)
        const keyJoints = [11, 12, 23, 24, 25, 26, 27, 28];
        if (keyJoints.includes(index)) {
          ctx.shadowColor = '#00FF00';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        
        if (index < 5) { // Debug first few landmarks
          console.log(`Landmark ${index} at (${x.toFixed(1)}, ${y.toFixed(1)})`);
        }
      }
    });

  }, [landmarks]);

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