import { BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui";
import { Badge } from "@/components/ui";
import { InfoCard } from "@/components/common/InfoCard";
import { weeklyProgressData } from "@/data/learningData";

export const WeeklyProgress = () => {
  return (
    <InfoCard title="Weekly Learning Activity" icon={BarChart3}>
      <div className="space-y-3">
        {weeklyProgressData.map((day, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-sm font-medium w-12">{day.day}</span>
            <div className="flex-1 mx-3">
              <div className="flex items-center gap-2">
                <Progress value={(day.words / 15) * 100} className="flex-1" />
                <span className="text-xs text-muted-foreground w-16">{day.words} words</span>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {day.accuracy}%
            </Badge>
          </div>
        ))}
      </div>
    </InfoCard>
  );
};