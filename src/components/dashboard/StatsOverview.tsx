import { StatCard } from "@/components/common/StatCard";

interface StatsOverviewProps {
  wordsSearched: number;
  quizzesCompleted: number; 
  accuracy: number;
  grammarTopics: number;
}

export const StatsOverview = ({ wordsSearched, quizzesCompleted, accuracy, grammarTopics }: StatsOverviewProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <StatCard value={wordsSearched} label="Words Searched" variant="primary" />
      <StatCard value={quizzesCompleted} label="Quizzes Done" variant="success" />
      <StatCard value={`${accuracy}%`} label="Avg Accuracy" variant="accent" />
      <StatCard value={grammarTopics} label="Grammar Topics" variant="warning" />
    </div>
  );
};