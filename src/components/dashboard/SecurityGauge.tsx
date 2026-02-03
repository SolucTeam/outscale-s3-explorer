import React from 'react';

interface SecurityGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export const SecurityGauge: React.FC<SecurityGaugeProps> = ({ 
  score, 
  size = 120, 
  strokeWidth = 12 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // Semi-circle
  const offset = circumference - (score / 100) * circumference;
  
  const getScoreClass = (score: number) => {
    if (score >= 80) return 'security-gauge__fill--good';
    if (score >= 50) return 'security-gauge__fill--warning';
    return 'security-gauge__fill--critical';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'hsl(var(--success))';
    if (score >= 50) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Bon';
    if (score >= 50) return 'Moyen';
    return 'Critique';
  };

  return (
    <div className="security-gauge flex flex-col items-center">
      <svg 
        width={size} 
        height={size / 2 + 10} 
        viewBox={`0 0 ${size} ${size / 2 + 10}`}
        className="overflow-visible"
      >
        {/* Background track */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          className="security-gauge__track"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Animated fill */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          className={`security-gauge__fill ${getScoreClass(score)}`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ 
            animation: 'gauge-fill 1s ease-out forwards',
            '--gauge-offset': offset 
          } as React.CSSProperties}
        />
        
        {/* Score text */}
        <text
          x={size / 2}
          y={size / 2 - 5}
          textAnchor="middle"
          className="font-mono font-bold text-2xl"
          fill={getScoreColor(score)}
        >
          {score}%
        </text>
      </svg>
      
      <span 
        className="text-sm font-medium mt-1"
        style={{ color: getScoreColor(score) }}
      >
        {getScoreLabel(score)}
      </span>
    </div>
  );
};
