import React from "react";

type Item = {
  label: string;
  title: string;
  snippet: string;
};

export default function MathPalette({
  onInsert,
}: {
  onInsert: (text: string) => void;
}) {
  const inline: Item[] = [
    { label: "x²", title: "Exponent", snippet: "$x^2$" },
    { label: "xᵢ", title: "Subscript", snippet: "$x_i$" },
    {
      label: "αβγ",
      title: "Greek letters",
      snippet: "$\\alpha+\\beta+\\gamma$",
    },
    { label: "√x", title: "Square root", snippet: "$\\sqrt{x}$" },
    { label: "a/b", title: "Fraction", snippet: "$\\frac{a}{b}$" },
    { label: "∑", title: "Summation", snippet: "$\\sum_{i=1}^{n}$" },
    { label: "∫", title: "Integral", snippet: "$\\int_{a}^{b}$" },
  ];

  const blocks: Item[] = [
    {
      label: "Block",
      title: "Block math",
      snippet: "\n$$\n...\n$$\n",
    },
    {
      label: "Matrix",
      title: "2x2 matrix",
      snippet:
        "\n$$\n\\begin{bmatrix}\n a & b \\\\ \n c & d \n\\end{bmatrix}\n$$\n",
    },
    {
      label: "Align",
      title: "Aligned equations",
      snippet:
        "\n$$\n\\begin{aligned}\n a &= b \\\\ \n c &= d \n\\end{aligned}\n$$\n",
    },
    {
      label: "Cases",
      title: "Piecewise/cases",
      snippet:
        "\n$$\n\\begin{cases}\n x^2, & x\\ge0 \\\\ \n -x, & x<0 \n\\end{cases}\n$$\n",
    },
  ];

  return (
    <div className="math-palette" role="toolbar" aria-label="Math palette">
      <div className="palette-group" aria-label="Inline math">
        <span className="palette-title">Inline</span>
        <div className="palette-row">
          {inline.map((it) => (
            <button
              key={it.title}
              type="button"
              className="palette-btn"
              title={it.title}
              onClick={() => onInsert(it.snippet)}
            >
              {it.label}
            </button>
          ))}
        </div>
      </div>
      <div className="palette-group" aria-label="Block math">
        <span className="palette-title">Blocks</span>
        <div className="palette-row">
          {blocks.map((it) => (
            <button
              key={it.title}
              type="button"
              className="palette-btn"
              title={it.title}
              onClick={() => onInsert(it.snippet)}
            >
              {it.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
