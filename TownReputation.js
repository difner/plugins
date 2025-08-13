//=============================================================================
// TownReputation.js — v8.1.6
//  - v8.1.4 base + "Shown Name" support and friendly-name rendering
//  - Advanced reputation (Locations & Factions)
//  - SAFE shop price mod via Comment hooks (no command302 override)
//  - Loot/Use/Equip/Have/Buy/Skill/Battle rep
//  - Toasts (hard-fix, discovery toasts, mute switch), Ripple, Decay, Thresholds
//  - Region Auras, Shop Gating/Preview, History, Debug scene, Inline codes, Menus
//=============================================================================
/*:
 * @target MZ
 * @plugindesc v8.1.6 Advanced reputation with factions/locations + Shown Name + robust systems
 * @author Gemini + ChatGPT
 *
 * @help
 * NOTE TAGS (quick reference)
 * Items/Weapons/Armors:
 *   <rep use: ENTITY +/-N [type:xxx]>
 *   <rep have: ENTITY +/-N [type:xxx]>
 *   <rep equip: ENTITY +/-N [type:xxx]>
 *   <rep unequip: ENTITY +/-N [type:xxx]>
 *   <rep buy: ENTITY +/-N [type:xxx]>
 *   <rep req: ENTITY OP VALUE [type:xxx]>   // OP: >=,>,<=,<,=
 * Skills:
 *   <rep skill: ENTITY +/-N [type:xxx]>
 * Enemies/Troops (on victory):
 *   <rep battle: ENTITY +/-N [type:xxx]>
 * Event Comment (immediately above Shop Processing):
 *   <rep price mod: ENTITY MIN MAX PCT%>    // e.g., <rep price mod: MerchantsGuild 2 999 -25%>
 * Inline (Show Text):
 *   <showRep: ENTITY [type:xxx]> , <showTier: ENTITY [type:xxx]>
 *
 * ---------------------------------------------------------------------------
 * PARAMETERS
 * ---------------------------------------------------------------------------
 * @param ---Core Mappings---
 * @default
 *
 * @param locationMappings
 * @parent ---Core Mappings---
 * @type struct<ReputationMapping>[]
 * @default []
 *
 * @param factionMappings
 * @parent ---Core Mappings---
 * @type struct<ReputationMapping>[]
 * @default []
 *
 * @param repTypes
 * @parent ---Core Mappings---
 * @type string[]
 * @default ["default","merchant"]
 *
 * @param ---Menu Settings---
 * @default
 *
 * @param menuCommandName
 * @parent ---Menu Settings---
 * @type string
 * @default Reputation
 *
 * @param showMenuCommand
 * @parent ---Menu Settings---
 * @type boolean
 * @default true
 *
 * @param reputationTiers
 * @parent ---Menu Settings---
 * @type struct<ReputationTier>[]
 * @default ["{\"tierName\":\"Hero\",\"requiredScore\":\"50\"}","{\"tierName\":\"Neutral\",\"requiredScore\":\"0\"}"]
 *
 * @param tierIcons
 * @parent ---Menu Settings---
 * @type struct<TierIcon>[]
 * @default []
 *
 * @param tierDescriptions
 * @parent ---Menu Settings---
 * @text Tier Descriptions (optional)
 * @type struct<TierDescription>[]
 * @default []
 *
 * @param historyLogMax
 * @parent ---Menu Settings---
 * @type number
 * @default 50
 *
 * @param ---UX & Debug---
 * @default
 *
 * @param enableToasts
 * @parent ---UX & Debug---
 * @type boolean
 * @default true
 *
 * @param enableDiscoverToasts
 * @parent ---UX & Debug---
 * @text Toast on Discover
 * @type boolean
 * @default true
 *
 * @param toastDuration
 * @parent ---UX & Debug---
 * @text Toast Duration (frames)
 * @type number
 * @default 90
 *
 * @param toastFontSize
 * @parent ---UX & Debug---
 * @type number
 * @default 20
 *
 * @param toastY
 * @parent ---UX & Debug---
 * @text Toast Y offset
 * @type number
 * @default 24
 *
 * @param muteToastSwitchId
 * @parent ---UX & Debug---
 * @text Mute Toasts (Switch)
 * @type switch
 * @default 0
 *
 * @param enableWarnings
 * @parent ---UX & Debug---
 * @type boolean
 * @default true
 *
 * @param enableAutoDiscover
 * @parent ---UX & Debug---
 * @type boolean
 * @default true
 *
 * @param enableDebugScene
 * @parent ---UX & Debug---
 * @type boolean
 * @default true
 *
 * @param ---Systems---
 * @default
 *
 * @param clampMin
 * @parent ---Systems---
 * @type number
 * @default -999
 *
 * @param clampMax
 * @parent ---Systems---
 * @type number
 * @default 999
 *
 * @param equipCooldownFrames
 * @parent ---Systems---
 * @type number
 * @default 0
 *
 * @param enableRipple
 * @parent ---Systems---
 * @type boolean
 * @default false
 *
 * @param rippleRules
 * @parent ---Systems---
 * @type struct<RippleRule>[]
 * @default []
 *
 * @param enableThresholds
 * @parent ---Systems---
 * @type boolean
 * @default false
 *
 * @param thresholds
 * @parent ---Systems---
 * @type struct<Threshold>[]
 * @default []
 *
 * @param enableDecay
 * @parent ---Systems---
 * @type boolean
 * @default false
 *
 * @param decayIntervalSec
 * @parent ---Systems---
 * @type number
 * @default 60
 *
 * @param decayRules
 * @parent ---Systems---
 * @type struct<DecayRule>[]
 * @default []
 *
 * @param enableSkillRep
 * @parent ---Systems---
 * @type boolean
 * @default true
 *
 * @param enableBuyRep
 * @parent ---Systems---
 * @type boolean
 * @default true
 *
 * @param enableShopGating
 * @parent ---Systems---
 * @type boolean
 * @default false
 *
 * @param showShopRepPreview
 * @parent ---Systems---
 * @type boolean
 * @default true
 *
 * @param enableRegionAuras
 * @parent ---Systems---
 * @type boolean
 * @default false
 *
 * @param regionAuras
 * @parent ---Systems---
 * @type struct<RegionAura>[]
 * @default []
 *
 * @param ---History & Export---
 * @default
 *
 * @param enableHistoryFilter
 * @parent ---History & Export---
 * @type boolean
 * @default true
 *
 * @param enableHistoryExport
 * @parent ---History & Export---
 * @type boolean
 * @default true
 *
 * @param defaultExportPath
 * @parent ---History & Export---
 * @type string
 * @default rep_history.csv
 *
 * @command setReputation
 * @text Set Reputation
 * @arg entityId @type string
 * @arg value    @type number
 * @arg repType  @type string @default default
 *
 * @command addReputation
 * @text Add Reputation
 * @arg entityId @type string
 * @arg value    @type number
 * @arg repType  @type string @default default
 *
 * @command subtractReputation
 * @text Subtract Reputation
 * @arg entityId @type string
 * @arg value    @type number
 * @arg repType  @type string @default default
 *
 * @command discoverLocation
 * @text Discover Location
 * @arg locationId @type string
 *
 * @command discoverFaction
 * @text Discover Faction
 * @arg factionId @type string
 *
 * @command openReputationMenu
 * @text Open Reputation Menu
 *
 * @command openRepHistory
 * @text Open Rep History
 *
 * @command openRepHistoryFiltered
 * @text Open Rep History (Filtered)
 * @arg entityId @type string @default
 * @arg repType  @type string @default
 *
 * @command exportRepHistory
 * @text Export Rep History CSV
 * @arg path @type string @default
 *
 * @command checkReputation
 * @text Check Reputation (set switch)
 * @arg entityId @type string
 * @arg repType  @type string @default default
 * @arg op       @type select @option >= @option > @option <= @option < @option = @default >=
 * @arg value    @type number @default 0
 * @arg switchId @type switch @default 1
 *
 * @command openRepDebug
 * @text Open Rep Debug (simple editor)
 */

