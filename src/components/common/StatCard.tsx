import { Card, CardContent } from "@/components/ui";

interface StatCardProps {
  value: string | number;
  label: string;
  variant?: 'primary' | 'success' | 'accent' | 'warning';
}

export const StatCard = ({ value, label, variant = 'primary' }: StatCardProps) => {
  const colorClasses = {
    primary: 'text-primary',
    success: 'text-success', 
    accent: 'text-accent',
    warning: 'text-warning'
  };

  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className={`text-2xl font-bold ${colorClasses[variant]}`}>{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
};