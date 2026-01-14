import React from "react";

// Formato de armazenamento para usuários: [[user_id:Nome Completo]]
const USER_MENTION_REGEX = /\[\[([^:]+):([^\]]+)\]\]/g;

// Formato de armazenamento para demandas: {{demand_id:#0001}}
const DEMAND_MENTION_REGEX = /\{\{([^:]+):(#[^\}]+)\}\}/g;

// Regex para detectar URLs
const URL_REGEX = /(https?:\/\/[^\s<>\[\]\{\}]+)/g;

// Converte texto com marcadores para array de strings e objetos de menção
export interface ParsedUserMention {
  type: "user_mention";
  userId: string;
  name: string;
}

export interface ParsedDemandMention {
  type: "demand_mention";
  demandId: string;
  code: string;
}

export interface ParsedLink {
  type: "link";
  url: string;
  displayText: string;
}

export type ParsedContent = string | ParsedUserMention | ParsedDemandMention | ParsedLink;

export function parseMentionsToArray(text: string): ParsedContent[] {
  const parts: ParsedContent[] = [];
  
  // Combined regex to match mentions, demands, and URLs
  const COMBINED_REGEX = /(\[\[([^:]+):([^\]]+)\]\])|(\{\{([^:]+):(#[^\}]+)\}\})|(https?:\/\/[^\s<>\[\]\{\}]+)/g;
  
  let lastIndex = 0;
  COMBINED_REGEX.lastIndex = 0;
  
  let match;
  while ((match = COMBINED_REGEX.exec(text)) !== null) {
    // Adiciona texto antes da menção
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    if (match[1]) {
      // User mention: [[user_id:Nome]]
      const userId = match[2];
      const name = match[3];
      parts.push({ type: "user_mention", userId, name });
    } else if (match[4]) {
      // Demand mention: {{demand_id:#0001}}
      const demandId = match[5];
      const code = match[6];
      parts.push({ type: "demand_mention", demandId, code });
    } else if (match[7]) {
      // URL link
      const url = match[7];
      parts.push({ type: "link", url, displayText: url });
    }
    
    lastIndex = match.index + match[0].length;
  }

  // Adiciona texto restante
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

// Função para parsear apenas links (sem menções)
export function parseLinks(text: string): (string | ParsedLink)[] {
  const parts: (string | ParsedLink)[] = [];
  
  let lastIndex = 0;
  URL_REGEX.lastIndex = 0;
  
  let match;
  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    const url = match[1];
    parts.push({ type: "link", url, displayText: url });
    
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

// Converte menção de usuário para formato de armazenamento
export function formatMentionForStorage(userId: string, name: string): string {
  return `[[${userId}:${name}]]`;
}

// Converte menção de demanda para formato de armazenamento
export function formatDemandMentionForStorage(demandId: string, code: string): string {
  return `{{${demandId}:${code}}}`;
}

// Extrai IDs de usuários mencionados
export function extractMentionedUserIds(text: string): string[] {
  const ids: string[] = [];
  USER_MENTION_REGEX.lastIndex = 0;
  
  let match;
  while ((match = USER_MENTION_REGEX.exec(text)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

// Extrai IDs de demandas mencionadas
export function extractMentionedDemandIds(text: string): string[] {
  const ids: string[] = [];
  DEMAND_MENTION_REGEX.lastIndex = 0;
  
  let match;
  while ((match = DEMAND_MENTION_REGEX.exec(text)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

// Verifica se texto contém menções de usuários
export function hasMentions(text: string): boolean {
  USER_MENTION_REGEX.lastIndex = 0;
  return USER_MENTION_REGEX.test(text);
}

// Verifica se texto contém menções de demandas
export function hasDemandMentions(text: string): boolean {
  DEMAND_MENTION_REGEX.lastIndex = 0;
  return DEMAND_MENTION_REGEX.test(text);
}

// Verifica se texto contém links
export function hasLinks(text: string): boolean {
  URL_REGEX.lastIndex = 0;
  return URL_REGEX.test(text);
}
