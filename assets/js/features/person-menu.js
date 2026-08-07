// Compact person menu feature
// Owns member/driver quick action menus and the shared edit modal entry point.

let activePersonMenuTarget = null;
let activePersonMenuTrigger = null;

function closePersonMenus() {
    const triggerToBlur = activePersonMenuTrigger;
    document.body.classList.remove('person-menu-open', 'person-menu-source-tray', 'person-menu-viewport-fallback');
    document.querySelectorAll('cds-overflow-menu.person-overflow-menu').forEach(menu => {
        menu.open = false;
        menu.removeAttribute('open');
    });
    activePersonMenuTarget = null;
    activePersonMenuTrigger = null;
    window.SanpoFocusModality?.clearPointerFocus?.(triggerToBlur);
}

function getActivePersonMenuTarget() {
    return activePersonMenuTarget;
}
window.getActivePersonMenuTarget = getActivePersonMenuTarget;

function personMenuItemFromEvent(event) {
    return event.composedPath?.().find(node => node?.matches?.('cds-menu-item')) || event.target.closest?.('cds-menu-item');
}

function personOverflowFromEvent(event) {
    return event.composedPath?.().find(node => node?.matches?.('cds-overflow-menu.person-overflow-menu'))
        || event.target.closest?.('cds-overflow-menu.person-overflow-menu');
}

function replacePersonMenuItemIcon(item, iconName) {
    if (!item || !iconName) return;
    const current = item.querySelector('[slot="render-icon"]');
    if (current?.dataset?.carbonIconName === iconName || current?.dataset?.carbonIcon === iconName) return;
    const placeholder = document.createElement('span');
    placeholder.setAttribute('slot', 'render-icon');
    placeholder.setAttribute('data-carbon-icon', iconName);
    placeholder.setAttribute('aria-hidden', 'true');
    if (current) current.replaceWith(placeholder);
    else item.prepend(placeholder);
    window.SanpoCarbon?.renderCarbonIcons?.(placeholder);
}

function stabilizePersonOverflowSubmenus(trigger, rootMenu) {
    if (!trigger || !rootMenu || trigger.dataset.personSubmenuSync === 'true') return;
    trigger.dataset.personSubmenuSync = 'true';
    trigger.addEventListener('click', event => {
        const path = event.composedPath?.() || [];
        const item = path.find(node => node?.matches?.('cds-menu-item'));
        const isSubmenuTrigger = path.includes(rootMenu)
            && item?.querySelector?.(':scope > [slot="submenu"]');
        if (!isSubmenuTrigger) return;

        // In Carbon 2.60's v12 overflow composition the slotted menu is inside
        // the trigger button's composed path. Carbon therefore toggles the
        // overflow closed after the menu item has correctly opened its child
        // menu. Restore the overflow state for submenu triggers only; action
        // rows and submenu choices retain Carbon's normal close behavior.
        trigger.open = true;
        trigger.setAttribute('open', '');
        rootMenu.open = true;
        rootMenu.setAttribute('open', '');
        document.body.classList.add('person-menu-open');
        scheduleCompactPersonMenuPosition(trigger);
    });
}

