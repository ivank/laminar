const escapeRegExp = (str: string): string => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

export const toMatchPattern = (match: string): string =>
  match
    .split('/')
    .map((part) => (part === '*' ? '[^\\/]*' : escapeRegExp(part)))
    .join('\\/');

export const title = (str: string): string => str.replace(/^./, (first) => first.toUpperCase());
