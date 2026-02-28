export type ChatSegment =
  | { type: "text"; content: string }
  | { type: "place"; placeId: string };

const PLACE_MARKER_REGEX = /<<PLACE:([^>]+)>>/g;

export function parseChatContent(content: string): ChatSegment[] {
  if (!content) return [];

  const segments: ChatSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = PLACE_MARKER_REGEX.exec(content)) !== null) {
    const before = content.slice(lastIndex, match.index);
    if (before) {
      segments.push({ type: "text", content: before });
    }
    segments.push({ type: "place", placeId: match[1] });
    lastIndex = match.index + match[0].length;
  }

  const remaining = content.slice(lastIndex);
  if (remaining) {
    segments.push({ type: "text", content: remaining });
  }

  return segments;
}
