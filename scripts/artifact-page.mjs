// Turns dist-single/index.html into a body-only page for publishing as a claude.ai artifact
// (the host supplies <!doctype>/<html>/<head>/<body>). Title stays first so it is found in the first 8 KB.
import { readFileSync, writeFileSync } from 'node:fs'
const html = readFileSync('dist-single/index.html', 'utf8')
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1]
const title = head.match(/<title>[\s\S]*?<\/title>/)[0]
const links = head.match(/<link[^>]*>/g)?.join('\n') ?? ''
const styles = head.match(/<style[\s\S]*?<\/style>/g)?.join('\n') ?? ''
const scripts = head.match(/<script[\s\S]*?<\/script>/g)?.join('\n') ?? ''
writeFileSync('dist-single/photo-relief.html', [title, links, styles, body.trim(), scripts].join('\n'))
console.log('wrote dist-single/photo-relief.html')
