"use client";

export function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const lines = part.slice(3).split("\n");
          const lang = lines[0].trim();
          const code = lines.slice(1).join("\n").replace(/```$/, "").trimEnd();
          return (
            <div key={i} className="rounded-lg overflow-hidden">
              {lang && (
                <div className="bg-black/40 px-3 py-1 text-xs text-outline font-mono border-b border-outline-variant/10">
                  {lang}
                </div>
              )}
              <pre className="bg-black/40 px-3 py-3 text-on-surface-variant font-mono text-xs overflow-x-auto whitespace-pre">
                {code}
              </pre>
            </div>
          );
        }
        return (
          <div key={i} className="whitespace-pre-wrap">
            {part.split(/(`[^`]+`)/).map((seg, j) => {
              if (seg.startsWith("`") && seg.endsWith("`")) {
                return (
                  <code
                    key={j}
                    className="bg-surface-container-highest text-on-surface-variant px-1 py-0.5 rounded text-xs font-mono"
                  >
                    {seg.slice(1, -1)}
                  </code>
                );
              }
              return seg.split(/(\*\*[^*]+\*\*)/g).map((bp, k) => {
                if (bp.startsWith("**") && bp.endsWith("**")) {
                  return (
                    <strong key={k} className="font-semibold text-on-surface">
                      {bp.slice(2, -2)}
                    </strong>
                  );
                }
                return <span key={k}>{bp}</span>;
              });
            })}
          </div>
        );
      })}
    </div>
  );
}

export function LoadingDots() {
  return (
    <span className="inline-flex gap-1 items-center h-4">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-outline animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}