/*~struct~ReputationMapping:
 * @param id @type string
 * @param displayName @text Shown Name (optional) @type string @default
 * @param repType @type string @default default
 * @param variableId @type variable
 */
/*~struct~ReputationTier:
 * @param tierName @type string
 * @param requiredScore @type number
 */
/*~struct~TierIcon:
 * @param tierName @type string
 * @param iconId @type icon
 */
/*~struct~TierDescription:
 * @param tierName @type string
 * @param description @type note
 */
/*~struct~RippleRule:
 * @param sourceId @type string
 * @param sourceType @type string @default
 * @param effects @type struct<RippleEffect>[]
 */
/*~struct~RippleEffect:
 * @param targetId @type string
 * @param repType  @type string @default default
 * @param multiplier @type number @decimals 2 @default 1
 */
/*~struct~Threshold:
 * @param entityId @type string
 * @param repType @type string @default default
 * @param op @type select @option >= @option > @option <= @option < @option = @default >=
 * @param value @type number @default 0
 * @param commonEventId @type common_event @default 0
 * @param triggerOnce @type boolean @default false
 */
/*~struct~DecayRule:
 * @param entityId @type string
 * @param repType @type string @default default
 * @param deltaPerInterval @type number @default -1
 */
/*~struct~RegionAura:
 * @param regionId @type number
 * @param entityId @type string
 * @param repType @type string @default default
 * @param deltaPerSecond @type number @default -1
 * @param cooldownSec @type number @default 1
 */