function syncPersonMenuContext(trigger) {
    if (!trigger) return null;
    const card = trigger.closest('.member-card');
    const driver = trigger.closest('.driver-seat');
    const person = card || driver;
    if (!person) return null;
    const name = person.dataset.name || person.querySelector('.member-name-text, .driver-name-disp')?.textContent || '参加者';
    trigger.label = `${name}の操作`;
    trigger.setAttribute('label', trigger.label);
    trigger.setAttribute('aria-label', trigger.label);
    const rootMenu = trigger.querySelector(':scope > cds-menu.person-pop-menu');
    if (rootMenu) {
        rootMenu.label = trigger.label;
        rootMenu.setAttribute('aria-label', trigger.label);
        stabilizePersonOverflowSubmenus(trigger, rootMenu);
    }
    if (card) {
        const locked = card.dataset.locked === 'true';
        const lockItem = trigger.querySelector('cds-menu-item[data-person-action="lock"]');
        if (lockItem) {
            const label = locked ? '固定解除' : '固定';
            lockItem.label = label;
            lockItem.setAttribute('label', label);
            replacePersonMenuItemIcon(lockItem, locked ? 'unlocked' : 'locked');
        }
        const inWaiting = card.parentElement?.id === 'waiting-list';
        const returnItem = trigger.querySelector('cds-menu-item[data-person-action="return"]');
        if (returnItem) {
            const label = inWaiting ? '削除' : '戻す';
            returnItem.label = label;
            returnItem.setAttribute('label', label);
            returnItem.kind = inWaiting ? 'danger' : 'default';
            returnItem.setAttribute('kind', returnItem.kind);
            replacePersonMenuItemIcon(returnItem, inWaiting ? 'trash-can' : 'undo');
        }
    }
    activePersonMenuTarget = person;
    activePersonMenuTrigger = trigger;
    document.body.classList.add('person-menu-open');
    document.body.classList.toggle('person-menu-source-tray', !!person.closest('#bottom-tray'));
    scheduleCompactPersonMenuPosition(trigger);
    return person;
}


function compactPersonMenuMaxSubmenuWidth(menu) {
    return Array.from(menu.querySelectorAll(':scope > cds-menu-item > [slot="submenu"]'))
        .map(submenu => submenu.getBoundingClientRect().width)
        .filter(width => width > 0)
        .reduce((maxWidth, width) => Math.max(maxWidth, width), 0);
}

function compactPersonMenuRequiredHeight(menu, surface) {
    const surfaceRect = surface.getBoundingClientRect();
    return Array.from(menu.querySelectorAll(':scope > cds-menu-item')).reduce((requiredHeight, item) => {
        const submenu = item.querySelector(':scope > [slot="submenu"]');
        if (!submenu) return requiredHeight;
        const itemRect = item.getBoundingClientRect();
        const choiceHeights = Array.from(submenu.querySelectorAll(':scope > cds-menu-item'))
            .map(choice => choice.getBoundingClientRect().height)
            .filter(height => height > 0);
        const submenuHeight = choiceHeights.reduce((sum, height) => sum + height, 0);
        const projectedHeight = Math.max(0, itemRect.top - surfaceRect.top) + submenuHeight;
        return Math.max(requiredHeight, projectedHeight);
    }, surfaceRect.height);
}

