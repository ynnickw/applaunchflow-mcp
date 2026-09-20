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
    ['promoVideo', 'VideoConfigSchema', ['audioDesign', 'screenshotPaths', 'previewFormat']],
    ['mockups', 'MockupDevice', ['name', 'primaryKeyframes', 'selectedMediaPath']],
    ['mockups', 'mockupDeviceSchema', ['start', 'end', 'entrance', 'exit', 'transitionDuration']],
    ['mockups', 'stateSchema', ['MAX_MOCKUP_DEVICES', 'Device IDs must be unique', 'at least 0.1s']],
    ['mockups', 'MockupAudioTrackSchema', ['bundledMusicId', 'exactly one', 'startTimeSeconds']],
  ] as const;
  for (const [feature, symbol, fields] of cases) {
    const ref = JSON.stringify(getEditorReference(feature, symbol));
    for (const field of fields) assert.ok(ref.includes(field), `${feature}/${symbol} must cover ${field}`);
  }
  assert.throws(() => getEditorReference('mockups', 'invented'), /Unknown/);
  assert.match(SERVER_INSTRUCTIONS, /Before editing.*get_editing_reference/);
});

test('all four full references and symbol indexes agree without truncated declarations', () => {
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
    const detail = await client.callTool({ name: 'get_editing_reference', arguments: { feature: 'mockups', symbol: 'MockupDevice' } });
    assert.notEqual(detail.isError, true);
    assert.match(JSON.stringify(detail), /primaryKeyframes/);
    const invalid = await client.callTool({ name: 'get_editing_reference', arguments: { feature: 'mockups', symbol: 'invented' } });
    assert.equal(invalid.isError, true);
  } finally {
    await client.close();
    await server.close();
  }
});
