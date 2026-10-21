const { uIOhook, UiohookKey } = require('uiohook-napi');

const MODIFIER_KEYCODES = {
  control: [UiohookKey.Ctrl, UiohookKey.CtrlRight],
  ctrl: [UiohookKey.Ctrl, UiohookKey.CtrlRight],
  shift: [UiohookKey.Shift, UiohookKey.ShiftRight],
  alt: [UiohookKey.Alt, UiohookKey.AltRight],
  option: [UiohookKey.Alt, UiohookKey.AltRight],
  meta: [UiohookKey.Meta, UiohookKey.MetaRight],
  cmd: [UiohookKey.Meta, UiohookKey.MetaRight],
  command: [UiohookKey.Meta, UiohookKey.MetaRight],
  super: [UiohookKey.Meta, UiohookKey.MetaRight],
};

const KEY_ALIASES = {
  space: 'Space',
  enter: 'Enter',
  return: 'Enter',
  esc: 'Escape',
  escape: 'Escape',
  tab: 'Tab',
};

function resolveKeycode(name) {
  if (UiohookKey[name] !== undefined) return UiohookKey[name];
  const upper = name.toUpperCase();
  if (UiohookKey[upper] !== undefined) return UiohookKey[upper];
  const alias = KEY_ALIASES[name.toLowerCase()];
  if (alias && UiohookKey[alias] !== undefined) return UiohookKey[alias];
  return undefined;
}

// Parses a spec like "F9" or "Control+Shift+X" into the modifier groups and
// main key uiohook-napi needs, falling back to F9 (a safe, rarely-conflicting
// choice: function keys are never used for ordinary typing or OS shortcuts).
function parseHotkey(spec) {
  const parts = spec.split('+').map((p) => p.trim()).filter(Boolean);
  const modifierGroups = [];
  let mainKeyName = null;

  for (const part of parts) {
    const group = MODIFIER_KEYCODES[part.toLowerCase()];
    if (group) {
      modifierGroups.push(group.filter((code) => code !== undefined));
    } else {
      mainKeyName = part;
    }
  }

  const mainKeycode = mainKeyName ? resolveKeycode(mainKeyName) : undefined;

  if (mainKeycode === undefined) {
    console.error(
      `Could not resolve hotkey "${spec}" to a key - falling back to F9.`
    );
    return { modifierGroups: [], mainKeycode: UiohookKey.F9, label: 'F9' };
  }

  return { modifierGroups, mainKeycode, label: spec };
}

// Watches for a held/released/tapped combo, globally, even when the app
// isn't focused. uiohook is a passive listener (it can't block/consume
// events), so a combo that's also an OS/app shortcut (e.g. Ctrl+X = Cut)
// will still do its normal thing elsewhere - pick a combo that isn't one
// if that matters to you.
function watchHotkey(spec, { onComboDown, onComboUp }) {
  const hotkey = parseHotkey(spec);
  const pressedKeycodes = new Set();
  let mainKeyPhysicallyDown = false;

  function modifiersSatisfied() {
    return hotkey.modifierGroups.every((group) =>
      group.some((code) => pressedKeycodes.has(code))
    );
  }

  uIOhook.on('keydown', (e) => {
    pressedKeycodes.add(e.keycode);
    if (e.keycode === hotkey.mainKeycode && !mainKeyPhysicallyDown) {
      if (modifiersSatisfied()) {
        mainKeyPhysicallyDown = true;
        console.log(`[hotkey] ${hotkey.label} down`);
        onComboDown();
      }
    }
  });

  uIOhook.on('keyup', (e) => {
    pressedKeycodes.delete(e.keycode);
    if (e.keycode === hotkey.mainKeycode && mainKeyPhysicallyDown) {
      mainKeyPhysicallyDown = false;
      console.log(`[hotkey] ${hotkey.label} up`);
      onComboUp();
    }
  });

  uIOhook.start();
  console.log(`Say.so ready - hold ${hotkey.label} to talk.`);

  return () => uIOhook.stop();
}

module.exports = { watchHotkey };