function positionCompactPersonMenu(trigger) {
    if (!trigger?.open) return;
    const menu = trigger.querySelector(':scope > cds-menu.person-pop-menu');
    const surface = menu?.shadowRoot?.querySelector('.cds--menu');
    const topArea = document.getElementById('top-area');
    if (!menu || !surface || !topArea) return;

    const triggerRect = trigger.getBoundingClientRect();
    const menuRect = surface.getBoundingClientRect();
    const topAreaRect = topArea.getBoundingClientRect();
    const bottomNavigationRect = document.getElementById('app-view-navigation')?.getBoundingClientRect();
    const fromWaitingTray = !!trigger.closest('#bottom-tray');
    const submenuWidth = compactPersonMenuMaxSubmenuWidth(menu);
    const combinedMenuWidth = menuRect.width + submenuWidth;
    const viewportPadding = 8;
    const horizontalPadding = Math.min(viewportPadding, Math.max(0, window.innerWidth - combinedMenuWidth));
    const availableLeft = Math.max(horizontalPadding, triggerRect.right - menuRect.width);
    const maxLeft = Math.max(horizontalPadding, window.innerWidth - menuRect.width - horizontalPadding);
    let left = Math.min(availableLeft, maxLeft);

    // When neither side of a trigger-aligned root has room for a nested menu,
    // shift the root just enough to reserve the submenu's width. This keeps
    // Carbon's own left/right submenu flip intact while avoiding overlap on
    // narrow phones where the combined surfaces still fit the viewport.
    if (submenuWidth > 0) {
        const leftRoom = left - horizontalPadding;
        const rightRoom = window.innerWidth - horizontalPadding - (left + menuRect.width);
        if (leftRoom < submenuWidth && rightRoom < submenuWidth) {
            const submenuReservedLeft = submenuWidth + horizontalPadding;
            const flushRightLimit = Math.max(horizontalPadding, window.innerWidth - menuRect.width);
            left = Math.min(flushRightLimit, submenuReservedLeft);
        }
    }

    // The allocation list is a scroll container, while the waiting tray is a
    // sibling stacking context. Keep allocation menus inside the visible list
    // viewport, and let waiting-tray menus use the unobscured viewport above
    // the fixed bottom navigation. This prevents clipping without replacing
    // Carbon's menu, keyboard handling, focus management or submenu model.
    const visibleTop = fromWaitingTray
        ? viewportPadding
        : Math.max(viewportPadding, topAreaRect.top + viewportPadding);
    const viewportBottom = Math.min(
        window.innerHeight - viewportPadding,
        bottomNavigationRect?.top ? bottomNavigationRect.top - viewportPadding : window.innerHeight - viewportPadding
    );
    const topAreaBottom = Math.min(viewportBottom, topAreaRect.bottom - viewportPadding);
    const requiredHeight = compactPersonMenuRequiredHeight(menu, surface);
    const needsViewportFallback = !fromWaitingTray
        && requiredHeight > Math.max(0, topAreaBottom - visibleTop);
    document.body.classList.toggle('person-menu-viewport-fallback', needsViewportFallback);
    const visibleBottom = fromWaitingTray || needsViewportFallback
        ? viewportBottom
        : topAreaBottom;
    const preferredTop = triggerRect.top;
    const maxTop = Math.max(visibleTop, visibleBottom - requiredHeight);
    const top = Math.max(visibleTop, Math.min(preferredTop, maxTop));

    menu.style.insetInlineStart = `${Math.round(left)}px`;
    menu.style.insetInlineEnd = 'initial';
    menu.style.insetBlockStart = `${Math.round(top)}px`;
    menu.style.insetBlockEnd = 'initial';
    menu.position = [Math.round(left), Math.round(top)];
}

function scheduleCompactPersonMenuPosition(trigger) {
    requestAnimationFrame(() => requestAnimationFrame(() => positionCompactPersonMenu(trigger)));
}

function ensurePersonMeta(line) {
    if (!line) return null;
    let meta = line.querySelector('.person-meta');
    if (!meta) {
        meta = ce('div', 'person-meta');
        line.insertBefore(meta, line.querySelector('.member-menu-btn, .driver-menu-btn') || null);
    }
    return meta;
}

function updatePersonGradeBadge(person) {
    if (!person) return;
    const grade = parseInt(person.dataset.grade) || 0;
    const line = $('.member-main-line, .driver-main-line', person);
    if (!line) return;
    const meta = ensurePersonMeta(line);
    meta?.querySelector('.grade-badge')?.remove();
    if (grade > 0 && meta) {
        const gender = person.dataset.gender || 'unknown';
        const badge = ce('cds-tag', `grade-badge carbon-display-tag ${gradeGenderClass(gender)}`);
        badge.dataset.grade = String(grade);
        badge.dataset.tagGroup = 'grade';
        badge.dataset.tagValue = gender;
        badge.setAttribute('type', window.SanpoTagTypes?.resolve('grade', gender) || 'gray');
        badge.setAttribute('size', 'sm');
        badge.textContent = `${grade}年`;
        badge.setAttribute('aria-label', window.SanpoTagTypes?.accessibleName('grade', gender, badge.textContent) || badge.textContent);
        meta.appendChild(badge);
    }
}

