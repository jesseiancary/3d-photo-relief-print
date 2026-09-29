/** Turn a file/label into a safe, hyphenated basename (no extension), max 60 chars. */
export const slug = (s: string) =>
  s
    .trim()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^\w\- ]+/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'relief'
