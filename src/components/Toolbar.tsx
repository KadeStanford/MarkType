import React from "react";
import {
  FaBold,
  FaItalic,
  FaCode,
  FaLink,
  FaListUl,
  FaUnderline,
  FaStrikethrough,
} from "react-icons/fa";

type ToolbarProps = {
  onFormatClick: (formatType: string) => void;
  theme?: "light" | "dark";
};

export default function Toolbar({
  onFormatClick,
  theme = "light",
}: ToolbarProps) {
  const buttonClass = `toolbar-button ${theme === "dark" ? "dark" : "light"}`;

  const buttons = [
    { type: "bold", icon: <FaBold />, title: "Bold (Ctrl+B)" },
    { type: "italic", icon: <FaItalic />, title: "Italic (Ctrl+I)" },
    { type: "underline", icon: <FaUnderline />, title: "Underline (Ctrl+U)" },
    {
      type: "strikethrough",
      icon: <FaStrikethrough />,
      title: "Strikethrough (Alt+Shift+5)",
    },
    { type: "code", icon: <FaCode />, title: "Inline Code" },
    { type: "link", icon: <FaLink />, title: "Insert Link" },
    { type: "unorderedList", icon: <FaListUl />, title: "Unordered List" },
  ];

  return (
    <div className={`toolbar ${theme === "dark" ? "dark" : "light"}`}>
      {buttons.map((btn) => (
        <button
          key={btn.type}
          className={buttonClass}
          onClick={() => onFormatClick(btn.type)}
          title={btn.title}
          aria-label={btn.title}
        >
          {btn.icon}
        </button>
      ))}
    </div>
  );
}
