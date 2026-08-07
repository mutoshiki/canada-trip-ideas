import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const html = read('index.html');
const personMenu = read('assets/js/features/person-menu.js');
const tray = read('assets/js/features/waiting-tray.js');
const sheetGestures = read('assets/css/sheet-view/gestures/01-touch-navigation.css');
const batchHelp = read('assets/css/guides-modals/import-guide/05-batch-help-flow.css');
const viewEvents = read('assets/js/features/events/05-view-feature-events.js');
const generatedEvents = read('assets/js/features/events/03-generated-action-events.js');
const shareCss = read('assets/css/settlement/share/01-share-output.css');
const workflow = read('.github/workflows/quality-guard.yml');

assert.match(personMenu, /personSubmenuPointerGesture/, 'touch submenu gesture state is missing');
assert.match(personMenu, /personSubmenuItemFromEvent/, 'submenu trigger detection is missing');
assert.match(personMenu, /suppressedPersonSubmenuClicks\.add\(submenuItem\)/, 'duplicate submenu click guard is missing');
assert.match(personMenu, /openPersonSubmenu\(submenuItem\)/, 'touch submenu does not stay inside the open overflow menu');
assert.match(personMenu, /positionPersonSubmenuSurface/, 'submenu viewport and tray constraint is missing');
assert.match(personMenu, /syncPersonMenuScrollAffordance/, 'person menu scroll affordance is missing');
assert.match(personMenu, /person-menu-more-below/, 'person menu continuation cue is missing');
assert.doesNotMatch(personMenu, /mask-image:/, 'scroll affordance clips fixed Carbon submenus');

const popoverTag = html.match(/<cds-popover[^>]*id="autoAssignPopover"[^>]*>/)?.[0] || '';
assert.match(popoverTag, /\bautoalign\b/, 'assignment settings popover is not using Carbon auto alignment');
assert.match(popoverTag, /align="top-end"/, 'assignment settings popover alignment is not anchored to the trigger');
assert.match(popoverTag, /\bdropshadow\b/, 'assignment settings popover elevation is missing');
assert.doesNotMatch(popoverTag, /\bborder\b/, 'assignment settings popover has a double border/elevation treatment');
assert.doesNotMatch(tray, /clampTraySettingsPopover|content\.style\.transform/, 'manual post-placement transform remains');

assert.doesNotMatch(sheetGestures, /box-shadow:[^;]*app-accent-border/, 'shared view still adds a blue inset shadow');
assert.match(batchHelp, /--batch-scroll-edge:/, 'participant registration scroll edge is not tokenized');
assert.doesNotMatch(batchHelp, /box-shadow:[^;]*app-accent-border/, 'participant registration still uses a blue scroll shadow');

assert.match(viewEvents, /runPointerCleanAction/, 'pointer focus cleanup for primary view actions is missing');
assert.match(viewEvents, /clearPointerFocus/, 'view actions retain pointer-only focus rings');
assert.match(generatedEvents, /open-batch[\s\S]*clearPointerFocus/, 'generated participant registration action retains a pointer focus ring');
const copyButtonRule = shareCss.match(/#seisan-view-area \.seisan-share-actions \.seisan-copy-btn\s*\{([\s\S]*?)\}/)?.[1] || '';
assert.doesNotMatch(copyButtonRule, /box-shadow|background:/, 'Carbon tertiary copy button still receives a duplicate host surface');

assert.match(workflow, /actions\/checkout@v6/g, 'checkout action was not moved off the Node 20 runtime');
assert.match(workflow, /actions\/setup-node@v6/g, 'setup-node action was not moved off the Node 20 runtime');
assert.match(workflow, /actions\/upload-artifact@v7/, 'artifact action was not moved off the Node 20 runtime');
assert.doesNotMatch(workflow, /actions\/(?:checkout|setup-node|upload-artifact)@v4/, 'Node 20 action major remains');

assert.match(html, /ui-consistency-v36/, 'v36 cache key is missing');
assert.doesNotMatch(html, /person-menu-touch-v35/, 'stale v35 cache key remains');

console.log('PASS v36 touch submenu, popover, shadow and workflow consistency contract');
