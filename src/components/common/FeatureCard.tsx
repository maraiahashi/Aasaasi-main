import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { Button } from "@/components/ui";
import { Badge } from "@/components/ui";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
  status: string;
  path?: string;
  onClick?: () => void;
}

/**
 * Reusable feature card component for homepage grid
 * Handles different status states and navigation
 */
export const FeatureCard = ({ 
  icon: IconComponent, 
  title, 
  description, 
  gradient, 
  status, 
  path, 
  onClick 
}: FeatureCardProps) => {
  const isComingSoon = status === "Coming Soon";
  
  return (
    <Card 
      className={`card-enhanced group cursor-pointer relative overflow-hidden ${
        isComingSoon ? 'opacity-75' : ''
      }`}
      onClick={() => !isComingSoon && onClick?.()}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 group-hover:from-primary/10 group-hover:to-accent/10 transition-all duration-300"></div>
      
      <CardHeader className="text-center pb-4 relative">
        <div className={`w-20 h-20 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <IconComponent className="h-8 w-8 text-white" />
        </div>
        
        <div className="flex items-center justify-center gap-2 mb-2">
          <CardTitle className="text-lg font-bold">{title}</CardTitle>
          <Badge 
            variant={status === "Active" ? "default" : status === "Beta" ? "secondary" : "outline"}
            className="text-xs"
          >
            {status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="text-center pt-0 relative">
        <CardDescription className="text-sm leading-relaxed">
          {description}
        </CardDescription>
        
        {!isComingSoon && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          >
            Explore →
          </Button>
        )}
      </CardContent>
      
      {isComingSoon && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
          <Badge variant="outline" className="text-sm font-medium">
            Coming Soon
          </Badge>
        </div>
      )}
    </Card>
  );
};