(() => {
'use strict';

//-----------------------------------------------------------------------------
// UI compat: add textPadding() if missing
//-----------------------------------------------------------------------------
if (typeof Window_Base.prototype.textPadding !== 'function') {
  Window_Base.prototype.textPadding = function() {
    if (typeof this.itemPadding === 'function') return this.itemPadding();
    return 6;
  };
}

//-----------------------------------------------------------------------------
// Globals
//-----------------------------------------------------------------------------
var _globalReputationPriceModifier = 0; // shop price multiplier used in this file

const PLUGIN = 'TownReputation';
const P = PluginManager.parameters(PLUGIN);

// Helpers
const parseList = (raw) => JSON.parse(raw || '[]');
const parseMapList = (raw) => parseList(raw).map(s => { try { return JSON.parse(s); } catch(_) { return null; } }).filter(Boolean);
function opCheck(a, op, b) {
  switch(op){
    case '>=': return a >= b;
    case '>':  return a >  b;
    case '<=': return a <= b;
    case '<':  return a <  b;
    case '=':  return a === b;
    default:   return false;
  }
}

// Params
const locationMapRaw = parseMapList(P.locationMappings);
const factionMapRaw  = parseMapList(P.factionMappings);
const repTypes       = JSON.parse(P.repTypes || '[]');

const menuName       = String(P.menuCommandName || 'Reputation');
const showMenu       = P.showMenuCommand === 'true';

const historyLogMax  = Number(P.historyLogMax || 50);

const tiersRaw       = parseMapList(P.reputationTiers);
const tierIconsRaw   = parseMapList(P.tierIcons);
const tierDescRaw    = parseMapList(P.tierDescriptions);

// UX/Debug
const enableToasts        = P.enableToasts === 'true';
const enableDiscoverToasts= P.enableDiscoverToasts === 'true';
const toastDuration       = Number(P.toastDuration || 90);
const toastFontSize       = Number(P.toastFontSize || 20);
const toastY              = Number(P.toastY || 24);
const muteToastSwitchId   = Number(P.muteToastSwitchId || 0);
const enableWarnings      = P.enableWarnings === 'true';
const enableAutoDiscover  = P.enableAutoDiscover === 'true';
const enableDebugScene    = P.enableDebugScene === 'true';

// Systems
const clampMin           = Number(P.clampMin || -999);
const clampMax           = Number(P.clampMax || 999);
const equipCooldownFrames= Number(P.equipCooldownFrames || 0);

const enableRipple       = P.enableRipple === 'true';
const rippleRulesRaw     = parseMapList(P.rippleRules);

const enableThresholds   = P.enableThresholds === 'true';
const thresholdsRaw      = parseMapList(P.thresholds);

const enableDecay        = P.enableDecay === 'true';
const decayIntervalSec   = Number(P.decayIntervalSec || 60);
const decayRulesRaw      = parseMapList(P.decayRules);

const enableSkillRep     = P.enableSkillRep === 'true';
const enableBuyRep       = P.enableBuyRep === 'true';

const enableShopGating   = P.enableShopGating === 'true';
const showShopRepPreview = P.showShopRepPreview === 'true';

const enableRegionAuras  = P.enableRegionAuras === 'true';
const regionAurasRaw     = parseMapList(P.regionAuras);

// Build mappings
const reputationMap = {};
const locationIds   = new Set();
const factionIds    = new Set();
// NEW: display name mapping
const displayNameMap = {};

function recordMapping(m, kind){
  if (!m) return;
  const id = String(m.id || '');
  const type = String(m.repType || 'default');
  reputationMap[id] = reputationMap[id] || {};
  reputationMap[id][type] = Number(m.variableId);
  // NEW: record Shown Name if provided
  const shown = String(m.displayName || '').trim();
  if (shown) displayNameMap[id] = shown;
  if (kind === 'location') locationIds.add(id);
  if (kind === 'faction')  factionIds.add(id);
}

locationMapRaw.forEach(m => recordMapping(m,'location'));
factionMapRaw.forEach(m => recordMapping(m,'faction'));

// Expose helper for friendly names
window.TR_getDisplayName = function(id){
  const key = String(id || '');
  return (displayNameMap[key] && displayNameMap[key].length) ? displayNameMap[key] : key;
};

const reputationTiers = tiersRaw
  .map(t => ({ tierName: t.tierName, requiredScore: Number(t.requiredScore) }))
  .sort((a, b) => b.requiredScore - a.requiredScore);

const tierIcons = {};
tierIconsRaw.forEach(t => { tierIcons[t.tierName] = Number(t.iconId); });

const tierDescriptions = {};
tierDescRaw.forEach(t => { tierDescriptions[t.tierName] = String(t.description || '').replace(/^"|"$/g,''); });

// Ripple compiled map
const rippleMap = {};
rippleRulesRaw.forEach(rule => {
  if (!rule || !rule.effects) return;
  const key = `${rule.sourceId}||${rule.sourceType||''}`;
  rippleMap[key] = rippleMap[key] || [];
  parseMapList(JSON.stringify(rule.effects)).forEach(e => {
    rippleMap[key].push({ targetId: e.targetId, repType: e.repType||'default', mult: Number(e.multiplier||1) });
  });
});

// Decay compiled
const decayRules = decayRulesRaw.map(r => ({ entityId: r.entityId, repType: r.repType||'default', delta: Number(r.deltaPerInterval||0) }));

// Threshold compiled
const thresholds = thresholdsRaw.map(t => ({
  entityId: t.entityId, repType: t.repType||'default',
  op: t.op||'>=', value: Number(t.value||0),
  commonEventId: Number(t.commonEventId||0), once: String(t.triggerOnce) === 'true'
}));

// Core helpers
function varId(entityId, type='default') {
  const map = reputationMap[entityId];
  return (map && map[type]) ? map[type] : 0;
}
function resolveType(entityId, type='default') {
  if (varId(entityId, type) > 0) return type;
  for (const t of repTypes) if (varId(entityId, t) > 0) return t;
  return null;
}
function getRep(entityId, type='default') {
  const t = resolveType(entityId, type);
  if (!t) return 0;
  return $gameVariables.value(varId(entityId, t));
}
function getTier(score) {
  for (const t of reputationTiers) if (score >= t.requiredScore) return t.tierName;
  return reputationTiers.length ? reputationTiers[reputationTiers.length-1].tierName : 'Unknown';
}

//-----------------------------------------------------------------------------
// Toasts (hard-fix, discovery toasts, mute switch)
//-----------------------------------------------------------------------------
class Sprite_RepToast extends Sprite {
  constructor(text) {
    super(new Bitmap(Graphics.width, 48));
    this._life = toastDuration;
    this._text = String(text||'');
    this.opacity = 255;
    this.bitmap.fontSize = toastFontSize;
    this.draw();
  }
  draw() {
    this.bitmap.clear();
    const w = this.bitmap.measureTextWidth(this._text) + 24;
    const x = (Graphics.width - w) / 2;
    this.bitmap.fillRect(x-8, 0, w+16, 28, ColorManager.gaugeBackColor());
    this.bitmap.drawText(this._text, x, 2, w, 24, 'center');
  }
  update() {
    super.update();
    this._life--;
    if (this._life < 30) this.opacity = Math.max(0, (this._life/30)*255);
    if (this._life <= 0 && this.parent) this.parent.removeChild(this);
  }
}
function toastsMuted() {
  if (!enableToasts) return true;
  if (muteToastSwitchId > 0 && $gameSwitches && $gameSwitches.value(muteToastSwitchId)) return true;
  return false;
}
function ensureToastLayer(scene){
  if (!scene) return null;
  const top = scene._windowLayer || scene; // always on topmost container
  if (!scene._repToastLayer || scene._repToastLayer.parent !== top) {
    scene._repToastLayer = new Sprite();
    top.addChild(scene._repToastLayer);
  }
  return scene._repToastLayer;
}
function addToast(text){
  if (toastsMuted()) return;
  const sc = SceneManager._scene;
  const layer = ensureToastLayer(sc);
  if (!layer) return;
  const s = new Sprite_RepToast(text);
  let y = toastY;
  for (let i = 0; i < layer.children.length; i++) y += 30;
  s.y = y;
  layer.addChild(s);
}
// expose API used internally
Scene_Map.prototype.addRepToast = addToast;
Scene_Battle.prototype.addRepToast = addToast;

//-----------------------------------------------------------------------------
// Game_System storage
//-----------------------------------------------------------------------------
const _GS_init = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
  _GS_init.call(this);
  this._discoveredLocations = [];
  this._discoveredFactions  = [];
  this._repHistory          = [];
  this._repLastValues       = {};
  this._repEquipCooldown    = {};
  this._repDecayFrameAcc    = 0;
  this._repRegionTick       = {};
  this._repThresholdFired   = {};
};

// Discover (with optional toasts) — now uses Shown Name
const _TR_discoverLocation = Game_System.prototype.discoverLocation;
Game_System.prototype.discoverLocation = function(id) {
  const had = this._discoveredLocations.includes(id);
  if (_TR_discoverLocation) _TR_discoverLocation.call(this, id);
  else if (locationIds.has(id) && !had) this._discoveredLocations.push(id);
  if (!had && enableDiscoverToasts && !toastsMuted()) addToast(`Discovered: ${TR_getDisplayName(id)}`);
};
const _TR_discoverFaction = Game_System.prototype.discoverFaction;
Game_System.prototype.discoverFaction = function(id) {
  const had = this._discoveredFactions.includes(id);
  if (_TR_discoverFaction) _TR_discoverFaction.call(this, id);
  else if (factionIds.has(id) && !had) this._discoveredFactions.push(id);
  if (!had && enableDiscoverToasts && !toastsMuted()) addToast(`Discovered: ${TR_getDisplayName(id)}`);
};

Game_System.prototype.getDiscoveredLocations = function() { return this._discoveredLocations.slice(); };
Game_System.prototype.getDiscoveredFactions  = function() { return this._discoveredFactions.slice(); };
Game_System.prototype.getRepHistory          = function() { return this._repHistory.slice(); };

// Logging + Toasts — now uses Shown Name
function logChange(entityId, type, delta) {
  if (delta === 0) return;
  const sys = $gameSystem;
  sys._repHistory.unshift({
    time: new Date().toLocaleTimeString(),
    entityId, repType: type, delta
  });
  if (sys._repHistory.length > historyLogMax) sys._repHistory.pop();
  addToast(`${TR_getDisplayName(entityId)} ${delta>0?'+':''}${delta}${type && type!=='default' ? ` [${type}]` : ''}`);
}

// Set/Add with clamp, auto-discover, thresholds, ripple
function setRep(entityId, val, type='default', opts={}) {
  const t = resolveType(entityId, type);
  if (!t) {
    if (enableWarnings) console.warn(`[TownReputation] Unmapped entity "${entityId}" (type "${type}")`);
    return;
  }
  const vId = varId(entityId, t);
  const sys = $gameSystem;
  const old = $gameVariables.value(vId) || 0;
  const nxt = Math.max(clampMin, Math.min(clampMax, Math.floor(val)));
  if (nxt === old) return;
  $gameVariables.setValue(vId, nxt);
  if (enableAutoDiscover) {
    if (locationIds.has(entityId)) sys.discoverLocation(entityId);
    if (factionIds.has(entityId))  sys.discoverFaction(entityId);
  }
  logChange(entityId, t, nxt - old);

  if (enableThresholds && !opts.silent) {
    thresholds.forEach(th => {
      if (th.entityId !== entityId || th.repType !== t) return;
      const before = opCheck(old, th.op, th.value);
      const after  = opCheck(nxt, th.op, th.value);
      if (!before && after && th.commonEventId > 0) {
        const markKey = `${entityId}||${t}||${th.op}||${th.value}`;
        if (th.once && sys._repThresholdFired[markKey]) return;
        $gameTemp.reserveCommonEvent(th.commonEventId);
        sys._repThresholdFired[markKey] = true;
      }
    });
  }
}
function addRepEx(entityId, delta, type='default', opts={}) {
  const t = resolveType(entityId, type);
  if (!t) {
    if (enableWarnings) console.warn(`[TownReputation] Unmapped entity "${entityId}" (type "${type}") on add ${delta}`);
    return;
  }
  const current = getRep(entityId, t);
  setRep(entityId, current + Math.floor(delta||0), t, opts);

  if (enableRipple && !opts.noRipple && delta) {
    const keyA = `${entityId}||${t}`;
    const keyB = `${entityId}||`;
    [keyA, keyB].forEach(k => {
      (rippleMap[k]||[]).forEach(e => {
        const d2 = Math.floor(delta * e.mult);
        if (d2) addRepEx(e.targetId, d2, e.repType, { noRipple: true, origin:'ripple' });
      });
    });
  }
}
function addRep(entityId, delta, type='default'){ addRepEx(entityId, delta, type, {}); }

// Plugin Commands
PluginManager.registerCommand(PLUGIN, 'setReputation', args => setRep(args.entityId, Number(args.value), args.repType));
PluginManager.registerCommand(PLUGIN, 'addReputation', args => addRep(args.entityId, Number(args.value), args.repType));
PluginManager.registerCommand(PLUGIN, 'subtractReputation', args => addRep(args.entityId, -Number(args.value), args.repType));
PluginManager.registerCommand(PLUGIN, 'discoverLocation', args => $gameSystem.discoverLocation(args.locationId));
PluginManager.registerCommand(PLUGIN, 'discoverFaction',  args => $gameSystem.discoverFaction(args.factionId));
PluginManager.registerCommand(PLUGIN, 'openReputationMenu', _ => SceneManager.push(Scene_Reputation));
PluginManager.registerCommand(PLUGIN, 'openRepHistory', _ => { Scene_RepHistory._filter = null; SceneManager.push(Scene_RepHistory); });
PluginManager.registerCommand(PLUGIN, 'openRepHistoryFiltered', args => {
  Scene_RepHistory._filter = { entity: (args.entityId||'').trim(), type: (args.repType||'').trim() };
  SceneManager.push(Scene_RepHistory);
});
PluginManager.registerCommand(PLUGIN, 'exportRepHistory', args => exportRepHistory(args.path));
PluginManager.registerCommand(PLUGIN, 'checkReputation', args => {
  const v = getRep(args.entityId, args.repType||'default');
  const ok = opCheck(v, args.op||'>=', Number(args.value||0));
  $gameSwitches.setValue(Number(args.switchId||1), !!ok);
});
PluginManager.registerCommand(PLUGIN, 'openRepDebug', _ => { if (enableDebugScene) SceneManager.push(Scene_RepDebug); });

// Inline codes
const _alias_convertEscape = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
  let processed = _alias_convertEscape.call(this, text);
  processed = processed.replace(/<showRep:\s*(.+?)(?:\s+type:(\w+))?\s*>/gi, (_, id, t) => String(getRep(id.trim(), t || 'default')));
  processed = processed.replace(/<showTier:\s*(.+?)(?:\s+type:(\w+))?\s*>/gi, (_, id, t) => getTier(getRep(id.trim(), t || 'default')));
  return processed;
};

