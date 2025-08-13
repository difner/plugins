//=============================================================================
// Gemini_TerritoryControl.js  v0.1.2
// Core territory ownership & capture with optional HUD and system hooks.
// - Map → Territory binding (by param or <territory: ID> map note)
// - Influence per faction; flip owner when threshold/margin met
// - Region capture (stand in a region to push influence)
// - Beacon capture (event comment: <tc beacon: ENTITY RATE [range:N] [interval:S] [delay:S]>)
//   * interval: apply RATE once per S seconds (tick mode)
//   * delay:    initial wait before first tick
//   * no interval: continuous RATE/sec (legacy behavior)
// - Optional decay
// - HUD: "Owner: X" + capture bar (owner/top mode)
// - Hooks: BountyBoard owner sync, global shop price bias while on owned map
//=============================================================================
/*:
 * @target MZ
 * @plugindesc v0.1.2 Territory ownership + capture (region/beacon), HUD, and hooks to Board/Shops
 * @author Gemini
 *
 * @help
 * QUICK USE
 * 1) Place after TownReputation / BountyBoard / Bounty&Warrants / Contract HUD.
 * 2) Bind map → territory (param or map note <territory: ID>).
 * 3) Optional: region rules or beacon events to push influence.
 * 4) HUD shows current owner + bar. Choose bar mode: owner or top.
 *
 * MAP NOTE
 *   <territory: ID>
 *
 * EVENT COMMENT (beacon)
 *   <tc beacon: ENTITY RATE [range:N] [interval:S] [delay:S]>
 *     ENTITY:   faction/location id (e.g., TownGuards)
 *     RATE:     influence delta (e.g., 2 or -3)
 *     range:    tiles from event (default param)
 *     interval: seconds between ticks (apply RATE once per interval)
 *     delay:    seconds to wait before the first tick
 *   Examples:
 *     <tc beacon: Bandits -3 range:6>              // continuous -3/sec (legacy)
 *     <tc beacon: Bandits -3 range:6 interval:5>   // -3 every 5s (avg -0.6/sec)
 *     <tc beacon: Bandits -1 interval:2 delay:3>   // start after 3s, then -1 every 2s
 *
 * ESCAPE CODES (Show Text)
 *   <showOwner>       → territory owner shown name (or —)
 *   <showOwnerId>     → owner id
 *   <showTerritoryId> → current territory id
 *
 * PLUGIN COMMANDS
 *   - Set Owner / Add Influence / Set Influence / Bind Map
 *   - Show/Hide/Toggle HUD
 *   - Set HUD Bar Mode (owner/top) + Toggle HUD Bar Mode
 *
 * @param ---Territories---
 * @default
 *
 * @param territories
 * @parent ---Territories---
 * @text Territory Definitions
 * @type struct<TerritoryDef>[]
 * @default []
 *
 * @param mapBindings
 * @parent ---Territories---
 * @text Map → Territory Bindings
 * @type struct<MapBind>[]
 * @default []
 *
 * @param autoBindByMapNote
 * @parent ---Territories---
 * @text Auto Bind by Map <territory: ID> Note
 * @type boolean
 * @default true
 *
 * @param flipThreshold
 * @parent ---Territories---
 * @text Flip Threshold (top influence >=)
 * @type number
 * @default 50
 *
 * @param winMargin
 * @parent ---Territories---
 * @text Win Margin (top - second >=)
 * @type number
 * @default 10
 *
 * @param maxInfluence
 * @parent ---Territories---
 * @text Clamp Influence ±
 * @type number
 * @default 999
 *
 * @param influenceDecayPerSec
 * @parent ---Territories---
 * @text Decay per Second (non-owner)
 * @type number
 * @default 0
 *
 * @param ownerChangeCommonEvent
 * @parent ---Territories---
 * @text On Owner Change → Common Event
 * @type common_event
 * @default 0
 *
 * @param enableToasts
 * @parent ---Territories---
 * @text Toast on Owner Change
 * @type boolean
 * @default true
 *
 * @param ---Region Capture---
 * @default
 *
 * @param regionCaptureRules
 * @parent ---Region Capture---
 * @text Region Capture Rules
 * @type struct<RegionRule>[]
 * @default []
 *
 * @param beaconDefaultRange
 * @parent ---Region Capture---
 * @text Beacon Default Range (tiles)
 * @type number
 * @default 4
 *
 * @param ---Hooks---
 * @default
 *
 * @param syncBoardOwner
 * @parent ---Hooks---
 * @text Sync BountyBoard Owner
 * @type boolean
 * @default true
 *
 * @param tcShopBiasPct
 * @parent ---Hooks---
 * @text Shop Price Bias % (on owned map)
 * @type number
 * @default 0
 *
 * @param ---HUD---
 * @default
 *
 * @param enableHud
 * @parent ---HUD---
 * @text Enable Territory HUD
 * @type boolean
 * @default true
 *
 * @param hudTheme
 * @parent ---HUD---
 * @text HUD Theme
 * @type select
 * @option classic
 * @option edge
 * @default edge
 *
 * @param hudFontSize
 * @parent ---HUD---
 * @text HUD Font Size
 * @type number
 * @default 20
 *
 * @param hudWidth
 * @parent ---HUD---
 * @text HUD Width (0=auto)
 * @type number
 * @default 0
 *
 * @param hudBarHeight
 * @parent ---HUD---
 * @text HUD Bar Height
 * @type number
 * @default 10
 *
 * @param hudAnchor
 * @parent ---HUD---
 * @text HUD Anchor
 * @type select
 * @option tl
 * @option tr
 * @option bl
 * @option br
 * @default tr
 *
 * @param hudOffsetX
 * @parent ---HUD---
 * @text HUD X Offset
 * @type number
 * @default 12
 *
 * @param hudOffsetY
 * @parent ---HUD---
 * @text HUD Y Offset
 * @type number
 * @default 12
 *
 * @param hudEdgeBorder
 * @parent ---HUD---
 * @text Edge Border (px, edge theme)
 * @type number
 * @default 2
 *
 * @param hudBarMode
 * @parent ---HUD---
 * @text HUD Bar Mode
 * @type select
 * @option owner
 * @option top
 * @default owner
 *
 * @command setOwner
 * @text Set Owner
 * @arg territoryId
 * @type string
 * @arg ownerId
 * @type string
 *
 * @command addInfluence
 * @text Add Influence
 * @arg territoryId
 * @type string
 * @arg entityId
 * @type string
 * @arg value
 * @type number
 *
 * @command setInfluence
 * @text Set Influence
 * @arg territoryId
 * @type string
 * @arg entityId
 * @type string
 * @arg value
 * @type number
 *
 * @command bindMap
 * @text Bind Map → Territory
 * @arg mapId
 * @type number
 * @arg territoryId
 * @type string
 *
 * @command showHud
 * @text Show HUD
 *
 * @command hideHud
 * @text Hide HUD
 *
 * @command toggleHud
 * @text Toggle HUD
 *
 * @command setHudBarMode
 * @text Set HUD Bar Mode
 * @arg mode
 * @type select
 * @option owner
 * @option top
 * @default owner
 *
 * @command toggleHudBarMode
 * @text Toggle HUD Bar Mode
 */

