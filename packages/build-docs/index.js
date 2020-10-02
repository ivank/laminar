const { readFileSync, writeFileSync, existsSync } = require('fs');
const { join, dirname } = require('path');
const { cwd } = require('process');

const docFilename = process.argv[2];
const url = process.argv[3];
const text = readFileSync(docFilename, 'utf8');
const matchExample = /> \[([0-9a-z\-\/\.\:]+)\]\(([0-9a-z\-\/\.\:]+)\)\n\n\`\`\`([0-9a-z\-]+)\n(((?!\`\`\`).|\n)*\`\`\`)/gm;

const replaced = text.replace(matchExample, (_, name, filename, language) => {
  const link = `[${name}](${filename})`;
  console.log('Update', link);
  const resolvedFilename =
    url && filename.includes(url)
      ? filename.replace(url, cwd())
      : join(dirname(join(cwd(), docFilename)), filename);

  if (!existsSync(resolvedFilename)) {
    throw new Error(`File ${filename} does not exist in ${docFilename}`);
  }
  const file = readFileSync(resolvedFilename);
  return `> ${link}\n\n\`\`\`${language}\n${file}\`\`\``;
});

writeFileSync(docFilename, replaced, 'utf8');
