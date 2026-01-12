import { Link } from "react-router-dom";
import { Home, LucideIcon } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export interface BreadcrumbItemConfig {
  label: string;
  href?: string;
  icon?: LucideIcon;
  isCurrent?: boolean;
  state?: Record<string, unknown>;
}

interface PageBreadcrumbProps {
  items: BreadcrumbItemConfig[];
  showHome?: boolean;
}

export function PageBreadcrumb({ items, showHome = true }: PageBreadcrumbProps) {
  return (
    <Breadcrumb className="animate-fade-in">
      <BreadcrumbList>
        {showHome && (
          <>
            <BreadcrumbItem className="animate-fade-in" style={{ animationDelay: '0ms' }}>
              <BreadcrumbLink asChild>
                <Link to="/" className="flex items-center gap-1 transition-colors duration-200 hover:text-primary">
                  <Home className="h-3.5 w-3.5 transition-transform duration-200 hover:scale-110" />
                  <span className="sr-only sm:not-sr-only">Início</span>
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {items.length > 0 && (
              <BreadcrumbSeparator className="animate-fade-in" style={{ animationDelay: '50ms' }} />
            )}
          </>
        )}
        
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const Icon = item.icon;
          const baseDelay = showHome ? 100 : 0;
          const delay = baseDelay + (index * 75);
          
          return (
            <BreadcrumbItem 
              key={index} 
              className="animate-fade-in"
              style={{ animationDelay: `${delay}ms` }}
            >
              {isLast || item.isCurrent ? (
                <BreadcrumbPage className="flex items-center gap-1 max-w-[200px] truncate">
                  {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                  <span className="truncate">{item.label}</span>
                </BreadcrumbPage>
              ) : (
                <>
                  <BreadcrumbLink asChild>
                    <Link 
                      to={item.href || "#"} 
                      state={item.state}
                      className="flex items-center gap-1 transition-colors duration-200 hover:text-primary"
                    >
                      {Icon && <Icon className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 hover:scale-110" />}
                      <span>{item.label}</span>
                    </Link>
                  </BreadcrumbLink>
                  <BreadcrumbSeparator 
                    className="animate-fade-in" 
                    style={{ animationDelay: `${delay + 25}ms` }} 
                  />
                </>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
