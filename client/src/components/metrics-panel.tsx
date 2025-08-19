import { Card } from '@/components/ui/card';
import { CheckCircle, TriangleAlert, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricsPanelProps {
  bodyAlignmentScore: number;
  kneePositionScore: number;
  shoulderStackScore: number;
  bodyAlignmentAngle: number;
  kneeAngle: number;
  shoulderStackAngle: number;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-success';
  if (score >= 70) return 'text-warning';
  return 'text-error';
}

function getScoreIcon(score: number) {
  if (score >= 90) return CheckCircle;
  if (score >= 70) return TriangleAlert;
  return TriangleAlert;
}

interface MetricCardProps {
  title: string;
  score: number;
  angle: number;
  target: string;
  className?: string;
}

function MetricCard({ title, score, angle, target, className }: MetricCardProps) {
  const ScoreIcon = getScoreIcon(score);
  const scoreColor = getScoreColor(score);

  return (
    <Card className={cn("bg-surface/80 backdrop-blur-sm p-4 min-w-[160px]", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-300">{title}</span>
        <ScoreIcon className={cn("h-4 w-4", scoreColor)} />
      </div>
      <div className="flex items-center space-x-2">
        <div className={cn("text-2xl font-bold transition-all duration-300", scoreColor)}>
          {score}
        </div>
        <div className="text-sm text-gray-400">/100</div>
      </div>
      <div className="text-xs text-gray-400 mt-1">
        {angle.toFixed(0)}° ({target})
      </div>
    </Card>
  );
}

export function MetricsPanel({
  bodyAlignmentScore,
  kneePositionScore,
  shoulderStackScore,
  bodyAlignmentAngle,
  kneeAngle,
  shoulderStackAngle,
  className = '',
}: MetricsPanelProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <MetricCard
        title="Body Alignment"
        score={bodyAlignmentScore}
        angle={bodyAlignmentAngle}
        target="Target: 180°"
      />
      
      <MetricCard
        title="Knee Position"
        score={kneePositionScore}
        angle={kneeAngle}
        target="Target: ≥170°"
      />
      
      <MetricCard
        title="Shoulder Stack"
        score={shoulderStackScore}
        angle={shoulderStackAngle}
        target="Target: 90°"
      />
    </div>
  );
}
