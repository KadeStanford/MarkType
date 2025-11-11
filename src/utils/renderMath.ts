// src/utils/renderMath.ts
import katex from "katex";

export function renderMath(raw: string = ""): string {
    let out = raw;

    // Block math: $$ ... $$
    out = out.replace(/\$\$([\s\S]+?)\$\$/g, (match, math) => {
        try {
            return katex.renderToString(math.trim(), {
                displayMode: true,
                throwOnError: false,
            });
        } catch {
            return match;
        }
    });

    // Inline math: $ ... $
    out = out.replace(/\$(.+?)\$/g, (match, math) => {
        try {
            return katex.renderToString(math.trim(), {
                displayMode: false,
                throwOnError: false,
            });
        } catch {
            return match;
        }
    });

    return out;
}
