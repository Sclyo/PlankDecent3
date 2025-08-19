import { POSE_LANDMARKS, SCORING_THRESHOLDS, CONFIDENCE_THRESHOLD, FEEDBACK_MESSAGES } from './constants';

export interface PoseAnalysisResult {
  bodyAlignmentAngle: number;
  kneeAngle: number;
  shoulderStackAngle: number;
  bodyAlignmentScore: number;
  kneePositionScore: number;
  shoulderStackScore: number;
  overallScore: number;
  feedback: string[];
  plankType: 'high' | 'elbow' | 'unknown';
}

export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export function calculateAngle(point1: Landmark, point2: Landmark, point3: Landmark): number {
  const vector1 = {
    x: point1.x - point2.x,
    y: point1.y - point2.y,
  };
  
  const vector2 = {
    x: point3.x - point2.x,
    y: point3.y - point2.y,
  };
  
  const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;
  const magnitude1 = Math.sqrt(vector1.x ** 2 + vector1.y ** 2);
  const magnitude2 = Math.sqrt(vector2.x ** 2 + vector2.y ** 2);
  
  const cosAngle = dotProduct / (magnitude1 * magnitude2);
  const angleRad = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
  
  return angleRad * (180 / Math.PI);
}

export function detectPlankType(landmarks: Landmark[]): 'high' | 'elbow' | 'unknown' {
  // Use MediaPipe's 33-point pose landmarks for accurate detection
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const leftElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
  const rightElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
  const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
  const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  
  console.log('Plank detection debug - landmarks available:', {
    leftShoulder: !!leftShoulder,
    rightShoulder: !!rightShoulder,
    leftElbow: !!leftElbow,
    rightElbow: !!rightElbow,
    leftWrist: !!leftWrist,
    rightWrist: !!rightWrist,
    leftHip: !!leftHip,
    rightHip: !!rightHip
  });

  // MediaPipe provides visibility scores - use them for robust detection
  const keyLandmarks = [leftShoulder, rightShoulder, leftElbow, rightElbow, leftWrist, rightWrist, leftHip, rightHip];
  if (keyLandmarks.some(landmark => !landmark || (landmark.visibility || 0) < CONFIDENCE_THRESHOLD)) {
    return 'unknown';
  }

  // Calculate body alignment using MediaPipe's normalized coordinates
  const shoulderCenter = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2
  };
  const hipCenter = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2
  };
  const elbowCenter = {
    x: (leftElbow.x + rightElbow.x) / 2,
    y: (leftElbow.y + rightElbow.y) / 2
  };
  const wristCenter = {
    x: (leftWrist.x + rightWrist.x) / 2,
    y: (leftWrist.y + rightWrist.y) / 2
  };

  // Check if body is roughly horizontal (plank position)
  const torsoAngle = Math.atan2(hipCenter.y - shoulderCenter.y, hipCenter.x - shoulderCenter.x) * (180 / Math.PI);
  const absAngle = Math.abs(torsoAngle);
  
  console.log('Torso angle:', torsoAngle, 'Abs angle:', absAngle);
  
  // Body should be roughly horizontal (within 45 degrees of horizontal - more forgiving)
  if (absAngle > 45 && absAngle < 135) {
    console.log('Body not horizontal enough');
    return 'unknown';
  }

  // Check arm configuration using MediaPipe landmarks
  const shoulderToElbow = Math.sqrt(
    Math.pow(shoulderCenter.x - elbowCenter.x, 2) + 
    Math.pow(shoulderCenter.y - elbowCenter.y, 2)
  );
  const shoulderToWrist = Math.sqrt(
    Math.pow(shoulderCenter.x - wristCenter.x, 2) + 
    Math.pow(shoulderCenter.y - wristCenter.y, 2)
  );
  const elbowToWrist = Math.sqrt(
    Math.pow(elbowCenter.x - wristCenter.x, 2) + 
    Math.pow(elbowCenter.y - wristCenter.y, 2)
  );

  // Determine plank type based on arm extension ratio
  const armExtensionRatio = shoulderToWrist / shoulderToElbow;
  const forearmLength = elbowToWrist;
  
  console.log('Arm detection:', {
    armExtensionRatio,
    forearmLength,
    shoulderToElbow,
    shoulderToWrist,
    elbowToWrist
  });
  
  // High plank: arms extended, wrists far from elbows (more forgiving thresholds)
  if (armExtensionRatio > 1.4 && forearmLength > 0.1) {
    console.log('Detected HIGH plank');
    return 'high';
  }
  // Elbow plank: forearms on ground, wrists close to elbows
  else if (armExtensionRatio < 1.5 && forearmLength < 0.25) {
    console.log('Detected ELBOW plank');
    return 'elbow';
  }

  console.log('Could not determine plank type');
  return 'unknown';
}

