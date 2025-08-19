import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Clock, 
  Target, 
  TrendingUp, 
  RotateCcw, 
  Home,
  Award,
  BarChart3
} from 'lucide-react';
import { SCORE_THRESHOLDS } from '@/lib/constants';

export default function Results() {
  const [match, params] = useRoute('/results/:sessionId');
  const [, setLocation] = useLocation();
  const sessionId = params?.sessionId;

  const { data: session, isLoading } = useQuery({
    queryKey: ['/api/sessions', sessionId],
    enabled: !!sessionId,
  });

  const { data: analysisData } = useQuery({
    queryKey: ['/api/sessions', sessionId, 'analysis'],
    enabled: !!sessionId,
  });

  const formatTime = (seconds: number | null): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreGrade = (score: number): { grade: string; color: string; description: string } => {
    if (score >= 95) return { grade: 'A+', color: 'text-green-400', description: 'Perfect Form' };
    if (score >= SCORE_THRESHOLDS.EXCELLENT) return { grade: 'A', color: 'text-green-400', description: 'Excellent' };
    if (score >= 85) return { grade: 'B+', color: 'text-blue-400', description: 'Very Good' };
    if (score >= SCORE_THRESHOLDS.GOOD) return { grade: 'B', color: 'text-blue-400', description: 'Good' };
    if (score >= 60) return { grade: 'C', color: 'text-yellow-400', description: 'Fair' };
    return { grade: 'D', color: 'text-red-400', description: 'Needs Work' };
  };

  const getImprovementTips = (session: any): string[] => {
    const tips: string[] = [];
    
    if (session.bodyAlignmentScore < 80) {
      tips.push('Focus on maintaining a straight line from shoulders to ankles');
    }
    if (session.kneePositionScore < 80) {
      tips.push('Keep your legs straight and avoid sagging knees');
    }
    if (session.shoulderStackScore < 80) {
      tips.push('Ensure shoulders are directly over wrists/elbows');
    }
    if (session.averageScore < SCORE_THRESHOLDS.GOOD) {
      tips.push('Practice holding the position for shorter durations with perfect form');
    }
    
    return tips;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-300">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
        <Card className="max-w-md bg-surface/80 border-gray-700">
          <CardContent className="text-center p-8">
            <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Session Not Found</h2>
            <Button onClick={() => setLocation('/')} variant="outline">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scoreGrade = getScoreGrade(session?.averageScore || 0);
  const improvementTips = getImprovementTips(session || {});

  return (
    <div className="min-h-screen bg-dark-bg p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Session Complete!</h1>
          <p className="text-gray-300">Here's how you performed</p>
        </div>

        {/* Overall Score Card */}
        <Card className="bg-surface/80 border-gray-700 backdrop-blur-sm mb-6">
          <CardContent className="p-8 text-center">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              {/* Score Circle */}
              <div className="relative mx-auto">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    stroke="#334155" 
                    strokeWidth="8" 
                    fill="none"
                  />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    stroke="#1DB584" 
                    strokeWidth="8" 
                    fill="none"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - ((session?.averageScore || 0) / 100) * 251.2}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-bold ${scoreGrade.color}`}>
                    {session?.averageScore || 0}
                  </span>
                  <span className="text-sm text-gray-400">Overall</span>
                </div>
              </div>

              {/* Grade & Description */}
              <div>
                <div className={`text-6xl font-bold ${scoreGrade.color} mb-2`}>
                  {scoreGrade.grade}
                </div>
                <p className="text-xl text-gray-300 mb-4">{scoreGrade.description}</p>
                <Badge 
                  variant="secondary" 
                  className="text-sm px-3 py-1"
                >
                  {session?.plankType === 'high' ? 'High Plank' : 'Elbow Plank'}
                </Badge>
              </div>

              {/* Session Stats */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-sm text-gray-400">Duration</p>
                    <p className="font-semibold text-white">{formatTime(session?.duration)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <BarChart3 className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm text-gray-400">Data Points</p>
                    <p className="font-semibold text-white">{Array.isArray(analysisData) ? analysisData.length : 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-surface/80 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white flex items-center">
                <Target className="w-5 h-5 mr-2 text-blue-400" />
                Body Alignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white mb-2">
                {session?.bodyAlignmentScore || 0}
              </div>
              <Progress 
                value={session?.bodyAlignmentScore || 0} 
                className="mb-2"
              />
              <p className="text-sm text-gray-400">
                Shoulder-Hip-Ankle alignment
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface/80 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
                Knee Position
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white mb-2">
                {session?.kneePositionScore || 0}
              </div>
              <Progress 
                value={session?.kneePositionScore || 0} 
                className="mb-2"
              />
              <p className="text-sm text-gray-400">
                Leg straightness
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface/80 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white flex items-center">
                <Award className="w-5 h-5 mr-2 text-purple-400" />
                Shoulder Stack
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white mb-2">
                {session?.shoulderStackScore || 0}
              </div>
              <Progress 
                value={session?.shoulderStackScore || 0} 
                className="mb-2"
              />
              <p className="text-sm text-gray-400">
                Joint alignment
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Improvement Tips */}
        {improvementTips.length > 0 && (
          <Card className="bg-surface/80 border-gray-700 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-blue-400" />
                Improvement Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {improvementTips.map((tip, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-300">{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => setLocation('/setup')}
            className="bg-success hover:bg-success/90 text-white px-8 py-3"
            size="lg"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Try Again
          </Button>
          
          <Button
            onClick={() => setLocation('/')}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-600 px-8 py-3"
            size="lg"
          >
            <Home className="w-5 h-5 mr-2" />
            Home
          </Button>
        </div>
      </div>
    </div>
  );
}
