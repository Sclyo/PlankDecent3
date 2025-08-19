export const POSE_LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

export const SCORING_THRESHOLDS = {
  BODY_ALIGNMENT: {
    TARGET: 180,
    TOLERANCE: 15,
    PENALTY_PER_DEGREE: 3,
  },
  KNEE_POSITION: {
    TARGET: 170,
    PENALTY_PER_DEGREE: 2,
  },
  SHOULDER_STACK: {
    TARGET: 90,
    TOLERANCE: 10,
    EXCELLENT: 0.2,
    GOOD: 0.3,
  },
};

export const SCORE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 70,
};

export const CONFIDENCE_THRESHOLD = 0.3; // Lower threshold for mobile camera quality

export const FEEDBACK_MESSAGES = {
  BODY_ALIGNMENT: {
    LOW_ANGLE: "Raise your hips",
    HIGH_ANGLE: "Lower your hips",
    LOW_VISIBILITY: "Can't see your body clearly. Try better lighting.",
  },
  KNEE_POSITION: {
    BENT_LEGS: "Straighten your legs",
    LOW_VISIBILITY: "Can't see your legs clearly. Adjust position.",
  },
  SHOULDER_STACK: {
    HIGH_PLANK: "Keep hands under shoulders",
    LOW_PLANK: "Keep elbows under shoulders",
  },
};
