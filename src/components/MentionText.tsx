import { parseMentionsToArray, ParsedContent } from "@/lib/mentionUtils";
import { MentionTag } from "./MentionTag";
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
        return (
          <MentionTag
            key={`${part.userId}-${index}`}
            name={part.name}
            userId={part.userId}
            readOnly
          />
        );
      })}
    </span>
  );
}