function updatePersonGenderBadge(person) {
    if (!person) return;
    const line = $('.member-main-line, .driver-main-line', person);
    if (!line) return;
    line.querySelector('.gender-badge')?.remove();
    const badge = line.querySelector('.grade-badge');
    if (badge) {
        badge.classList.remove('grade-male', 'grade-female', 'grade-unknown');
        const gender = person.dataset.gender || 'unknown';
        badge.classList.add(gradeGenderClass(gender));
        badge.dataset.tagValue = gender;
        badge.setAttribute('type', window.SanpoTagTypes?.resolve('grade', gender) || 'gray');
        badge.setAttribute('aria-label', window.SanpoTagTypes?.accessibleName('grade', gender, badge.textContent) || badge.textContent);
    }
}

function setPersonGrade(person, gradeValue) {
    const grade = Math.max(0, Math.min(4, parseInt(gradeValue) || 0));
    person.dataset.grade = String(grade);
    updatePersonGradeBadge(person);
    updateUI();
    save();
}

function setPersonGender(person, gender) {
    const next = ['male', 'female', 'unknown'].includes(gender) ? gender : 'unknown';
    person.dataset.gender = next;
    updatePersonGenderBadge(person);
    updateUI();
    save();
}

function updatePersonFlagBadge(person) {
    if (!person) return;
    person.dataset.flag = normalizePersonFlag(person.dataset.flag);
    const line = $('.member-main-line, .driver-main-line', person);
    if (!line) return;
    const meta = ensurePersonMeta(line);
    meta?.querySelector('.person-flag')?.remove();
    const holder = document.createElement('template');
    holder.innerHTML = renderPersonFlag(person.dataset.flag);
    const badge = holder.content.firstElementChild;
    if (!meta || !badge) return;
    const grade = meta.querySelector('.grade-badge');
    meta.insertBefore(badge, grade || null);
}

function syncFlagAcrossPlans(name, flag) {
    const key = normalizeParticipantKey(name);
    syncActiveCarPlanFromDom();
    (carPlans || []).forEach(plan => {
        (plan.waiting || []).forEach(member => {
            if (normalizeParticipantKey(member.name) === key) member.flag = flag;
        });
        (plan.cars || []).forEach(group => {
            if (normalizeParticipantKey(group.name) === key) group.driverFlag = flag;
            (group.members || []).forEach(member => {
                if (normalizeParticipantKey(member.name) === key) member.flag = flag;
            });
        });
    });
}

function setPersonFlag(person, value) {
    if (!person) return;
    const flag = normalizePersonFlag(value);
    const name = person.dataset.name || $('.member-name-text, .driver-name-disp', person)?.textContent || '';
    $$('.member-card, .driver-seat').forEach(candidate => {
        const candidateName = candidate.dataset.name || $('.member-name-text, .driver-name-disp', candidate)?.textContent || '';
        if (normalizeParticipantKey(candidateName) !== normalizeParticipantKey(name)) return;
        candidate.dataset.flag = flag;
        updatePersonFlagBadge(candidate);
    });
    syncFlagAcrossPlans(name, flag);
    updateUI();
    save();
}

async function returnOrDeleteMemberCard(card) {
    if (!card) return;
    if (card.dataset.locked === 'true') {
        showAppNotice('固定されています。先に固定を解除してください。', true);
        return;
    }
    let changed = false;
    if (card.parentElement?.id === 'waiting-list') {
        if (await appConfirm('このメンバーを完全に削除しますか？', { title: 'メンバー削除', okText: '削除', danger: true })) { card.remove(); changed = true; }
    } else if (await appConfirm('車から降ろして未割り当てメンバーに戻しますか？', { title: '未割り当てに戻す', okText: '戻す' })) {
        $('#waiting-list')?.appendChild(card);
        changed = true;
    }
    if (!changed) return;
    updateUI();
    save();
}