// Battle tags (on victory)
const _BM_end = BattleManager.endBattle;
BattleManager.endBattle = function(result) {
  _BM_end.call(this, result);
  if (result !== 0) return;
  const notes = [];
  const tro = $gameTroop.troop();
  if (tro && tro.note) notes.push(tro.note);
  $gameTroop.members().forEach(m => { const e = m.enemy(); if (e && e.note) notes.push(e.note); });
  const rx = /<rep\s*battle:\s*([^>]+?)\s+([+\-]?\d+)(?:\s+type:(\w+))?\s*>/gi;
  let match, blob = notes.join('\n');
  while ((match = rx.exec(blob)) !== null) addRepEx(match[1].trim(), Number(match[2]), (match[3]||'default').trim(), {origin:'battle'});
};

// Notes parsing
function parseNoteList(obj, key) {
  const out = [];
  if (!obj || !obj.note) return out;
  const rx = new RegExp(`<rep\\s+${key}:\\s*([^>]+?)\\s+([+\\-]?\\d+)(?:\\s+type:(\\w+))?\\s*>`,'gi');
  let m; while ((m = rx.exec(obj.note)) !== null) out.push({ entity:(m[1]||'').trim(), delta:Number(m[2]||0), type:(m[3]||'default').trim() });
  return out;
}
function applyFromList(list, mult=1, origin='api') { list.forEach(t => addRepEx(t.entity, t.delta*mult, t.type, {origin})); }

