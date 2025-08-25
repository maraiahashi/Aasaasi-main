import { Award } from "lucide-react";
import { InfoCard } from "@/components/common/InfoCard";
import { defaultAchievements } from "@/data/learningData";

export const AchievementBadges = () => {
  return (
    <InfoCard title="Achievement Badges" icon={Award}>
      <div className="grid grid-cols-2 gap-3">
        {defaultAchievements.map((achievement, index) => (
          <div 
            key={index} 
            className={`p-3 rounded-lg border text-center transition-colors ${
              achievement.earned 
                ? 'bg-success/10 border-success text-success' 
                : 'bg-muted border-muted-foreground/20 text-muted-foreground'
            }`}
          >
            <div className="text-2xl mb-1">{achievement.icon}</div>
            <div className="text-xs font-medium">{achievement.name}</div>
            <div className="text-xs opacity-80">{achievement.description}</div>
          </div>
        ))}
      </div>
    </InfoCard>
  );
};