declare module "marked" {
  export const marked: any;
  export function parse(input: string): string;
  export function lexer(input: string): any;
  export function parseInline(input: string): string;
  const _default: any;
  export default _default;
}
