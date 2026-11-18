import assert from 'node:assert/strict';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/client';
import { createAppLaunchFlowServer, SERVER_INSTRUCTIONS } from './index.js';
import { getEditorReference, getFullEditorReference, EDITOR_FEATURES } from './resources/editor-reference.js';

test('references cover the current editable roots and easily missed manual settings', () => {
  const cases = [
    ['screenshots', 'ScreenshotNode', ['overflow', 'contentTransform', 'contentRotation', 'cleanStatusBar', 'model3D']],
    ['screenshots', 'Model3DConfig', ['lidOpen', 'devicesByPlatform', 'rotationX']],
    ['screenshots', 'Layout', ['layerGroups', 'panoramaBackground', 'themePaletteMode']],
    ['socialGraphics', 'SOCIAL_FORMATS', ['instagram_story', 'nativeExportOnly', 'opaqueExport']],
    ['promoVideo', 'SceneDeviceSchema', ['video', 'mediaRotation', 'presentation', 'animationDelay']],
    ['promoVideo', 'MultiPhoneContentSchema', ['layoutDeviceCount', 'devicePresentations', 'deviceModels', 'videos']],
    ['promoVideo', 'FeatureContentSchema', ['modelLidOpen', 'modelFinish', 'devicePresentation']],
    ['promoVideo', 'createDeviceOnlyVideoRequestSchema', ['recordings', 'customMotion', 'DEVICE_ONLY_MAX_SCREENS']],
    ['promoVideo', 'DeviceCustomMotionSchema', ['keyframes', 'lidOpen', 'easing']],
    ['promoVideo', 'PROMO_MOTION_IDS', ['duo-unfold', 'lid-turn']],
    ['promoVideo', 'VideoConfigSchema', ['audioDesign', 'screenshotPaths', 'previewFormat']],
  ] as const;
  for (const [feature, symbol, fields] of cases) {
    const ref = JSON.stringify(getEditorReference(feature, symbol));
    for (const field of fields) assert.ok(ref.includes(field), `${feature}/${symbol} must cover ${field}`);
  }
  assert.throws(() => getEditorReference('promoVideo', 'invented'), /Unknown/);
  assert.match(SERVER_INSTRUCTIONS, /Before editing.*get_editing_reference/);
});

test('full references and symbol indexes agree without truncated declarations', () => {
  for (const feature of EDITOR_FEATURES) {
    const full = getFullEditorReference(feature);
    assert.ok(full.contracts.length >= 4);
    for (const doc of full.contracts) {
      assert.match(doc.sha256, /^[a-f0-9]{64}$/);
      for (const [name, definition] of Object.entries(doc.declarations)) {
        const item = getEditorReference(feature, name);
        assert.ok('sections' in item && item.sections.some(section => section.source === doc.path && section.definition === definition));
      }
    }
  }
});

test('MCP clients can retrieve editing guidance through both tools and resources without backend access', async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const server = createAppLaunchFlowServer({ baseUrl: 'http://127.0.0.1:1', token: 'fixture' });
  const client = new Client({ name: 'editing-reference-test', version: '1' });
  await server.connect(b);
  await client.connect(a);
  try {
    const listed = await client.listResources();
    assert.ok(!listed.resources.some(resource => resource.uri === "applaunchflow://editing/mockups"));
    for (const feature of EDITOR_FEATURES) {
      const uri = `applaunchflow://editing/${feature}`;
      assert.ok(listed.resources.some(resource => resource.uri === uri));
      const resource = await client.readResource({ uri });
      const content = resource.contents[0];
      assert.ok('text' in content);
      assert.deepEqual(JSON.parse(content.text), getFullEditorReference(feature));
      const tool = await client.callTool({ name: 'get_editing_reference', arguments: { feature } });
      assert.notEqual(tool.isError, true);
      assert.match(JSON.stringify(tool), /symbols/);
    }
    const detail = await client.callTool({ name: 'get_editing_reference', arguments: { feature: 'promoVideo', symbol: 'DeviceCustomMotionSchema' } });
    assert.notEqual(detail.isError, true);
    assert.match(JSON.stringify(detail), /lidOpen/);
    const invalid = await client.callTool({ name: 'get_editing_reference', arguments: { feature: 'promoVideo', symbol: 'invented' } });
    assert.equal(invalid.isError, true);
  } finally {
    await client.close();
    await server.close();
  }
});
