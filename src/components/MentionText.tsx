import { parseMentionsToArray } from "@/lib/mentionUtils";
import { MentionTag } from "./MentionTag";
import { DemandMentionTag } from "./DemandMentionTag";
import { cn } from "@/lib/utils";

interface MentionTextProps {
  text: string;
  className?: string;
}

export function MentionText({ text, className }: MentionTextProps) {
  const parts = parseMentionsToArray(text);

  return (
    <span className={cn("inline", className)}>
      {parts.map((part, index) => {
        if (typeof part === "string") {
          return <span key={index}>{part}</span>;
        }
        if (part.type === "user_mention") {
          return (
            <MentionTag
              key={`user-${part.userId}-${index}`}
              name={part.name}
              userId={part.userId}
              readOnly
            />
          );
        }
        if (part.type === "demand_mention") {
          return (
            <DemandMentionTag
              key={`demand-${part.demandId}-${index}`}
              demandId={part.demandId}
              code={part.code}
              readOnly
            />
          );
        }
        if (part.type === "link") {
          return (
            <a
              key={`link-${index}`}
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(part.url, '_blank', 'noopener,noreferrer');
              }}
            >
              {part.displayText}
            </a>
          );
        }
        return null;
      })}
    </span>
  );
}
