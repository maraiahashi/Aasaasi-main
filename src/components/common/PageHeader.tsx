import { Button } from "@/components/ui";
import { Badge } from "@/components/ui";
import { AasaasiLogo } from "@/components/AasaasiLogo";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  badgeText?: string;
}

/**
 * Standard page header with back button and logo
 * Provides consistent navigation across all pages
 */
export const PageHeader = ({ title, badgeText }: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="bg-card border-b shadow-sm">
      <div className="w-full mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <AasaasiLogo size="md" />
          </div>
          {badgeText && <Badge variant="secondary">{badgeText}</Badge>}
        </div>
      </div>
    </div>
  );
};