// Use / Skill
const _GB_useItem = Game_Battler.prototype.useItem;
Game_Battler.prototype.useItem = function(item) {
  _GB_useItem.call(this, item);
  if (item && DataManager.isItem(item))  applyFromList(parseNoteList(item, 'use'), 1, 'use');
  if (item && DataManager.isSkill(item)) applyFromList(parseNoteList(item, 'skill'), 1, 'skill');
};

// Have (gain/loss), suppress during equip swaps
let _tr_equippingSwap = false;
const _GP_gainItem = Game_Party.prototype.gainItem;
Game_Party.prototype.gainItem = function(item, amount, includeEquip) {
  _GP_gainItem.call(this, item, amount, includeEquip);
  if (!_tr_equippingSwap && item && amount) applyFromList(parseNoteList(item, 'have'), amount, 'have');
};

//--------------------------- SHOP (SAFE) ------------------------------------
// Price (guard)
const _WSB_price = Window_ShopBuy.prototype.price;
Window_ShopBuy.prototype.price = function(item) {
  let base = 0;
  try {
    base = (typeof _WSB_price === 'function') ? _WSB_price.call(this, item) : (item && item.price != null ? item.price : 0);
  } catch(_) {
    base = (item && item.price != null ? item.price : 0);
  }
  let price = base;
  if (_globalReputationPriceModifier) price = Math.floor(price * (1 + _globalReputationPriceModifier));
  return price;
};
// Reset modifier when leaving shop (guard)
const _SS_pop = Scene_Shop.prototype.popScene;
Scene_Shop.prototype.popScene = function() {
  if (typeof _SS_pop === 'function') _SS_pop.call(this);
  _globalReputationPriceModifier = 0;
};
// One-shot rep on purchase (guard)
const _SS_doBuy = Scene_Shop.prototype.doBuy;
Scene_Shop.prototype.doBuy = function(number) {
  const item = this._item;
  if (typeof _SS_doBuy === 'function') _SS_doBuy.call(this, number);
  if (enableBuyRep && item && number > 0) applyFromList(parseNoteList(item, 'buy'), number, 'buy');
};
// Read Comment tags (108/408) to set price mod — SAFE ALIAS
const rxPrice = /<rep\s+price\s+mod:\s*([^>]+?)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)%\s*>/i;
function tryApplyPriceComment(text) {
  if (!text) return;
  const m = text.match(rxPrice);
  if (!m) return;
  const entityId = (m[1] || '').trim();
  const min = Number(m[2] || 0);
  const max = Number(m[3] || 0);
  const pct = Number(m[4] || 0) / 100;
  const r = getRep(entityId, 'default');
  _globalReputationPriceModifier = (r >= min && r <= max) ? pct : 0;
}
const _GI_c108 = Game_Interpreter.prototype.command108;
Game_Interpreter.prototype.command108 = function() {
  try {
    const cmd = this.currentCommand && this.currentCommand();
    const txt = cmd && cmd.parameters ? cmd.parameters[0] : null;
    tryApplyPriceComment(txt);
  } catch(_) {}
  return _GI_c108 ? _GI_c108.apply(this, arguments) : true;
};
const _GI_c408 = Game_Interpreter.prototype.command408;
Game_Interpreter.prototype.command408 = function() {
  try {
    const cmd = this.currentCommand && this.currentCommand();
    const txt = cmd && cmd.parameters ? cmd.parameters[0] : null;
    tryApplyPriceComment(txt);
  } catch(_) {}
  return _GI_c408 ? _GI_c408.apply(this, arguments) : true;
};
// Shop gating (guard) & preview
function parseReq(obj) {
  const rx = /<rep\s+req:\s*([^>]+?)\s*(>=|>|<=|<|=)\s*(-?\d+)(?:\s+type:(\w+))?\s*>/i;
  const m = obj && obj.note ? obj.note.match(rx) : null;
  if (!m) return null;
  return { entity:(m[1]||'').trim(), op:m[2], value:Number(m[3]||0), type:(m[4]||'default').trim() };
}
const _WSB_isEnabled = Window_ShopBuy.prototype.isEnabled;
Window_ShopBuy.prototype.isEnabled = function(item) {
  let ok = true;
  try { ok = (typeof _WSB_isEnabled === 'function') ? _WSB_isEnabled.call(this, item) : true; }
  catch(_) { ok = true; }
  if (!enableShopGating || !item) return ok;
  const req = parseReq(item);
  if (!req) return ok;
  const v = getRep(req.entity, req.type);
  return ok && opCheck(v, req.op, req.value);
};
const _WSB_drawItem = Window_ShopBuy.prototype.drawItem;
Window_ShopBuy.prototype.drawItem = function(index) {
  if (typeof _WSB_drawItem === 'function') _WSB_drawItem.call(this, index);
  if (!showShopRepPreview) return;
  const item = this.itemAt(index);
  if (!item) return;
  const rect = this.itemRect(index);
  const y = rect.y + this.lineHeight() - 2;
  const pad = this.textPadding ? this.textPadding() : 6;
  this.changeTextColor(ColorManager.systemColor());
  const bits = [];
  const buy = parseNoteList(item,'buy')[0];
  const have= parseNoteList(item,'have')[0];
  const req = parseReq(item);
  const nice = (id)=>TR_getDisplayName(id);
  if (buy) bits.push(`Buy: ${nice(buy.entity)} ${buy.delta>0?'+':''}${buy.delta}${buy.type!=='default'?` [${buy.type}]`:''}`);
  if (have)bits.push(`Have: ${nice(have.entity)} ${have.delta>0?'+':''}${have.delta}${have.type!=='default'?` [${have.type}]`:''}`);
  if (req) bits.push(`Req: ${nice(req.entity)} ${req.op} ${req.value}${req.type!=='default'?` [${req.type}]`:''}`);
  if (bits.length) this.drawText(bits.join('   '), rect.x+pad, y, rect.width-pad*2);
  this.resetTextColor();
};
//------------------------- END SHOP (SAFE) ----------------------------------

