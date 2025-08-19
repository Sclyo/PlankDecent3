import { useState, useCallback, useRef } from 'react';
import { analyzePose, type PoseAnalysisResult } from '@/lib/pose-analysis';

interface UsePoseAnalysisOptions {
  onAnalysisUpdate?: (result: PoseAnalysisResult) => void;
  analysisInterval?: number; // in milliseconds
}

export function usePoseAnalysis(options: UsePoseAnalysisOptions = {}) {
  const [currentAnalysis, setCurrentAnalysis] = useState<PoseAnalysisResult | null>(null);
  const [currentLandmarks, setCurrentLandmarks] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const lastAnalysisRef = useRef<number>(0);
  const analysisInterval = options.analysisInterval || 100; // 10 FPS analysis

  const processResults = useCallback((results: any) => {
    console.log('MediaPipe Results:', results); // Debug log
    
    if (!results.poseLandmarks || !isAnalyzing) {
      console.log('No pose landmarks or not analyzing');
      return;
    }

    const now = Date.now();
    if (now - lastAnalysisRef.current < analysisInterval) {
      return; // Skip this frame to maintain desired FPS
    }

    try {
      const landmarks = results.poseLandmarks.map((landmark: any) => ({
        x: landmark.x,
        y: landmark.y,
        z: landmark.z,
        visibility: landmark.visibility,
      }));

      console.log('Processed landmarks:', landmarks.length); // Debug log
      
      // Store the raw landmarks for overlay rendering
      setCurrentLandmarks(landmarks);
      
      const analysis = analyzePose(landmarks);
      console.log('Analysis result:', analysis); // Debug log
      
      setCurrentAnalysis(analysis);
      options.onAnalysisUpdate?.(analysis);
      lastAnalysisRef.current = now;
    } catch (error) {
      console.error('Pose analysis error:', error);
    }
  }, [isAnalyzing, analysisInterval, options.onAnalysisUpdate]);

  const startAnalysis = useCallback(() => {
    setIsAnalyzing(true);
  }, []);

  const stopAnalysis = useCallback(() => {
    setIsAnalyzing(false);
    setCurrentAnalysis(null);
  }, []);

  const resetAnalysis = useCallback(() => {
    setCurrentAnalysis(null);
    lastAnalysisRef.current = 0;
  }, []);

  return {
    currentAnalysis,
    currentLandmarks,
    isAnalyzing,
    processResults,
    startAnalysis,
    stopAnalysis,
    resetAnalysis,
  };
}
