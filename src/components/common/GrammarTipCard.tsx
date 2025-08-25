import { Card, CardContent } from "@/components/ui";
import { Badge } from "@/components/ui";

interface GrammarExample {
  correct: string;
  incorrect: string;
  explanation: string;
}

interface GrammarTipData {
  title: string;
  category: string;
  rule: string;
  examples: GrammarExample[];
}

interface GrammarTipCardProps {
  tip: GrammarTipData;
}

/**
 * Displays grammar tip with correct/incorrect examples
 * Used in GrammarWise page for educational content
 */
export const GrammarTipCard = ({ tip }: GrammarTipCardProps) => {
  return (
    <Card className="mb-8 shadow-lg">
      <CardContent className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">{tip.title}</h3>
          <Badge className="bg-success">{tip.category}</Badge>
        </div>
        
        <p className="text-lg text-muted-foreground">{tip.rule}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tip.examples.map((example, index) => (
            <div key={index} className="space-y-3">
              <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="w-4 h-4 bg-destructive rounded-full flex items-center justify-center text-white text-xs">✕</span>
                  <span className="font-medium">Incorrect:</span>
                </div>
                <p className="text-destructive">{example.incorrect}</p>
              </div>
              
              <div className="p-4 border border-success/20 rounded-lg bg-success/5">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="w-4 h-4 bg-success rounded-full flex items-center justify-center text-white text-xs">✓</span>
                  <span className="font-medium">Correct:</span>
                </div>
                <p className="text-success font-medium">{example.correct}</p>
                <p className="text-sm text-muted-foreground mt-2">{example.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