function handleCompactPersonAction(action, person = activePersonMenuTarget, choiceValue = '') {
    if (!action || !person) return;
    const card = person.closest?.('.member-card') || null;
    const driver = person.closest?.('.driver-seat') || null;
    const isDriver = !!driver;
    const targetPerson = card || driver;
    if (!targetPerson) return;

    const trigger = targetPerson.querySelector('cds-overflow-menu.person-overflow-menu');
    if (trigger) {
        trigger.open = false;
        trigger.removeAttribute('open');
    }
    document.body.classList.remove('person-menu-open', 'person-menu-source-tray', 'person-menu-viewport-fallback');
    window.SanpoFocusModality?.clearPointerFocus?.(trigger);

    if (action === 'memo') handleEdit(isDriver ? 'driverMemo' : 'memo', targetPerson);
    else if (action === 'lock' && card) toggleLock(card);
    else if (action === 'return' && card) returnOrDeleteMemberCard(card);
    else if (action === 'name') handleEdit(isDriver ? 'driverName' : 'memberName', targetPerson);
    else if (action === 'grade') setPersonGrade(targetPerson, choiceValue);
    else if (action === 'gender') setPersonGender(targetPerson, choiceValue);
    else if (action === 'flag') setPersonFlag(targetPerson, choiceValue);
}
window.handleCompactPersonAction = handleCompactPersonAction;

function openCompactPersonMenu(trigger) {
    const person = syncPersonMenuContext(trigger);
    if (!person) return;
    trigger.open = true;
    trigger.setAttribute('open', '');
    scheduleCompactPersonMenuPosition(trigger);
}
window.openCompactPersonMenu = openCompactPersonMenu;

function shouldKeepPersonMenuForTarget(target) {
    return !!target?.closest?.('cds-overflow-menu.person-overflow-menu, cds-menu.person-pop-menu');
}

function ensureCompactMenuFallback() {
    setupCompactPersonMenu();
}
window.ensureCompactMenuFallback = ensureCompactMenuFallback;

