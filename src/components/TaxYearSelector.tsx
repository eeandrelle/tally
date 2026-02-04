import { useTaxYear } from "@/contexts/TaxYearContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaxYearSelectorProps {
  className?: string;
  showIndicator?: boolean;
  size?: "sm" | "default";
}

export function TaxYearSelector({ 
  className, 
  showIndicator = true,
  size = "default" 
}: TaxYearSelectorProps) {
  const { 
    selectedYear, 
    availableYears, 
    currentYear, 
    isLoading, 
    setSelectedYear,
    isViewingCurrentYear 
  } = useTaxYear();

  // Format year as "2024-25" style
  const formatYear = (year: number) => `${year}-${String(year + 1).slice(-2)}`;

  if (isLoading) {
    return (
      <div className={cn("h-9 w-32 animate-pulse rounded-md bg-muted", className)} />
    );
  }

  // Generate years if none in database yet
  const years = availableYears.length > 0 
    ? availableYears.map(y => y.year)
    : [currentYear, currentYear - 1, currentYear - 2];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select
        value={selectedYear.toString()}
        onValueChange={(value) => setSelectedYear(parseInt(value, 10))}
      >
        <SelectTrigger 
          size={size}
          className={cn(
            "gap-2",
            !isViewingCurrentYear && "border-amber-500/50 bg-amber-500/10"
          )}
        >
          <CalendarDays className="size-4 text-muted-foreground" />
          <SelectValue placeholder="Select year">
            FY {formatYear(selectedYear)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              <div className="flex items-center justify-between gap-4 w-full">
                <span>FY {formatYear(year)}</span>
                {year === currentYear && (
                  <Badge variant="secondary" className="text-[10px] h-5">
                    Current
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showIndicator && !isViewingCurrentYear && (
        <Badge 
          variant="outline" 
          className="border-amber-500/50 text-amber-600 dark:text-amber-400 gap-1"
        >
          <AlertCircle className="size-3" />
          Past Year
        </Badge>
      )}
    </div>
  );
}