export function analyzePose(landmarks: Landmark[]): PoseAnalysisResult {
  const feedback: string[] = [];
  
  // Detect plank type
  const plankType = detectPlankType(landmarks);
  
  // Get better visible side
  const leftSide = [
    landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
    landmarks[POSE_LANDMARKS.LEFT_HIP],
    landmarks[POSE_LANDMARKS.LEFT_KNEE],
    landmarks[POSE_LANDMARKS.LEFT_ANKLE]
  ];
  
  const rightSide = [
    landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
    landmarks[POSE_LANDMARKS.RIGHT_HIP],
    landmarks[POSE_LANDMARKS.RIGHT_KNEE],
    landmarks[POSE_LANDMARKS.RIGHT_ANKLE]
  ];
  
  const leftVisibility = leftSide.reduce((sum, landmark) => sum + (landmark?.visibility || 0), 0) / 4;
  const rightVisibility = rightSide.reduce((sum, landmark) => sum + (landmark?.visibility || 0), 0) / 4;
  
  const useBetterSide = leftVisibility > rightVisibility;
  
  const shoulder = useBetterSide ? landmarks[POSE_LANDMARKS.LEFT_SHOULDER] : landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const hip = useBetterSide ? landmarks[POSE_LANDMARKS.LEFT_HIP] : landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const knee = useBetterSide ? landmarks[POSE_LANDMARKS.LEFT_KNEE] : landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  const ankle = useBetterSide ? landmarks[POSE_LANDMARKS.LEFT_ANKLE] : landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  const elbow = useBetterSide ? landmarks[POSE_LANDMARKS.LEFT_ELBOW] : landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
  const wrist = useBetterSide ? landmarks[POSE_LANDMARKS.LEFT_WRIST] : landmarks[POSE_LANDMARKS.RIGHT_WRIST];

  // Body Alignment Analysis
  let bodyAlignmentAngle = 0;
  let bodyAlignmentScore = 0;
  
  if (shoulder?.visibility && hip?.visibility && ankle?.visibility &&
      shoulder.visibility >= CONFIDENCE_THRESHOLD && 
      hip.visibility >= CONFIDENCE_THRESHOLD && 
      ankle.visibility >= CONFIDENCE_THRESHOLD) {
    
    bodyAlignmentAngle = calculateAngle(shoulder, hip, ankle);
    const deviation = Math.abs(bodyAlignmentAngle - SCORING_THRESHOLDS.BODY_ALIGNMENT.TARGET);
    
    if (deviation <= SCORING_THRESHOLDS.BODY_ALIGNMENT.TOLERANCE) {
      bodyAlignmentScore = 100;
    } else {
      bodyAlignmentScore = Math.max(0, 100 - (deviation - SCORING_THRESHOLDS.BODY_ALIGNMENT.TOLERANCE) * SCORING_THRESHOLDS.BODY_ALIGNMENT.PENALTY_PER_DEGREE);
    }
    
    if (bodyAlignmentAngle < 170) {
      feedback.push(FEEDBACK_MESSAGES.BODY_ALIGNMENT.LOW_ANGLE);
    } else if (bodyAlignmentAngle > 190) {
      feedback.push(FEEDBACK_MESSAGES.BODY_ALIGNMENT.HIGH_ANGLE);
    }
  } else {
    feedback.push(FEEDBACK_MESSAGES.BODY_ALIGNMENT.LOW_VISIBILITY);
  }

  // Knee Position Analysis
  let kneeAngle = 0;
  let kneePositionScore = 0;
  
  if (hip?.visibility && knee?.visibility && ankle?.visibility &&
      hip.visibility >= CONFIDENCE_THRESHOLD && 
      knee.visibility >= CONFIDENCE_THRESHOLD && 
      ankle.visibility >= CONFIDENCE_THRESHOLD) {
    
    kneeAngle = calculateAngle(hip, knee, ankle);
    
    if (kneeAngle >= SCORING_THRESHOLDS.KNEE_POSITION.TARGET) {
      kneePositionScore = 100;
    } else {
      const deficit = SCORING_THRESHOLDS.KNEE_POSITION.TARGET - kneeAngle;
      kneePositionScore = Math.max(0, 100 - deficit * SCORING_THRESHOLDS.KNEE_POSITION.PENALTY_PER_DEGREE);
    }
    
    if (kneeAngle < SCORING_THRESHOLDS.KNEE_POSITION.TARGET) {
      feedback.push(FEEDBACK_MESSAGES.KNEE_POSITION.BENT_LEGS);
    }
  } else {
    feedback.push(FEEDBACK_MESSAGES.KNEE_POSITION.LOW_VISIBILITY);
  }

  // Shoulder Stack Analysis
  let shoulderStackAngle = 0;
  let shoulderStackScore = 0;
  
  const targetJoint = plankType === 'high' ? wrist : elbow;
  
  if (shoulder?.visibility && targetJoint?.visibility &&
      shoulder.visibility >= CONFIDENCE_THRESHOLD && 
      targetJoint.visibility >= CONFIDENCE_THRESHOLD) {
    
    // Calculate horizontal offset
    const horizontalOffset = Math.abs(shoulder.x - targetJoint.x);
    shoulderStackAngle = Math.atan2(Math.abs(shoulder.y - targetJoint.y), horizontalOffset) * (180 / Math.PI);
    
    if (horizontalOffset < SCORING_THRESHOLDS.SHOULDER_STACK.EXCELLENT) {
      shoulderStackScore = 100;
    } else if (horizontalOffset < SCORING_THRESHOLDS.SHOULDER_STACK.GOOD) {
      shoulderStackScore = 80;
    } else {
      shoulderStackScore = 60;
    }
    
    const angleDeviation = Math.abs(shoulderStackAngle - SCORING_THRESHOLDS.SHOULDER_STACK.TARGET);
    if (angleDeviation > SCORING_THRESHOLDS.SHOULDER_STACK.TOLERANCE) {
      if (plankType === 'high') {
        feedback.push(FEEDBACK_MESSAGES.SHOULDER_STACK.HIGH_PLANK);
      } else {
        feedback.push(FEEDBACK_MESSAGES.SHOULDER_STACK.LOW_PLANK);
      }
    }
  } else {
    shoulderStackScore = 50; // Fallback score
  }

  // Calculate overall score
  const overallScore = Math.round((bodyAlignmentScore + kneePositionScore + shoulderStackScore) / 3);

  return {
    bodyAlignmentAngle,
    kneeAngle,
    shoulderStackAngle,
    bodyAlignmentScore: Math.round(bodyAlignmentScore),
    kneePositionScore: Math.round(kneePositionScore),
    shoulderStackScore: Math.round(shoulderStackScore),
    overallScore,
    feedback,
    plankType,
  };
}
