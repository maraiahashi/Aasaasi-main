import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Button } from "@/components/ui";
import { Badge } from "@/components/ui";
import { Plus } from "lucide-react";

interface WordData {
  word: string;
  definition: string;
  somali: string;
  example: string;
}

interface WordCardProps {
  wordData: WordData;
  isLearned: boolean;
  onMarkLearned: (word: string) => void;
}

export const WordCard = ({ wordData, isLearned, onMarkLearned }: WordCardProps) => {
  return (
    <Card className={`shadow-lg transition-all ${isLearned ? 'bg-success/5 border-success' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-primary">{wordData.word}</CardTitle>
          {isLearned && <Badge className="bg-success">Learned</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-sm uppercase text-muted-foreground mb-1">Definition</h4>
          <p>{wordData.definition}</p>
        </div>
        
        <div>
          <h4 className="font-semibold text-sm uppercase text-muted-foreground mb-1">Somali Translation</h4>
          <p className="text-accent font-semibold">{wordData.somali}</p>
        </div>
        
        <div>
          <h4 className="font-semibold text-sm uppercase text-muted-foreground mb-1">Example</h4>
          <p className="italic text-muted-foreground">"{wordData.example}"</p>
        </div>
        
        <div className="pt-2">
          {!isLearned ? (
            <Button 
              onClick={() => onMarkLearned(wordData.word)}
              className="w-full bg-primary hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add to Learned Words
            </Button>
          ) : (
            <Button variant="outline" className="w-full" disabled>
              ✓ Word Learned
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};