// Equip/Unequip stable per-slot + cooldown
function applyEquipDelta(oldItem, newItem, actor) {
  if (oldItem===newItem) return;
  const nowFrame = Graphics.frameCount;
  if (equipCooldownFrames>0 && actor) {
    const k = `a${actor.actorId()}||${oldItem?oldItem.id:0}||${newItem?newItem.id:0}`;
    const last = $gameSystem._repEquipCooldown[k] || 0;
    if (nowFrame - last < equipCooldownFrames) return;
    $gameSystem._repEquipCooldown[k] = nowFrame;
  }
  if (oldItem && (DataManager.isWeapon(oldItem)||DataManager.isArmor(oldItem))) {
    const uneq = parseNoteList(oldItem,'unequip');
    if (uneq.length) applyFromList(uneq, 1, 'unequip');
    else {
      const eq = parseNoteList(oldItem,'equip');
      if (eq.length) applyFromList(eq, -1, 'equip');
    }
  }
  if (newItem && (DataManager.isWeapon(newItem)||DataManager.isArmor(newItem))) {
    const eq = parseNoteList(newItem,'equip');
    if (eq.length) applyFromList(eq, 1, 'equip');
  }
}
const _GA_changeEquip = Game_Actor.prototype.changeEquip;
Game_Actor.prototype.changeEquip = function(slotId, item) {
  _tr_equippingSwap = true;
  const oldItem = this.equips()[slotId];
  _GA_changeEquip.call(this, slotId, item);
  const newItem = this.equips()[slotId];
  _tr_equippingSwap = false;
  applyEquipDelta(oldItem, newItem, this);
};

