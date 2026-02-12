import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'subtle' | 'glow';
}

export function GlassCard({ 
  children, 
  className,
  variant = 'default'
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass-card",
        variant === 'glow' && "pulse-glow",
        variant === 'subtle' && "bg-glass-hover",
        className
      )}
    >
      {children}
    </div>
  );
}
