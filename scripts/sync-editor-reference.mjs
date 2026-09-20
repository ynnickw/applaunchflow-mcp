import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// A checked-in, dependency-free reference: deploying MCP never requires a
// dashboard checkout. Explicit source allowlist; never bundle environment/data.
const root = fileURLToPath(new URL('../', import.meta.url));
const dashboard = resolve(process.env.APPLAUNCHFLOW_DASHBOARD_PATH || resolve(root, '../applaunchflow'));
const sources = [
  ['layout', 'src/types/layout.ts'],
  ['layout', 'src/shared/validation/layout-schema.ts'],
  ['transforms', 'src/server/mcp/layout-transform-contract.ts'],
  ['graphics', 'src/features/graphics-editor/types.ts'],
  ['graphics', 'src/features/graphics-editor/lib/formats.ts'],
  ['promoVideo', 'src/features/promovideo/lib/remotion/config/schema.ts'],
  ['promoVideo', 'src/features/promovideo/lib/remotion/choreography/presets.ts'],
  ['promoVideo', 'src/features/promovideo/lib/remotion/choreography/types.ts'],
  ['promoVideo', 'src/features/promovideo/lib/configSchema.ts'],
  ['promoVideo', 'src/features/promovideo/lib/remotion/utils/dimensions.ts'],
  ['mockups', 'src/features/mockups/types.ts'],
  ['mockups', 'src/app/api/mockups/apiSchema.ts'],
  ['mockups', 'src/features/mockups/lib/audioTrackSchema.ts'],
  ['shared', 'src/features/mockups/config.ts'],
  ['mockups', 'src/features/mockups/lib/devices.ts'],
  ['shared', 'src/shared/config/backgroundMusic.ts'],
  ['shared', 'packages/mcp-contracts/src/index.ts'],
  ['shared', 'src/shared/validation/schemas.ts', ['appPlatformSchema']],
  ['shared', 'src/features/templates-core/utils/frame3DGeometry.ts'],
  ['shared', 'src/features/device-3d/config.ts'],
  ...['phone', 'tablet', 'desktop', 'watch'].map(kind => ['shared', `src/features/templates-core/utils/${kind}Registry.ts`]),
];
const documents = [];
for (const [group, path, only] of sources) {
  const source = await readFile(resolve(dashboard, path), 'utf8');
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  const declarations = {};
  for (const node of ast.statements) {
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node) || (ts.isFunctionDeclaration(node) && node.name)) {
      declarations[node.name.text] = node.getFullText(ast).trim();
    } else if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) declarations[declaration.name.text] = node.getFullText(ast).trim();
      }
    }
  }
  if (only) {
    for (const name of only) if (!(name in declarations)) throw new Error(`Missing ${path}:${name}`);
    for (const name of Object.keys(declarations)) if (!only.includes(name)) delete declarations[name];
  }
  documents.push({ group, path, sha256: createHash('sha256').update(source).digest('hex'), declarations });
}
const output = JSON.stringify({ formatVersion: 1, documents }, null, 2) + '\n';
const destination = resolve(root, 'src/resources/editor-contracts.generated.json');
if (process.argv.includes('--check')) {
  if (await readFile(destination, 'utf8') !== output) {
    throw new Error('Editor reference is stale. Run npm run sync:editor-reference with the release dashboard checkout.');
  }
  console.log(`Editor reference matches ${documents.length} dashboard sources.`);
} else {
  await writeFile(destination, output);
  console.log(`Generated ${documents.length} editor reference sources.`);
}
