// @/components/Header.tsx
import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Input, Button, Badge } from "@/components/ui";
import { Search, Sun, Moon, Globe } from "lucide-react";
import aasaasiLogo from "@/assets/aasaasi-logo.png";

interface HeaderProps {
  currentPage?: string;                 // e.g., "Home", "Dictionary"
  onSearch?: (query: string) => void;   // provide this only on pages that use search
  showSearch?: boolean;                 // optional override to force show/hide
}

export const Header = ({
  currentPage,
  onSearch,
  showSearch, // undefined => auto mode
}: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDark, setIsDark] = useState(false);

  // Derive page name if not provided
  const derivedPage = useMemo(() => {
    if (currentPage) return currentPage;
    if (location.pathname === "/" || location.pathname === "") return "Home";
    // you can map other paths to labels if you want
    return undefined;
  }, [currentPage, location.pathname]);

  // Decide whether to render the search bar
  // Priority: explicit prop > auto rule (hide on Home)
  const shouldShowSearch =
    typeof showSearch === "boolean"
      ? showSearch
      : derivedPage !== "Home";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery.trim());
    }
  };

  const toggleTheme = () => {
    setIsDark((v) => !v);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className="bg-card border-b shadow-sm sticky top-0 z-50 backdrop-blur-md bg-card/80">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo on far left */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            <img
              src={aasaasiLogo}
              alt="Aasaasi Platform"
              className="h-32 w-auto cursor-pointer hover:scale-105 transition-transform duration-200"
              onClick={() => navigate("/")}
            />
          </div>

          {/* Search Bar (auto-hidden on Home) */}
          {shouldShowSearch && (
            <form onSubmit={handleSearch} className="flex-1 max-w-lg mx-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search dictionary, words, grammar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 py-3 text-base bg-background/80 border-border/60 focus:border-primary rounded-full shadow-sm hover:shadow-md transition-all duration-200"
                />
              </div>
            </form>
          )}

          {/* Right side controls */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate("/adaptive-learning")}
              className="bg-primary hover:bg-primary/90 text-white font-medium"
            >
              Adaptive Learning
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <Globe className="h-4 w-4" />
              <span className="text-sm">EN/SO</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Current page badge - hide for Home */}
            {derivedPage && derivedPage !== "Home" && (
              <Badge variant="secondary" className="hidden md:inline-flex">
                {derivedPage}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