function setupCompactPersonMenu() {
    if (setupCompactPersonMenu.bound === true) return;
    setupCompactPersonMenu.bound = true;

    D.addEventListener('pointerdown', event => {
        const trigger = personOverflowFromEvent(event);
        if (trigger) {
            syncPersonMenuContext(trigger);
            return;
        }
        if (shouldKeepPersonMenuForTarget(event.target)) return;
        closePersonMenus();
    }, true);

    D.addEventListener('click', event => {
        const overflowTrigger = personOverflowFromEvent(event);
        const item = personMenuItemFromEvent(event);
        if (overflowTrigger && !item) {
            queueMicrotask(() => {
                document.body.classList.toggle('person-menu-open', overflowTrigger.open === true || overflowTrigger.hasAttribute('open'));
            });
        }
        if (!item) return;
        const trigger = item.closest?.('cds-overflow-menu.person-overflow-menu');
        if (!trigger) return;
        const person = syncPersonMenuContext(trigger);
        const directAction = item.dataset.personAction || '';
        const choiceAction = item.dataset.personChoice || '';
        if (!directAction && !choiceAction) return;
        const action = choiceAction || directAction;
        const value = choiceAction ? item.dataset.choiceValue || '' : '';
        queueMicrotask(() => handleCompactPersonAction(action, person, value));
    }, false);

    D.addEventListener('keydown', event => {
        if (event.key === 'Escape') closePersonMenus();
    }, true);

    const menuStateObserver = new MutationObserver(records => {
        if (!records.some(record => record.target?.matches?.('cds-overflow-menu.person-overflow-menu'))) return;
        const anyOpen = !!D.querySelector('cds-overflow-menu.person-overflow-menu[open]');
        D.body.classList.toggle('person-menu-open', anyOpen);
        if (!anyOpen) {
            D.body.classList.remove('person-menu-source-tray');
            activePersonMenuTarget = null;
            activePersonMenuTrigger = null;
        }
    });
    menuStateObserver.observe(D.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
    setupCompactPersonMenu.menuStateObserver = menuStateObserver;

    window.addEventListener('orientationchange', closePersonMenus, { passive: true });
    window.addEventListener('resize', () => scheduleCompactPersonMenuPosition(activePersonMenuTrigger), { passive: true });
    document.getElementById('top-area')?.addEventListener('scroll', () => scheduleCompactPersonMenuPosition(activePersonMenuTrigger), { passive: true });
}

function handleEdit(type, el) {
    const isCap = type === 'capacity';
    const box = isCap ? el.closest('.car-box') : null;
    const card = !isCap ? el.closest('.member-card') : null;
    const driver = !isCap && !card ? el.closest('.driver-seat') : null;

    let initialVal = '', title = '';
    if(isCap) {
        title = '定員変更';
        initialVal = String(
            box?.dataset.capacity
            || box?.querySelectorAll?.('.seat-slot')?.length
            || el.value
            || el.getAttribute?.('value')
            || ''
        );
    }
    else if (type === 'memberName' && card) { title = '名前変更'; initialVal = card.dataset.name || $('.member-name-text', card).innerText; }
    else if (type === 'driverName' && driver) { title = '名前変更'; initialVal = driver.dataset.name || $('.driver-name-disp', driver).innerText; }
    else if (card) { title = 'メモ編集'; initialVal = $('.memo-popup', card).innerText; } 
    else if (driver) { title = '車出しメモ'; initialVal = $('.driver-memo-text', driver).innerText; }

    const editTitleEl = $('#commonEditModalTitle');
    const editInput = $('#editModalInput');
    if (editTitleEl) editTitleEl.innerText = title;
    if (editInput) {
        editInput.value = initialVal;
        editInput.label = isCap ? '定員' : (type.includes('Name') ? '名前' : 'メモ');
        editInput.setAttribute('label', editInput.label);
        editInput.setAttribute('aria-label', editInput.label);
        editInput.type = isCap ? 'number' : 'text';
        editInput.inputMode = isCap ? 'numeric' : 'text';
        if (isCap) {
            editInput.setAttribute('min', '1');
            editInput.setAttribute('step', '1');
        } else {
            editInput.removeAttribute('min');
            editInput.removeAttribute('step');
        }
    }
    
    saveCb = () => {
        const v = $('#editModalInput').value;
        if(isCap) {
            const newC = getInt(v);
            if(newC > 0) {
                const boxEl = el.closest('.car-box');
                const grid = $('.car-layout-grid', boxEl);
                const current = $$('.seat-slot', grid);
                if(newC > current.length) {
                    for(let i=0; i<newC-current.length; i++) {
                        const d = ce('div','seat-slot'); grid.appendChild(d); setupSortable(d);
                    }
                } else if(newC < current.length) {
                    for(let i=current.length-1; i>=newC; i--) {
                        if(current[i].children.length) $('#waiting-list').appendChild(current[i].children[0]);
                        current[i].remove();
                    }
                }
                boxEl.dataset.capacity = newC;
            }
        } else if (type === 'memberName' && card) {
            const nextName = v.trim();
            if (!nextName) return;
            card.dataset.name = nextName;
            $('.member-name-text', card).textContent = nextName;
        } else if (type === 'driverName' && driver) {
            const nextName = v.trim();
            if (!nextName) return;
            const oldName = driver.dataset.name || $('.driver-name-disp', driver).innerText;
            driver.dataset.name = nextName;
            $('.driver-name-disp', driver).textContent = nextName;
            const boxEl = driver.closest('.car-box');
            const label = $('.car-name-label', boxEl);
            if (label) label.textContent = `${nextName}${typeof getActiveGroupSuffix === 'function' ? getActiveGroupSuffix() : '車'}`;
            if (settlementState?.cars?.[oldName] && !settlementState.cars[nextName]) {
                settlementState.cars[nextName] = settlementState.cars[oldName];
                delete settlementState.cars[oldName];
            }
        } else if (card) {
            const m = $('.memo-popup', card); m.innerText = v; m.style.display = v?'block':'none';
        } else if (driver) {
            const m = $('.driver-memo-text', driver); m.innerText = v; m.style.display = v?'block':'none';
        }
        modals.edit.hide(); updateUI(); save();
    };
    modals.edit.show();
}
