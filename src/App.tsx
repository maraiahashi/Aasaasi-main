// src/App.tsx
/**
 * Aasaasi Language Learning Platform
 * Main application component with routing configuration
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import RootLayout from "@/layouts/RootLayout";

// Pages
import HomePage from "./pages/HomePage";
import DictionaryPage from "./pages/DictionaryPage";
import AIAssistantPage from "./pages/AIAssistantPage";
import WordOfTheDay from "./pages/WordOfTheDay";
import GrammarWise from "./pages/GrammarWise";
import VocabularyBuilder from "./pages/VocabularyBuilder";
import IdiomOfTheWeek from "./pages/IdiomOfTheWeek";
import TestYourEnglish from "./pages/TestYourEnglish";
import AdaptiveLearning from "./pages/AdaptiveLearning";
import NotFound from "./pages/NotFound";
import TestRunner from "./pages/TestRunner";
import Tests from "./pages/Tests";

class AasaasiApp extends React.Component<Record<string, never>, { isInitialized: boolean }> {
  static displayName = "AasaasiApp";
  private readonly queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 5 * 60_000, retry: 2, refetchOnWindowFocus: false },
      mutations: { retry: 1 },
    },
  });

  state = { isInitialized: false };

  componentDidMount(): void {
    this.setState({ isInitialized: true });
  }

  render(): React.ReactNode {
    if (!this.state.isInitialized) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg text-gray-500">Initializing Aasaasi Platform...</div>
        </div>
      );
    }

    return (
      <QueryClientProvider client={this.queryClient}>
        <BrowserRouter>
          <Routes>
            {/* All pages render inside RootLayout, which includes the API banner */}
            <Route element={<RootLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/dictionary" element={<DictionaryPage />} />
              <Route path="/ai-assistant" element={<AIAssistantPage />} />
              <Route path="/word-of-the-day" element={<WordOfTheDay />} />
              <Route path="/adaptive-learning" element={<AdaptiveLearning />} />
              <Route path="/grammar-wise" element={<GrammarWise />} />
              <Route path="/vocabulary-builder" element={<VocabularyBuilder />} />
              <Route path="/idiom-of-the-week" element={<IdiomOfTheWeek />} />
              <Route path="/test-your-english" element={<TestYourEnglish />} />

              {/* Tests */}
              <Route path="/tests" element={<Tests />} />
              <Route path="/tests/:kind" element={<TestRunner />} />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    );
  }
}

export default AasaasiApp;