// Decay & Region Auras (Scene_Map.update)
const _SM_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
  _SM_update.call(this);
  const sys = $gameSystem;
  if (!sys) return;
  const fps = 60;
  // Decay
  if (enableDecay) {
    sys._repDecayFrameAcc = (sys._repDecayFrameAcc||0) + 1;
    if (sys._repDecayFrameAcc >= Math.max(1, Math.floor(decayIntervalSec*fps))) {
      sys._repDecayFrameAcc = 0;
      decayRules.forEach(r => addRepEx(r.entityId, r.delta, r.repType, {origin:'decay'}));
    }
  }
  // Region auras
  if (enableRegionAuras && $gamePlayer && $gameMap) {
    const reg = $gameMap.regionId($gamePlayer.x, $gamePlayer.y);
    const nowF = Graphics.frameCount;
    regionAurasRaw.forEach(a => {
      if (Number(a.regionId)!==reg) return;
      const key = `r${reg}||${a.entityId}||${a.repType||'default'}`;
      const cdFrames = Math.max(1, Math.floor((Number(a.cooldownSec||1))*fps));
      const last = sys._repRegionTick[key] || 0;
      if (nowF - last >= cdFrames) {
        sys._repRegionTick[key] = nowF;
        addRepEx(a.entityId, Number(a.deltaPerSecond||0), (a.repType||'default'), {origin:'region'});
      }
    });
  }
};

// Reputation Window/Scenes (single scene; switch category) — uses Shown Name
function Window_Reputation(rect) { this.initialize(rect); }
Window_Reputation.prototype = Object.create(Window_Selectable.prototype);
Window_Reputation.prototype.constructor = Window_Reputation;
Window_Reputation.prototype.initialize = function(rect) {
  Window_Selectable.prototype.initialize.call(this, rect);
  this._category = 'locations';
  this.refresh();
  this.activate();
};
Window_Reputation.prototype.maxItems = function(){ return (this._data||[]).length; };
Window_Reputation.prototype.itemHeight = function(){ return this.lineHeight()*3; };
Window_Reputation.prototype.setCategory = function(cat){ if (this._category!==cat){ this._category=cat; this.refresh(); this.select(0);} };
Window_Reputation.prototype.refresh = function(){
  this._data = (this._category==='locations' ? $gameSystem.getDiscoveredLocations() : $gameSystem.getDiscoveredFactions()).slice().sort();
  Window_Selectable.prototype.refresh.call(this);
};
Window_Reputation.prototype.drawItem = function(index){
  const id = this._data[index]; if (!id) return;
  const rect = this.itemLineRect(index); let y = rect.y;
  this.changeTextColor(ColorManager.systemColor());
  this.drawText(TR_getDisplayName(id), rect.x, y, rect.width); 
  this.resetTextColor(); 
  y += this.lineHeight();

  const available = repTypes.filter(t => varId(id, t)>0);
  const gaugeType = available.length ? available[0] : 'default';
  const vId = varId(id, gaugeType);
  if (vId > 0) {
    const score = getRep(id, gaugeType);
    const tier  = getTier(score);
    const gw    = Math.floor(rect.width * 0.7);
    const minS  = reputationTiers[reputationTiers.length - 1]?.requiredScore ?? 0;
    const maxS  = reputationTiers[0]?.requiredScore ?? 100;
    const pct   = maxS>minS ? (score - minS) / (maxS - minS) : 0.5;
    const fillW = Math.floor(gw * Math.min(1, Math.max(0, pct)));
    const c1 = score>=0 ? ColorManager.powerUpColor() : ColorManager.powerDownColor();
    const c2 = score>=0 ? ColorManager.textColor(17) : ColorManager.textColor(18);
    this.contents.fillRect(rect.x, y+4, gw, this.lineHeight()-8, ColorManager.gaugeBackColor());
    this.contents.gradientFillRect(rect.x, y+4, fillW, this.lineHeight()-8, c1, c2);
    this.resetTextColor();
    this.drawText(`${tier} (${score})`, rect.x+gw+5, y, rect.width-gw-5);
    y += this.lineHeight();
    const desc = tierDescriptions[tier];
    if (desc) this.drawTextEx(desc, rect.x, y, rect.width);
  }
};

