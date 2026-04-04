"use client";

// Simple inline rich text renderer.
// Supports a subset of markdown:
//   **text**     → <strong>text</strong>
//   [label](url) → <a href="url">label</a>
//   Line breaks  → <br />
//   Emojis       → native Unicode, just type them

function parseSegments(text: string): React.ReactNode[] {
  // Pattern matches bold (**...**) or links ([label](url))
  const pattern = /(\*\*(.+?)\*\*|\[(.+?)\]\((https?:\/\/[^\s)]+)\))/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    // Push any plain text before this match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[0].startsWith("**")) {
      // Bold
      nodes.push(<strong key={key++}>{match[2]}</strong>);
    } else {
      // Link — opens in new tab, rel for security
      nodes.push(
        <a
          key={key++}
          href={match[4]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline decoration-dotted hover:decoration-solid transition-all"
        >
          {match[3]}
        </a>
      );
    }
    lastIndex = pattern.lastIndex;
  }

  // Push any remaining plain text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export function RichText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  if (!text) return null;

  // Handle line breaks: split by \n and add <br /> between them
  const lines = text.split("\n");
  const rendered = lines.flatMap((line, i) => {
    const segments = parseSegments(line);
    return i < lines.length - 1 ? [...segments, <br key={`br-${i}`} />] : segments;
  });

  return <span className={className}>{rendered}</span>;
}
