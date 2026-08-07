import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const expect = (condition, message) => { if (!condition) throw new Error(message); };

const index = read('index.html');
const cards = read('assets/js/features/person-cards.js');
const render = read('assets/js/core/render-controller.js');
const personMenu = read('assets/js/features/person-menu.js');
const personMenuCss = read('assets/css/cars-members-tray/person-card/03-person-menu.css');
const appFrameCss = read('assets/css/app-shell/layout/01-app-frame.css');
const layeringCss = read('assets/css/app-shell/layout/04-layering.css');
const carHeaderCss = read('assets/css/cars-members-tray/car-card/02-card-header.css');
const routeTemplates = read('assets/js/templates/settlement/08-route-helper-templates.js');
const routeShellCss = read('assets/css/settlement/route-helper/01-route-shell.css');
const routeStopsCss = read('assets/css/settlement/route-helper/02-route-stops.css');

expect(cards.includes('menu-alignment="bottom-end"'), 'Person overflow menu alignment contract is missing');
expect(cards.includes('capacity-edit-content') && cards.includes('capacity-count'), 'Initial capacity content wrapper is missing');
expect(render.includes('capacity-edit-content') && render.includes('capacity-count'), 'Updated capacity content wrapper is missing');
expect(carHeaderCss.includes('.capacity-edit-content') && carHeaderCss.includes('gap: 8px'), 'Capacity count/icon spacing is not explicit');
expect(carHeaderCss.includes('.capacity-edit-content > .carbon-icon') && carHeaderCss.includes('width: 20px'), 'Capacity edit icon is not Carbon 20px');

expect(personMenu.includes('function stabilizePersonOverflowSubmenus'), 'Carbon overflow submenu state synchronization is missing');
expect(personMenu.includes("item?.querySelector?.(':scope > [slot=\"submenu\"]')"), 'Overflow state synchronization is not limited to submenu triggers');
expect(personMenu.includes('function compactPersonMenuMaxSubmenuWidth'), 'Nested menu width is not included in horizontal placement');
expect(personMenu.includes('submenuReservedLeft') && personMenu.includes('flushRightLimit'), 'Narrow-phone submenu overlap prevention is missing');
expect(personMenu.includes('function compactPersonMenuRequiredHeight'), 'Submenu extent is not included in visible-viewport placement');
expect(personMenu.includes('person-menu-viewport-fallback'), 'Compact-height viewport fallback state is missing');
expect(personMenu.includes('function positionCompactPersonMenu'), 'Visible-viewport menu placement is missing');
expect(personMenu.includes("trigger.closest('#bottom-tray')"), 'Waiting-tray menu source is not handled');
expect(personMenu.includes("document.getElementById('app-view-navigation')"), 'Bottom navigation clearance is not included in menu placement');
expect(personMenu.includes("classList.toggle('person-menu-source-tray'"), 'Waiting-tray stacking context state is missing');
expect(!personMenu.includes("addEventListener('cds-popover-closed'"), 'Legacy popover-close listener still interferes with submenus');
expect(personMenuCss.includes('person-menu-source-tray #app-layout #bottom-tray'), 'Waiting tray is not raised for its own open person menu');
expect(appFrameCss.includes('#top-area') && appFrameCss.includes('min-height: 0'), 'Allocation flex scroller can expand when menu clipping is released');
expect(layeringCss.includes('body.person-menu-open #top-area') && layeringCss.includes('overflow: visible'), 'Open Carbon menus are still clipped by the allocation scroller');
expect(layeringCss.includes('person-menu-source-tray #top-area'), 'Allocation area is not lowered for a waiting-tray menu');
expect(!layeringCss.includes('cds-menu:not([open])'), 'Closed-menu pointer override still blocks Carbon submenu hit testing');

expect(index.includes('<span class="route-place-search-icon" aria-hidden="true"><span data-carbon-icon="search"></span></span>'), 'Search overlay wrapper/icon composition is missing');
expect(!index.includes('class="route-place-search-icon" data-carbon-icon="search"'), 'Search SVG placeholder still carries wrapper sizing');
expect(routeShellCss.includes('.route-place-search-icon > .carbon-icon') && routeShellCss.includes('width: 20px'), 'Search overlay icon is not Carbon 20px');
expect(routeTemplates.includes('class="route-stop-search-icon"') && routeTemplates.includes('data-carbon-icon="search"'), 'Route stop search icons are missing');
expect(routeStopsCss.includes('.route-stop-search-icon > .carbon-icon') && routeStopsCss.includes('width: 20px'), 'Route stop search icon sizing is missing');
expect(routeStopsCss.includes('--cds-layout-density-padding-inline-normal: 44px'), 'Route stop input does not reserve space for search icon');

console.log('PASS feature fixes v31 contract');