/*~struct~TerritoryDef:
 * @param id
 * @type string
 * @param shownName
 * @type string
 * @default
 * @param startOwner
 * @type string
 * @default
 */

/*~struct~MapBind:
 * @param mapId
 * @type number
 * @param territoryId
 * @type string
 */

/*~struct~RegionRule:
 * @param regionId
 * @type number
 * @param entityId
 * @type string
 * @param deltaPerSec
 * @type number
 * @default 1
 */

(() => {
  'use strict';
  const PN = 'Gemini_TerritoryControl';
  const P  = PluginManager.parameters(PN);

  // --- compat guard ---
  if (typeof Window_Base.prototype.textPadding !== 'function'){
    Window_Base.prototype.textPadding = function(){ return (typeof this.itemPadding==='function') ? this.itemPadding() : 6; };
  }

  // helpers
  const s=x=>String(x??'').trim();
  const n=x=>Number(x??0);
  const b=x=>String(x??'false')==='true';
  const parseList = raw => { try { return JSON.parse(raw||'[]'); } catch(_){ return []; } };
  const parseMapList = raw => parseList(raw).map(t=>{ try{ return JSON.parse(t); }catch(_){ return null; } }).filter(Boolean);

  // params
  const defs        = parseMapList(P.territories);
  const bindsRaw    = parseMapList(P.mapBindings);
  const AUTO_NOTE   = b(P.autoBindByMapNote||'true');
  const THRESH      = n(P.flipThreshold||50);
  const MARGIN      = n(P.winMargin||10);
  const MAXINF      = Math.max(1, n(P.maxInfluence||999));
  const DECAY       = n(P.influenceDecayPerSec||0);
  const CEVT        = n(P.ownerChangeCommonEvent||0);
  const TOAST       = b(P.enableToasts||'true');

  const regionRules = parseMapList(P.regionCaptureRules);
  const BEACON_RANGE= Math.max(1, n(P.beaconDefaultRange||4));

  const SYNC_BOARD  = b(P.syncBoardOwner||'true');
  const SHOP_BIAS_P = n(P.tcShopBiasPct||0) / 100.0;

  const HUD_ON      = b(P.enableHud||'true');
  const HUD_THEME   = s(P.hudTheme||'edge');
  const HUD_FS      = n(P.hudFontSize||20);
  const HUD_W       = n(P.hudWidth||0);
  const HUD_BAR_H   = Math.max(6, n(P.hudBarHeight||10));
  const HUD_ANCHOR  = s(P.hudAnchor||'tr'); // tl/tr/bl/br
  const HUD_OX      = n(P.hudOffsetX||12);
  const HUD_OY      = n(P.hudOffsetY||12);
  const HUD_BORDER  = Math.max(0, n(P.hudEdgeBorder||2));
  const HUD_BAR_MODE= s(P.hudBarMode||'owner'); // 'owner' or 'top'

  // display name helper (optionally pulls from TownReputation's shown-name API if present)
  function displayName(id){
    if (!id) return '—';
    try { if (typeof TR_getDisplayName === 'function') return TR_getDisplayName(id); } catch(_){}
    return String(id);
  }

  // $gameSystem slots
  const _GS_init = Game_System.prototype.initialize;
  Game_System.prototype.initialize = function(){
    _GS_init.call(this);
    this._tc = this._tc || {
      maps: {},     // mapId -> territoryId
      t: {},        // territoryId -> { owner:'', inf:{entity:number} }
      hud: HUD_ON,
      barMode: HUD_BAR_MODE
    };
    // seed defs & binds
    defs.forEach(d => {
      const id = s(d.id); if (!id) return;
      const cur = this._tc.t[id] || { owner:'', inf:{} };
      if (!cur.owner && s(d.startOwner)) cur.owner = s(d.startOwner);
      this._tc.t[id] = cur;
    });
    bindsRaw.forEach(bd => {
      const m = n(bd.mapId||0), tid = s(bd.territoryId);
      if (m>0 && tid) this._tc.maps[m] = tid;
    });
  };

  // Territory core API
  function territoryData(id){
    id = s(id); if (!id) return null;
    $gameSystem._tc.t[id] = $gameSystem._tc.t[id] || { owner:'', inf:{} };
    return $gameSystem._tc.t[id];
  }
  function getTerritoryIdForMap(mapId){
    const exp = $gameSystem._tc.maps[mapId];
    if (exp) return exp;
    if (AUTO_NOTE){
      const map = $dataMap;
      if (map && map.note){
        const m = map.note.match(/<territory:\s*(.+?)\s*>/i);
        if (m){ const tid = s(m[1]); $gameSystem._tc.maps[mapId]=tid; return tid; }
      }
    }
    return null;
  }
  function getCurrentTerritoryId(){
    if (!$gameMap) return null;
    return getTerritoryIdForMap($gameMap.mapId());
  }
  function getOwner(tid){
    const t = territoryData(tid); return t ? t.owner || '' : '';
  }
  function setOwner(tid, ownerId){
    const t = territoryData(tid); if (!t) return;
    const prev = t.owner || '';
    const next = s(ownerId||'');
    if (prev === next) return;
    t.owner = next;
    // toast
    if (TOAST) try {
      if (SceneManager._scene && typeof Scene_Map.prototype.addRepToast === 'function'){
        SceneManager._scene.addRepToast(`Territory: ${displayName(tid)} → ${displayName(next)}`);
      }
    } catch(_){}
    // CE
    if (CEVT > 0) $gameTemp.reserveCommonEvent(CEVT);
    // sync board
    if (SYNC_BOARD){
      try {
        if (typeof $gameSystem.setBoardOwner === 'function'){ $gameSystem.setBoardOwner(next); }
        else { $gameSystem._bbOwnerId = next; }
      } catch(_){}
    }
  }
  function clampInf(v){ return Math.max(-MAXINF, Math.min(MAXINF, Math.floor(v||0))); }
  function addInfluence(tid, entityId, delta){
    const t = territoryData(tid); if (!t) return;
    const e = s(entityId); if (!e) return;
    const cur = Number(t.inf[e] || 0);
    t.inf[e] = clampInf(cur + Number(delta||0));
  }
  function setInfluence(tid, entityId, value){
    const t = territoryData(tid); if (!t) return;
    const e = s(entityId); if (!e) return;
    t.inf[e] = clampInf(value);
  }
  function topTwo(tid){
    const t = territoryData(tid); if (!t) return {top:'', topV:0, snd:'', sndV:0};
    const arr = Object.entries(t.inf||{}).map(([k,v]) => [k, Number(v||0)]).sort((a,b)=>b[1]-a[1]);
    const top = arr[0] || ['',0], snd = arr[1] || ['',0];
    return { top: top[0], topV: top[1], snd: snd[0], sndV: snd[1] };
  }
  function checkFlip(tid){
    const {top, topV, sndV} = topTwo(tid);
    if (!top) return;
    if (topV >= THRESH && (topV - sndV) >= MARGIN){
      setOwner(tid, top);
    }
  }

  // Region capture tick
  function applyRegionCapture(tid){
    if (!tid) return;
    const fps = 60;
    const px = $gamePlayer.x, py = $gamePlayer.y;
    const regId = $gameMap.regionId(px, py);
    for (const r of regionRules){
      if (Number(r.regionId) === regId){
        addInfluence(tid, s(r.entityId), Number(r.deltaPerSec||0) / fps);
      }
    }
    // beacon events near player (supports interval/delay)
    const events = $gameMap.events();
    for (const ev of events){
      const bc = ev._tcBeacon;
      if (!bc) continue;
      const d = $gameMap.distance(px, py, ev.x, ev.y);
      if (d > bc.range) continue;

      const nowF = Graphics.frameCount;

      if (bc.intervalSec > 0){
        // Tick mode: apply RATE once every interval (with optional initial delay)
        const delayF    = Math.max(0, Math.floor(bc.delaySec * fps));
        const intervalF = Math.max(1, Math.floor(bc.intervalSec * fps));
        if (nowF >= (bc._startF + delayF)){
          if (!bc._lastF || (nowF - bc._lastF) >= intervalF){
            addInfluence(tid, bc.entity, bc.rate);
            bc._lastF = nowF;
          }
        }
      } else {
        // Continuous mode: RATE per second, distributed per frame
        addInfluence(tid, bc.entity, bc.rate / fps);
      }
    }
  }

  // Decay tick (non-owner decays toward 0)
  function applyDecay(tid){
    if (!tid || DECAY <= 0) return;
    const fps = 60;
    const t = territoryData(tid); if (!t) return;
    const own = s(t.owner||'');
    for (const k of Object.keys(t.inf)){
      if (k === own) continue;
      const v = Number(t.inf[k]||0);
      if (v > 0) t.inf[k] = clampInf(v - DECAY/fps);
      if (v < 0) t.inf[k] = clampInf(v + DECAY/fps);
    }
  }

  // Map hooks: parse beacons on page setup
  const _GE_setupPage = Game_Event.prototype.setupPage;
  Game_Event.prototype.setupPage = function(){
    _GE_setupPage.call(this);
    this._tcBeacon = null;
    const list = this.list() || [];
    for (const cmd of list){
      if (cmd.code===108 || cmd.code===408){
        const txt = cmd.parameters[0];
        const m = txt.match(/<tc\s+beacon:\s*([^\s>]+)\s+(-?\d+)(?:\s+range:(\d+))?(?:\s+interval:(\d+(?:\.\d+)?))?(?:\s+delay:(\d+(?:\.\d+)?))?\s*>/i);
        if (m){
          this._tcBeacon = {
            entity: s(m[1]),
            rate: Number(m[2]||0),
            range: Number(m[3]||BEACON_RANGE),
            intervalSec: Number(m[4]||0),
            delaySec: Number(m[5]||0),
            _startF: Graphics.frameCount,
            _lastF: 0
          };
        }
      }
    }
  };

  // Scene_Map: tick capture/decay; map-enter sync; HUD + shop bias
  let _tcShopMod = 0;
  const _SM_start = Scene_Map.prototype.start;
  Scene_Map.prototype.start = function(){
    _SM_start.call(this);
    const tid = getCurrentTerritoryId();
    if (tid && SYNC_BOARD){
      try {
        const own = getOwner(tid);
        if (typeof $gameSystem.setBoardOwner === 'function'){ $gameSystem.setBoardOwner(own); }
        else { $gameSystem._bbOwnerId = own; }
      } catch(_){}
    }
    _tcShopMod = 0;
    if (tid && SHOP_BIAS_P !== 0){
      const own = getOwner(tid);
      if (own) _tcShopMod = SHOP_BIAS_P;
    }
  };

  const _SM_update = Scene_Map.prototype.update;
  Scene_Map.prototype.update = function(){
    _SM_update.call(this);
    const tid = getCurrentTerritoryId();
    if (tid){
      applyRegionCapture(tid);
      applyDecay(tid);
      checkFlip(tid);
    }
    if (this._tcHud){
      this.positionTCHud();
      this._tcHud.visible = !!($gameSystem?._tc?.hud) && !!tid;
      if (this._tcHud.visible) this._tcHud.refreshIfNeeded();
    }
  };

  const _SM_createDO = Scene_Map.prototype.createDisplayObjects;
  Scene_Map.prototype.createDisplayObjects = function(){
    _SM_createDO.call(this);
    this.createTCHud();
  };
  Scene_Map.prototype.createTCHud = function(){
    this._tcHud = new Window_TerritoryHUD(new Rectangle(0,0, 320, 64));
    this.addWindow(this._tcHud);
    this.positionTCHud();
    this._tcHud.visible = !!($gameSystem?._tc?.hud);
  };
  Scene_Map.prototype.positionTCHud = function(){
    const w = this._tcHud.width, h = this._tcHud.height, ox=HUD_OX, oy=HUD_OY;
    const a = HUD_ANCHOR;
    if (a==='tl'){ this._tcHud.x = ox; this._tcHud.y = oy; }
    if (a==='tr'){ this._tcHud.x = Graphics.boxWidth - w - ox; this._tcHud.y = oy; }
    if (a==='bl'){ this._tcHud.x = ox; this._tcHud.y = Graphics.boxHeight - h - oy; }
    if (a==='br'){ this._tcHud.x = Graphics.boxWidth - w - ox; this._tcHud.y = Graphics.boxHeight - h - oy; }
  };

  // --- HUD value resolver (owner or top) ---
  function computeOwnerTopValues(tid){
    let mainV = 0, otherV = 0;
    if (!tid) return { mainV, otherV };
    const mode = ($gameSystem?._tc?.barMode) || HUD_BAR_MODE;

    const t = territoryData(tid) || { inf:{} };
    const inf = t.inf || {};
    const ownId = getOwner(tid) || '';

    if (mode === 'owner' && ownId){
      const ownerV = Number(inf[ownId] || 0);
      const others = Object.entries(inf)
        .filter(([k]) => k !== ownId)
        .map(([,v]) => Number(v || 0))
        .sort((a,b) => b - a);
      const snd = others[0] || 0;
      mainV = ownerV; otherV = snd;
    } else {
      const stats = topTwo(tid);
      mainV = Number(stats.topV || 0);
      otherV = Number(stats.sndV || 0);
    }
    return { mainV, otherV };
  }

  // HUD window
  function Window_TerritoryHUD(){ this.initialize(...arguments); }
  Window_TerritoryHUD.prototype = Object.create(Window_Base.prototype);
  Window_TerritoryHUD.prototype.constructor = Window_TerritoryHUD;
  Window_TerritoryHUD.prototype.initialize = function(rect){
    Window_Base.prototype.initialize.call(this, rect);
    this.opacity = (HUD_THEME==='classic') ? 160 : 0;
    this.contents.fontSize = HUD_FS;
    this._lastKey = '';
  };
  Window_TerritoryHUD.prototype.computeSize = function(){
    const w = Math.max((HUD_W || 0), 320);
    // 2 rows of text + bar + padding
    const h = Math.ceil(6 + this.lineHeight()*2 + HUD_BAR_H + 8 + this.padding*2);
    return new Rectangle(0,0,w,h);
  };
  Window_TerritoryHUD.prototype.drawEdge = function(){
    if (HUD_THEME!=='edge') return;
    const W = this.width - this.padding*2;
    const H = this.height - this.padding*2;
    const c = this.contents;
    c.fillRect(0,0,W,H,'rgba(0,0,0,0.55)');
    if (HUD_BORDER>0){
      c.fillRect(0,0,W,HUD_BORDER,'#FFFFFF');
      c.fillRect(0,H-HUD_BORDER,W,HUD_BORDER,'#FFFFFF');
      c.fillRect(0,0,HUD_BORDER,H,'#FFFFFF');
      c.fillRect(W-HUD_BORDER,0,HUD_BORDER,H,'#FFFFFF');
    }
  };
  Window_TerritoryHUD.prototype.refreshNow = function(){
    const box = this.computeSize();
    const needsResize = (this.width !== box.width || this.height !== box.height);
    this.width  = box.width;
    this.height = box.height;
    if (needsResize) this.createContents();

    this.contents.clear();
    this.drawEdge();

    const tid   = getCurrentTerritoryId();
    const ownId = tid ? getOwner(tid) : '';
    const name  = tid ? displayName(tid) : '—';
    const ownerText = ownId ? displayName(ownId) : '—';

    // Title
    const pad = 6;
    this.changeTextColor(ColorManager.systemColor());
    this.drawText(`Territory: ${name}`, pad, 2, this.contents.width - pad*2, 'left');
    this.resetTextColor();

    // Owner line
    const y0 = 2 + this.lineHeight();
    this.drawText(`Owner: ${ownerText}`, pad, y0, this.contents.width - pad*2, 'left');

    // Values for the bar based on mode
    const vals = computeOwnerTopValues(tid);
    const mainV = vals.mainV, otherV = vals.otherV;

    const lead = Math.max(0, mainV - Math.max(0, otherV));
    const pct  = Math.max(0, Math.min(1, Math.abs(mainV) / Math.max(1, THRESH)));

    // Bar
    const barW = Math.floor(this.contents.width * 0.60);
    const barX = pad;
    const barY = y0 + Math.floor(this.lineHeight() * 0.75);

    this.contents.fillRect(barX, barY, barW, HUD_BAR_H, 'rgba(255,255,255,0.18)');
    const fill = Math.floor(barW * pct);
    this.contents.gradientFillRect(barX, barY, fill, HUD_BAR_H, '#55FF88', '#33AA66', false);

    this.changeTextColor(ColorManager.textColor(6));
    this.drawText(`${Math.floor(mainV)} (lead ${Math.floor(lead)})`,
      barX + barW + 10, barY - 2, this.contents.width - (barX + barW + 10) - pad, 'left');
    this.resetTextColor();
  };
  Window_TerritoryHUD.prototype.refreshIfNeeded = function(){
    const tid   = getCurrentTerritoryId() || 'none';
    const ownId = getOwner(tid) || '';
    const vals  = computeOwnerTopValues(tid);
    const mainV = vals.mainV, otherV = vals.otherV;

    const mode  = ($gameSystem?._tc?.barMode) || HUD_BAR_MODE;
    const key = `${tid}|owner:${ownId}|mode:${mode}|${Math.floor(mainV)}|${Math.floor(otherV)}|${HUD_FS}|${HUD_BAR_H}|${HUD_THEME}`;
    if (key !== this._lastKey){
      this._lastKey = key;
      this.refreshNow();
    }
  };

  // Escape codes
  const _WB_conv = Window_Base.prototype.convertEscapeCharacters;
  Window_Base.prototype.convertEscapeCharacters = function(text){
    let t = _WB_conv.call(this, text);
    try{
      const tid = getCurrentTerritoryId();
      t = t.replace(/<showOwner>/gi, displayName(getOwner(tid)));
      t = t.replace(/<showOwnerId>/gi, String(getOwner(tid)||''));
      t = t.replace(/<showTerritoryId>/gi, String(tid||''));
    } catch(_){}
    return t;
  };

  // Shop price bias (safe)
  const _WSB_price = Window_ShopBuy.prototype.price;
  Window_ShopBuy.prototype.price = function(item){
    let price = (typeof _WSB_price === 'function') ? _WSB_price.call(this, item) : (item?.price ?? 0);
    if (_tcShopMod) price = Math.floor(price * (1 + _tcShopMod));
    return price;
  };
  const _SS_pop = Scene_Shop.prototype.popScene;
  Scene_Shop.prototype.popScene = function(){
    if (typeof _SS_pop === 'function') _SS_pop.call(this);
    _tcShopMod = 0;
  };

  // Commands
  PluginManager.registerCommand(PN, 'setOwner', args => setOwner(s(args.territoryId), s(args.ownerId)));
  PluginManager.registerCommand(PN, 'addInfluence', args => addInfluence(s(args.territoryId), s(args.entityId), n(args.value)));
  PluginManager.registerCommand(PN, 'setInfluence', args => setInfluence(s(args.territoryId), s(args.entityId), n(args.value)));
  PluginManager.registerCommand(PN, 'bindMap', args => {
    const mid = n(args.mapId||0), tid = s(args.territoryId);
    if (mid>0 && tid) $gameSystem._tc.maps[mid] = tid;
  });
  PluginManager.registerCommand(PN, 'showHud',  () => { $gameSystem._tc.hud = true;  });
  PluginManager.registerCommand(PN, 'hideHud',  () => { $gameSystem._tc.hud = false; });
  PluginManager.registerCommand(PN, 'toggleHud',() => { $gameSystem._tc.hud = !$gameSystem._tc.hud; });

  PluginManager.registerCommand(PN, 'setHudBarMode', args => {
    const m = s(args.mode||'owner');
    if (m==='owner' || m==='top') $gameSystem._tc.barMode = m;
  });
  PluginManager.registerCommand(PN, 'toggleHudBarMode', () => {
    const cur = ($gameSystem?._tc?.barMode) || HUD_BAR_MODE;
    $gameSystem._tc.barMode = (cur === 'owner') ? 'top' : 'owner';
  });

  // Expose small API
  if (typeof window!=='undefined'){
    window.TC_getOwner = (mapId=null)=>{
      const tid = (mapId? getTerritoryIdForMap(mapId) : getCurrentTerritoryId());
      return getOwner(tid);
    };
    window.TC_getTerritoryIdForMap = getTerritoryIdForMap;
    window.TC_addInfluence = addInfluence;
    window.TC_setInfluence = setInfluence;
    window.TC_setOwner = setOwner;
  }
})();
