import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Button } from "@/components/ui";
import { Header } from "@/components/Header";
import { Input } from "@/components/ui";
import { FeatureCard } from "@/components/common/FeatureCard";
import { useNavigate } from "react-router-dom";
import { BookOpen, Bot, GraduationCap, TestTube, FileText, Lightbulb, Wrench, Search } from "lucide-react";
import dictionaryBook from "@/assets/dictionary-book.png";

const Index = () => {
  const navigate = useNavigate();

  // Main feature list with navigation paths
  const features = [
    {
      icon: Bot,
      title: "AI Assistant",
      description: "Get instant language help and guidance.",
      gradient: "from-purple-500 to-pink-500",
      path: "/ai-assistant",
      status: "Beta",
    },
    {
      icon: FileText,
      title: "Word of the Day",
      description: "Learn a new English word each day.",
      gradient: "from-orange-500 to-red-500",
      path: "/word-of-the-day",
      status: "Active",
    },
    {
      icon: GraduationCap,
      title: "GrammarWise",
      description: "Learn how English works.",
      gradient: "from-green-500 to-emerald-500",
      path: "/grammar-wise",
      status: "Active",
    },
    {
      icon: Wrench,
      title: "VocabularyBuilder",
      description: "Build your word power, speak with confidence.",
      gradient: "from-indigo-500 to-blue-500",
      path: "/vocabulary-builder",
      status: "Active",
    },
    {
      icon: Lightbulb,
      title: "Idiom of the Week",
      description: "Learn the meaning behind common idioms.",
      gradient: "from-yellow-500 to-orange-500",
      path: "/idiom-of-the-week",
      status: "Active",
    },
    {
      icon: TestTube,
      title: "Test Your English",
      description: "Assess your skills with quizzes.",
      gradient: "from-pink-500 to-rose-500",
      path: "/test-your-english",
      status: "Active",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header (search removed) */}
      <Header currentPage="Home" />

      <div className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-success/5"></div>
        <div className="container mx-auto px-4 text-center relative">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex-1 text-left">
              <h1 className="text-5xl font-bold mb-6">
                <span className="gradient-text">Improve your English</span>,<br />
                anytime, anywhere.<br />
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-md">
                Master vocabulary, grammar, pronunciation and more with our comprehensive learning platform.
              </p>
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary to-accent hover:shadow-lg transition-all duration-300"
                onClick={() => navigate("/dictionary")}
              >
                Start Learning
              </Button>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="relative">
                <img
                  src={dictionaryBook}
                  alt="Aasaasi Dictionary Book"
                  className="w-72 h-auto transform rotate-12 animate-float shadow-2xl rounded-lg"
                />
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur-xl opacity-70 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-4xl mx-auto bg-gradient-to-br from-background via-background to-muted/10 border-2 border-primary/20 shadow-2xl">
          <CardHeader className="text-center pb-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Aasaasi Bilingual Dictionary</CardTitle>
                <p className="text-sm text-muted-foreground">English ↔ Somali Translation</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="relative max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search for words in English or Somali..."
                  className="pl-12 pr-4 py-4 text-lg border-2 border-primary/20 focus:border-primary transition-colors bg-background/50 backdrop-blur-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.currentTarget.value.trim()) {
                      navigate(`/dictionary?q=${encodeURIComponent(e.currentTarget.value.trim())}`);
                    }
                  }}
                />
              </div>
              <div className="flex justify-center mt-4">
                <Button
                  onClick={() => navigate("/dictionary")}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-8 py-2 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Open Dictionary
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-primary/10">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">15,000+</div>
                <div className="text-sm text-muted-foreground">English Words</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">12,000+</div>
                <div className="text-sm text-muted-foreground">Somali Translations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">5,000+</div>
                <div className="text-sm text-muted-foreground">Example Sentences</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            <span className="gradient-text"> Language Learning Tools</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Learn English faster with tools you can use every day.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              gradient={feature.gradient}
              status={feature.status}
              path={feature.path}
              onClick={() => feature.path && navigate(feature.path)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