function Window_RepHistory(rect){ this.initialize(rect); }
Window_RepHistory.prototype = Object.create(Window_Selectable.prototype);
Window_RepHistory.prototype.constructor = Window_RepHistory;
Window_RepHistory.prototype.initialize = function(rect){
  Window_Selectable.prototype.initialize.call(this, rect);
  const f = Scene_RepHistory._filter;
  const data = $gameSystem.getRepHistory();
  this._data = (!P.enableHistoryFilter || !f || (!f.entity && !f.type)) ? data :
    data.filter(e => (!f.entity || e.entityId===f.entity) && (!f.type || e.repType===f.type));
  this.refresh(); this.activate(); this.select(0);
};
Window_RepHistory.prototype.maxItems = function(){ return this._data.length; };
Window_RepHistory.prototype.itemHeight = function(){ return this.lineHeight(); };
Window_RepHistory.prototype.drawItem = function(i){
  const e = this._data[i];
  const rect = this.itemLineRect(i);
  const name = TR_getDisplayName(e.entityId);
  const txt = `${e.time} | ${name} [${e.repType}] ${e.delta>0?'+':''}${e.delta}`;
  this.drawText(txt, rect.x, rect.y, rect.width);
};

function Scene_Reputation(){ this.initialize.apply(this, arguments); }
Scene_Reputation.prototype = Object.create(Scene_MenuBase.prototype);
Scene_Reputation.prototype.constructor = Scene_Reputation;
Scene_Reputation.prototype.create = function(){
  Scene_MenuBase.prototype.create.call(this);
  const topY = this.mainAreaTop();
  this._rep = new Window_Reputation(new Rectangle(0, topY, Graphics.boxWidth, Graphics.boxHeight - topY));
  this._rep.setHandler('cancel', () => this.popScene());
  this.addWindow(this._rep);
};
Scene_Reputation.prototype.start = function(){
  Scene_MenuBase.prototype.start.call(this);
  const cat = (Scene_Reputation._openCategory === 'factions') ? 'factions' : 'locations';
  this._rep.setCategory(cat); this._rep.refresh(); this._rep.select(0); this._rep.activate();
  Scene_Reputation._openCategory = 'locations';
};
Scene_Reputation._openCategory = 'locations';

function Scene_RepHistory(){ this.initialize.apply(this, arguments); }
Scene_RepHistory.prototype = Object.create(Scene_MenuBase.prototype);
Scene_RepHistory.prototype.constructor = Scene_RepHistory;
Scene_RepHistory.prototype.create = function(){
  Scene_MenuBase.prototype.create.call(this);
  const topY = this.mainAreaTop();
  const hist = new Window_RepHistory(new Rectangle(0, topY, Graphics.boxWidth, Graphics.boxHeight - topY));
  hist.setHandler('cancel', () => this.popScene());
  this.addWindow(hist);
};

// Simple debug scene
function Scene_RepDebug(){ this.initialize.apply(this, arguments); }
Scene_RepDebug.prototype = Object.create(Scene_MenuBase.prototype);
Scene_RepDebug.prototype.constructor = Scene_RepDebug;
Scene_RepDebug.prototype.create = function(){
  Scene_MenuBase.prototype.create.call(this);
  const topY = this.mainAreaTop();
  const rect = new Rectangle(0, topY, Graphics.boxWidth, Graphics.boxHeight - topY);
  this._win = new Window_Selectable(rect);
  this._list = Object.keys(reputationMap).sort();
  this._win.maxItems = () => this._list.length;
  this._win.drawItem = i => {
    const id = this._list[i], r = this._win.itemRect(i);
    const t = resolveType(id,'default')||'default';
    const v = getRep(id,t);
    this._win.drawText(`${TR_getDisplayName(id)} [${t}] = ${v}`, r.x, r.y, r.width);
  };
  this._win.processCursorMove = function(){
    Window_Selectable.prototype.processCursorMove.call(this);
    if (this.isOpenAndActive()) {
      const i = this.index(); if (i<0) return;
      const id = this._parent._list[i]; const t = resolveType(id,'default')||'default';
      if (Input.isRepeated('left'))  addRepEx(id, -1, t, {origin:'debug', silent:true}), this.refresh();
      if (Input.isRepeated('right')) addRepEx(id, +1, t, {origin:'debug', silent:true}), this.refresh();
      if (Input.isTriggered('pageup'))   addRepEx(id, +10, t, {origin:'debug', silent:true}), this.refresh();
      if (Input.isTriggered('pagedown')) addRepEx(id, -10, t, {origin:'debug', silent:true}), this.refresh();
    }
  }.bind(this._win);
  this._win._parent = this;
  this._win.setHandler('cancel', ()=>this.popScene());
  this.addWindow(this._win);
};
Scene_RepDebug.prototype.start = function(){ Scene_MenuBase.prototype.start.call(this); this._win.select(0); this._win.activate(); };

// Export CSV (stub; runtime cannot write files)
function exportRepHistory(path){
  if (enableWarnings) console.warn('[TownReputation] exportRepHistory is not implemented in runtime.');
}

// Expose scenes & add menu commands
if (typeof window!=='undefined'){
  window.Scene_Reputation = Scene_Reputation;
  window.Scene_RepHistory = Scene_RepHistory;
  window.Scene_RepDebug   = Scene_RepDebug;
}

// Add menu entries
const _WM_add = Window_MenuCommand.prototype.addMainCommands;
Window_MenuCommand.prototype.addMainCommands = function(){
  _WM_add.call(this);
  if (showMenu) {
    this.addCommand(menuName, 'reputation', true);
    this.addCommand('Factions', 'factions', true);
  }
};
const _SM_create = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function(){
  _SM_create.call(this);
  this._commandWindow.setHandler('reputation', ()=>{ Scene_Reputation._openCategory='locations'; SceneManager.push(Scene_Reputation); });
  this._commandWindow.setHandler('factions',   ()=>{ Scene_Reputation._openCategory='factions'; SceneManager.push(Scene_Reputation); });
};

})();
