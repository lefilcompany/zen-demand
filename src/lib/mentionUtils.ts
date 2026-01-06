import React from "react";

// Formato de armazenamento: [[user_id:Nome Completo]]
const MENTION_REGEX = /\[\[([^:]+):([^\]]+)\]\]/g;

// Converte texto com marcadores para array de strings e objetos de menção
export interface ParsedMention {
  type: "mention";
  userId: string;
  name: string;
}

export type ParsedContent = string | ParsedMention;

export function parseMentionsToArray(text: string): ParsedContent[] {
  const parts: ParsedContent[] = [];
  let lastIndex = 0;
  
  // Reset regex state
  MENTION_REGEX.lastIndex = 0;
  
  let match;
  while ((match = MENTION_REGEX.exec(text)) !== null) {
    // Adiciona texto antes da menção
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    // Adiciona objeto de menção
    const [, userId, name] = match;
    parts.push({ type: "mention", userId, name });
    
    lastIndex = match.index + match[0].length;
  }

  // Adiciona texto restante
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

// Converte menção para formato de armazenamento
export function formatMentionForStorage(userId: string, name: string): string {
  return `[[${userId}:${name}]]`;
}

// Extrai IDs de usuários mencionados
export function extractMentionedUserIds(text: string): string[] {
  const ids: string[] = [];
  // Reset regex state
  MENTION_REGEX.lastIndex = 0;
  
  let match;
  while ((match = MENTION_REGEX.exec(text)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

// Verifica se texto contém menções
export function hasMentions(text: string): boolean {
  MENTION_REGEX.lastIndex = 0;
  return MENTION_REGEX.test(text);
}
