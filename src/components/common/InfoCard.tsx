import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { LucideIcon } from "lucide-react";

interface InfoCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export const InfoCard = ({ title, description, icon: Icon, children, className }: InfoCardProps) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-primary flex items-center gap-2">
          {Icon && <Icon className="h-6 w-6" />}
          {title}
        </CardTitle>
        {description && <p className="text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};