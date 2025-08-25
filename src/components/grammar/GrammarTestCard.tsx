import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { Button } from "@/components/ui";
import { Progress } from "@/components/ui";

interface TestQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface GrammarTestCardProps {
  questions: TestQuestion[];
  onBackToTips: () => void;
}

/**
 * Interactive grammar test component
 * Handles question display, answer tracking, and results
 */
export const GrammarTestCard = ({ questions, onBackToTips }: GrammarTestCardProps) => {
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: number]: string}>({});
  const [testSubmitted, setTestSubmitted] = useState(false);

  const handleAnswerSelect = (questionIndex: number, answerIndex: string) => {
    setSelectedAnswers({...selectedAnswers, [questionIndex]: answerIndex});
  };

  const submitTest = () => {
    setTestSubmitted(true);
  };

  const resetTest = () => {
    setSelectedAnswers({});
    setTestSubmitted(false);
  };

  const getScore = () => {
    let correct = 0;
    questions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correct.toString()) {
        correct++;
      }
    });
    return correct;
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Grammar Test</CardTitle>
        <CardDescription>
          {testSubmitted ? `Your Score: ${getScore()}/${questions.length}` : "Answer all questions before submitting"}
        </CardDescription>
        <Progress value={(Object.keys(selectedAnswers).length / questions.length) * 100} className="mt-2" />
      </CardHeader>
      <CardContent className="space-y-8">
        {questions.map((question, qIndex) => (
          <div key={qIndex} className="space-y-4">
            <h3 className="text-lg font-semibold">{qIndex + 1}. {question.question}</h3>
            <div className="grid grid-cols-1 gap-2">
              {question.options.map((option, oIndex) => {
                const isSelected = selectedAnswers[qIndex] === oIndex.toString();
                const isCorrect = oIndex === question.correct;
                const showResult = testSubmitted;
                
                return (
                  <Button
                    key={oIndex}
                    variant={isSelected ? "default" : "outline"}
                    className={`justify-start h-auto p-4 ${
                      showResult 
                        ? isCorrect 
                          ? "bg-success text-white border-success" 
                          : isSelected 
                            ? "bg-destructive text-white border-destructive"
                            : ""
                        : ""
                    }`}
                    onClick={() => !testSubmitted && handleAnswerSelect(qIndex, oIndex.toString())}
                    disabled={testSubmitted}
                  >
                    <span className="mr-2">{String.fromCharCode(65 + oIndex)}.</span>
                    {option}
                  </Button>
                );
              })}
            </div>
            {testSubmitted && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Explanation:</p>
                <p className="text-sm text-muted-foreground">{question.explanation}</p>
              </div>
            )}
          </div>
        ))}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBackToTips}>
            Back to Tips
          </Button>
          {!testSubmitted ? (
            <Button 
              onClick={submitTest}
              disabled={Object.keys(selectedAnswers).length !== questions.length}
              className="bg-primary hover:bg-primary-hover"
            >
              Submit Test
            </Button>
          ) : (
            <Button onClick={resetTest}>
              Retake Test
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};