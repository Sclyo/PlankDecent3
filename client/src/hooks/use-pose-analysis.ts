import { useState, useCallback, useRef } from 'react';
import { analyzePose, type PoseAnalysisResult } from '@/lib/pose-analysis';

interface UsePoseAnalysisOptions {
  onAnalysisUpdate?: (result: PoseAnalysisResult) => void;
  analysisInterval?: number; // in milliseconds
}

export function usePoseAnalysis(options: UsePoseAnalysisOptions = {}) {
  const [currentAnalysis, setCurrentAnalysis] = useState<PoseAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const lastAnalysisRef = useRef<number>(0);
  const analysisInterval = options.analysisInterval || 100; // 10 FPS analysis

  const processResults = useCallback((results: any) => {
    if (!results.poseLandmarks || !isAnalyzing) return;

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

      const analysis = analyzePose(landmarks);
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
    isAnalyzing,
    processResults,
    startAnalysis,
    stopAnalysis,
    resetAnalysis,
  };
}
