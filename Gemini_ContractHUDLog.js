//=============================================================================
// Gemini_ContractHUDLog.js  v0.3.1
// Contract Log (scene) + Map HUD for BountyBoard contracts
// - Works with Gemini_BountyBoard (v0.3.x+)
// - Custom HUD colors + "edge" theme, clipping fix
// - Active counter + map hotkeys (Q/W) to cycle + HUD cycle hints
// - NEW v0.3.1: HUD Side override (left/right) to quickly flip HUD horizontally
//=============================================================================
/*:
 * @target MZ
 * @plugindesc v0.3.1 Contract Log + HUD for BountyBoard (track progress, details, toasts) + counter + hotkey cycling + HUD side override
 * @author Gemini
 *
 * @help
 * REQUIREMENTS
 * - Place AFTER Gemini_BountyBoard.js
 *
 * NEW IN 0.3.1
 * - HUD Side (left/right/auto) parameter to flip HUD horizontally without touching anchors.
 *   Top/bottom still comes from your anchor (tl/tr/bl/br).
 *
 * ESCAPE CODES
 * - <showTrackedName> , <showTrackedProgress>
 * - <showActiveCount> , <showActiveTotal> , <showActiveIndex>
 *
 * @param ---HUD---
 * @default
 *
 * @param enableHud
 * @parent ---HUD---
 * @text Enable HUD
 * @type boolean
 * @default true
 *
 * @param showHudOnlyWhenTracked
 * @parent ---HUD---
 * @text Show HUD Only When Tracked
 * @type boolean
 * @default true
 *
 * @param showHudInBattle
 * @parent ---HUD---
 * @text Show HUD in Battle
 * @type boolean
 * @default false
 *
 * @param hudTheme
 * @parent ---HUD---
 * @text HUD Theme
 * @type select
 * @option classic
 * @option edge
 * @default classic
 *
 * @param hudSideOverride
 * @parent ---HUD---
 * @text HUD Side (override X)
 * @type select
 * @option auto
 * @option left
 * @option right
 * @default auto
 *
 * @param hudFontSize
 * @parent ---HUD---
 * @text HUD Font Size
 * @type number
 * @default 20
 *
 * @param hudLineHeight
 * @parent ---HUD---
 * @text HUD Line Height (0=auto)
 * @type number
 * @default 0
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
 * @default 12
 *
 * @param hudAnchor
 * @parent ---HUD---
 * @text HUD Anchor
 * @type select
 * @option tl
 * @option tr
 * @option bl
 * @option br
 * @default tl
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
 * @param hudBgOpacity
 * @parent ---HUD---
 * @text Background Opacity (classic only)
 * @type number
 * @min 0
 * @max 255
 * @default 160
 *
 * @param hudEdgeBorder
 * @parent ---HUD---
 * @text Edge Border (px)
 * @type number
 * @default 2
 *
 * @param hudPad
 * @parent ---HUD---
 * @text HUD Inner Padding
 * @type number
 * @default 8
 *
 * @param ---HUD Colors---
 * @text HUD Colors (CSS hex or names; blank=defaults)
 * @default
 *
 * @param hudTextColor
 * @parent ---HUD Colors---
 * @text Text Color
 * @type string
 * @default 
 *
 * @param hudBgColor
 * @parent ---HUD Colors---
 * @text BG Color (edge theme)
 * @type string
 * @default rgba(0,0,0,0.55)
 *
 * @param hudBorderColor
 * @parent ---HUD Colors---
 * @text Border Color (edge theme)
 * @type string
 * @default #FFFFFF
 *
 * @param hudBarBackColor
 * @parent ---HUD Colors---
 * @text Bar Back Color
 * @type string
 * @default rgba(255,255,255,0.18)
 *
 * @param hudBarFill1Color
 * @parent ---HUD Colors---
 * @text Bar Fill Start
 * @type string
 * @default #55FF88
 *
 * @param hudBarFill2Color
 * @parent ---HUD Colors---
 * @text Bar Fill End
 * @type string
 * @default #33AA66
 *
 * @param ---Behavior---
 * @default
 *
 * @param autoTrackNewest
 * @parent ---Behavior---
 * @text Auto-Track Newly Accepted
 * @type boolean
 * @default true
 *
 * @param milestoneToasts
 * @parent ---Behavior---
 * @text Milestone Toasts (on progress)
 * @type boolean
 * @default true
 *
 * @param useShownNames
 * @parent ---Behavior---
 * @text Use TownReputation Shown Names
 * @type boolean
 * @default true
 *
 * @param ---Counter & Cycling---
 * @default
 *
 * @param showActiveCounter
 * @parent ---Counter & Cycling---
 * @text Show Active Counter on HUD
 * @type boolean
 * @default true
 *
 * @param counterFormat
 * @parent ---Counter & Cycling---
 * @text Counter Format (use {idx} {total})
 * @type string
 * @default {idx}/{total}
 *
 * @param showCycleHints
 * @parent ---Counter & Cycling---
 * @text Show Cycle Hints on HUD
 * @type boolean
 * @default true
 *
 * @param cycleHintText
 * @parent ---Counter & Cycling---
 * @text Cycle Hint Text
 * @type string
 * @default [Q/W]
 *
 * @param enableMapCycleKeys
 * @parent ---Counter & Cycling---
 * @text Enable Map Cycle Keys (Q/W)
 * @type boolean
 * @default true
 *
 * @command openLog
 * @text Open Contract Log
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
 * @command trackById
 * @text Track Contract by ID
 * @arg id
 * @type string
 * @default
 *
 * @command trackNext
 * @text Track Next Active
 *
 * @command trackPrev
 * @text Track Previous Active
 *
 * @command setAutoTrack
 * @text Set Auto-Track Newly Accepted
 * @arg on
 * @type boolean
 * @default true
 *
 * @command setMilestoneToasts
 * @text Set Milestone Toasts
 * @arg on
 * @type boolean
 * @default true
 *
 * @command setHudAnchor
 * @text Set HUD Anchor
 * @arg anchor
 * @type select
 * @option tl
 * @option tr
 * @option bl
 * @option br
 * @default tl
 *
 * @command setHudOffsets
 * @text Set HUD Offsets
 * @arg x
 * @type number
 * @default 12
 * @arg y
 * @type number
 * @default 12
 *
 * @command setHudFontSize
 * @text Set HUD Font Size
 * @arg size
 * @type number
 * @default 20
 */

(() => {
  "use strict";
  const PN = "Gemini_ContractHUDLog";
  const P  = PluginManager.parameters(PN);

  // guards / helpers
  if (typeof Window_Base.prototype.textPadding !== 'function'){
    Window_Base.prototype.textPadding = function(){ return (typeof this.itemPadding==='function') ? this.itemPadding() : 6; };
  }
  const s=x=>String(x??"").trim();
  const n=x=>Number(x??0);
  const b=x=>String(x??"false")==="true";
  const css = (v, d)=>s(v||d);

  // params
  const ENABLE_HUD   = b(P.enableHud||"true");
  const HUD_ONLY_TRK = b(P.showHudOnlyWhenTracked||"true");
  const HUD_BATTLE   = b(P.showHudInBattle||"false");
  const HUD_THEME    = s(P.hudTheme||"classic"); // classic|edge
  const HUD_SIDE     = s(P.hudSideOverride||"auto"); // auto|left|right

  const HUD_FS       = n(P.hudFontSize||20);
  const HUD_LH       = n(P.hudLineHeight||0);
  const HUD_W        = n(P.hudWidth||0);
  const HUD_BAR_H    = Math.max(6, n(P.hudBarHeight||12));
  const HUD_ANCHOR   = s(P.hudAnchor||"tl"); // still used for Y/top/bottom
  const HUD_OFFX     = n(P.hudOffsetX||12);
  const HUD_OFFY     = n(P.hudOffsetY||12);
  const HUD_BG_OP    = n(P.hudBgOpacity||160);
  const HUD_EDGE_BR  = Math.max(0, n(P.hudEdgeBorder||2));
  const HUD_PAD      = Math.max(0, n(P.hudPad||8));

  const COL_TEXT     = css(P.hudTextColor, '');
  const COL_BG_EDGE  = css(P.hudBgColor, 'rgba(0,0,0,0.55)');
  const COL_BORDER   = css(P.hudBorderColor, '#FFFFFF');
  const COL_BAR_BACK = css(P.hudBarBackColor, 'rgba(255,255,255,0.18)');
  const COL_BAR_1    = css(P.hudBarFill1Color, '#55FF88');
  const COL_BAR_2    = css(P.hudBarFill2Color, '#33AA66');

  const AUTO_TRACK   = b(P.autoTrackNewest||"true");
  const TOASTS       = b(P.milestoneToasts||"true");
  const USE_SHOWN    = b(P.useShownNames||"true");

  // counter/cycle
  const SHOW_COUNTER = b(P.showActiveCounter||"true");
  const COUNTER_FMT  = s(P.counterFormat||"{idx}/{total}");
  const SHOW_HINTS   = b(P.showCycleHints||"true");
  const HINT_TEXT    = s(P.cycleHintText||"[Q/W]");
  const MAP_KEYS     = b(P.enableMapCycleKeys||"true");

  const nice = id => {
    if (!id) return "";
    try { if (USE_SHOWN && typeof TR_getDisplayName === 'function') return TR_getDisplayName(id); } catch(_){}
    return String(id);
  };

  // board access
  function boardContracts(){ return ($gameSystem && Array.isArray($gameSystem._bbContracts)) ? $gameSystem._bbContracts : []; }
  function activeContracts(){ return boardContracts().filter(c => c.status==='accepted'); }
  function findContract(id){ return boardContracts().find(c => c.id === s(id)) || null; }

  function killCount(tag){
    if (!$gameSystem || !$gameSystem._bbKill) return 0;
    return Math.max(0, Math.floor($gameSystem._bbKill[s(tag)]||0));
  }
  function invCountByTag(tag){
    tag = s(tag);
    let total = 0;
    const scan = db => {
      if (!db) return;
      for (let i=1;i<db.length;i++){
        const it = db[i]; if (!it || !it.note) continue;
        const meta = it.meta && (it.meta['contract tag'] || it.meta['contracttag']);
        if (meta && s(meta)===tag) total += $gameParty.numItems(it);
        else {
          const m = it.note.match(/<contract\s+tag:\s*([^>]+)>/i);
          if (m && s(m[1])===tag) total += $gameParty.numItems(it);
        }
      }
    };
    scan($dataItems); scan($dataWeapons); scan($dataArmors);
    return total;
  }
  const hasBW = () => (typeof $gameSystem?.getWanted === 'function');
  const getWantedSafe = (entityId, scope) => (hasBW() ? $gameSystem.getWanted(entityId, scope||'faction') : 0);

  function contractProgress(c){
    if (!c) return {have:0, need:1, text:"0/1", pct:0};
    if (c.type==='hunt'){
      const have = killCount(c.tagOrTarget);
      const need = Math.max(1, n(c.goal||1));
      const clamped = Math.min(have, need);
      return { have: clamped, need, text: `${clamped}/${need}`, pct: Math.max(0, Math.min(1, clamped/need)) };
    } else if (c.type==='recovery'){
      const have = invCountByTag(c.tagOrTarget);
      const need = Math.max(1, n(c.goal||1));
      const clamped = Math.min(have, need);
      return { have: clamped, need, text: `${clamped}/${need}`, pct: Math.max(0, Math.min(1, clamped/need)) };
    } else { // cleanup
      const goal = Math.max(0, n(c.goal||0));
      const now  = getWantedSafe(c.tagOrTarget, c.cleanupScope);
      const pct  = (goal<=0) ? (now<=0 ? 1 : 0) : Math.max(0, Math.min(1, 1 - Math.max(0, now-goal)/Math.max(1, goal)));
      const text = `Wanted ≤ ${goal} (now ${now})`;
      return { have: Math.max(0, goal - Math.max(0, now-goal)), need: goal, text, pct };
    }
  }

  function toast(txt){
    try{
      if (SceneManager._scene && typeof Scene_Map.prototype.addRepToast === 'function') SceneManager._scene.addRepToast(txt);
      else if ($gameMessage && $gameMessage.add) $gameMessage.add(txt);
    }catch(_){}
  }

  // System slots
  const _GS_init = Game_System.prototype.initialize;
  Game_System.prototype.initialize = function(){
    _GS_init.call(this);
    this._bbHudVisible   = (this._bbHudVisible!==undefined) ? this._bbHudVisible : ENABLE_HUD;
    this._bbTrackedId    = this._bbTrackedId || "";
    this._bbHudAnchor    = this._bbHudAnchor || HUD_ANCHOR;
    this._bbHudOffX      = (this._bbHudOffX!==undefined) ? this._bbHudOffX : HUD_OFFX;
    this._bbHudOffY      = (this._bbHudOffY!==undefined) ? this._bbHudOffY : HUD_OFFY;
    this._bbHudFontSize  = (this._bbHudFontSize||HUD_FS);
    this._bbAutoTrack    = (this._bbAutoTrack!==undefined) ? this._bbAutoTrack : AUTO_TRACK;
    this._bbMilestone    = (this._bbMilestone!==undefined) ? this._bbMilestone : TOASTS;
    this._bbLastAccept   = this._bbLastAccept || {};
    this._bbLastProg     = this._bbLastProg || {};
  };

  // Commands
  PluginManager.registerCommand(PN,"openLog", ()=> SceneManager.push(Scene_ContractLog));
  PluginManager.registerCommand(PN,"showHud", ()=> { $gameSystem._bbHudVisible = true; });
  PluginManager.registerCommand(PN,"hideHud", ()=> { $gameSystem._bbHudVisible = false; });
  PluginManager.registerCommand(PN,"toggleHud", ()=> { $gameSystem._bbHudVisible = !$gameSystem._bbHudVisible; });
  PluginManager.registerCommand(PN,"trackById", args => {
    const id = s(args.id||'');
    if (findContract(id)) $gameSystem._bbTrackedId = id;
  });
  function cycleTrack(dir){
    const list = activeContracts();
    if (!list.length) return;
    const cur = s($gameSystem._bbTrackedId||'');
    let idx = list.findIndex(c=>c.id===cur);
    if (idx<0) idx = 0;
    idx = (idx + dir + list.length) % list.length;
    $gameSystem._bbTrackedId = list[idx].id;
  }
  PluginManager.registerCommand(PN,"trackNext", ()=>cycleTrack(+1));
  PluginManager.registerCommand(PN,"trackPrev", ()=>cycleTrack(-1));
  PluginManager.registerCommand(PN,"setAutoTrack", args => { $gameSystem._bbAutoTrack = b(args.on||"true"); });
  PluginManager.registerCommand(PN,"setMilestoneToasts", args => { $gameSystem._bbMilestone = b(args.on||"true"); });
  PluginManager.registerCommand(PN,"setHudAnchor", args => {
    const a = s(args.anchor||'tl');
    if (['tl','tr','bl','br'].includes(a)) $gameSystem._bbHudAnchor = a;
  });
  PluginManager.registerCommand(PN,"setHudOffsets", args => {
    $gameSystem._bbHudOffX = n(args.x||0);
    $gameSystem._bbHudOffY = n(args.y||0);
  });
  PluginManager.registerCommand(PN,"setHudFontSize", args => {
    $gameSystem._bbHudFontSize = Math.max(10, n(args.size||16));
  });

  // Escape codes
  const _WB_conv = Window_Base.prototype.convertEscapeCharacters;
  Window_Base.prototype.convertEscapeCharacters = function(text){
    let t = _WB_conv.call(this, text);
    try{
      const id = s($gameSystem?._bbTrackedId || "");
      const c  = id ? findContract(id) : null;
      t = t.replace(/<showTrackedName>/gi, c ? c.name : "—");
      const pr = c ? contractProgress(c) : null;
      t = t.replace(/<showTrackedProgress>/gi, pr ? pr.text : "—");
      const list = activeContracts();
      const total = list.length;
      const idx = (c ? (list.findIndex(x=>x.id===c.id)+1) : 0);
      t = t.replace(/<showActiveCount>/gi, String(total));
      t = t.replace(/<showActiveTotal>/gi, String(total));
      t = t.replace(/<showActiveIndex>/gi, String(Math.max(0, idx)));
    }catch(_){}
    return t;
  };

  // HUD Window
  function Window_ContractHUD(){ this.initialize(...arguments); }
  Window_ContractHUD.prototype = Object.create(Window_Base.prototype);
  Window_ContractHUD.prototype.constructor = Window_ContractHUD;
  Window_ContractHUD.prototype.initialize = function(rect){
    Window_Base.prototype.initialize.call(this, rect);
    this._theme = HUD_THEME;
    this._pad   = HUD_PAD;
    this.contents.fontSize = $gameSystem._bbHudFontSize || HUD_FS;
    this.opacity = (this._theme==='classic') ? HUD_BG_OP : 0;
    this._lastKey = "";
  };
  Window_ContractHUD.prototype.innerPad = function(){ return this._pad; };
  Window_ContractHUD.prototype.computeSize = function(){
    const lh = (HUD_LH>0 ? HUD_LH : Math.max(24, this.contents.fontSize + 6));
    const rows = 1 + 1; // title/counter + progress line
    const textBlock = rows * lh;
    const barBlock  = HUD_BAR_H + 6;
    const h = textBlock + barBlock + this._pad*2;
    const w = Math.max(HUD_W||0, 360);
    return new Rectangle(0, 0, w, h);
  };
  Window_ContractHUD.prototype.drawEdgePanel = function(){
    if (this._theme!=='edge') return;
    const ctx = this.contents;
    const W = this.width - this.padding*2;
    const H = this.height - this.padding*2;
    ctx.fillRect(0, 0, W, H, COL_BG_EDGE);
    if (HUD_EDGE_BR>0){
      ctx.fillRect(0, 0, W, HUD_EDGE_BR, '#00000000'); // clear fallback
      ctx.fillRect(0, 0, W, HUD_EDGE_BR, COL_BORDER);
      ctx.fillRect(0, H-HUD_EDGE_BR, W, HUD_EDGE_BR, COL_BORDER);
      ctx.fillRect(0, 0, HUD_EDGE_BR, H, COL_BORDER);
      ctx.fillRect(W-HUD_EDGE_BR, 0, HUD_EDGE_BR, H, COL_BORDER);
    }
  };
  Window_ContractHUD.prototype.makeCounterText = function(c){
    const list = activeContracts();
    const total = list.length;
    const idx = c ? (list.findIndex(x=>x.id===c.id)+1) : 0;
    return COUNTER_FMT.replace('{idx}', String(Math.max(0, idx))).replace('{total}', String(total));
  };
  Window_ContractHUD.prototype.refreshNow = function(){
    this.contents.clear();
    const rect = this.computeSize();
    this.width = rect.width;
    this.height = rect.height;

    const id = s($gameSystem._bbTrackedId||'');
    const c  = id ? findContract(id) : null;

    // BG + border for edge
    this.drawEdgePanel();

    const pad = this._pad;
    const fh = (HUD_LH>0 ? HUD_LH : Math.max(24, this.contents.fontSize + 6));
    const textColor = COL_TEXT || ColorManager.normalColor();

    if (!c){
      this.changeTextColor(textColor);
      this.drawText("—", pad, pad, this.contents.width - pad*2, 'left');
      this.resetTextColor();
      return;
    }

    const pr = contractProgress(c);

    // Title (left) + Counter (right)
    this.changeTextColor(textColor);
    this.drawText(c.name, pad, pad, Math.floor(this.contents.width*0.6), 'left');
    if (SHOW_COUNTER){
      const counter = this.makeCounterText(c);
      this.changeTextColor(ColorManager.textColor(6)); // accent
      this.drawText(counter, pad, pad, this.contents.width - pad*2, 'right');
      this.resetTextColor();
    } else {
      this.resetTextColor();
    }

    // Progress bar
    const barY = pad + fh + 4;
    const barX = pad;
    const barW = Math.floor(this.contents.width * 0.60);
    const pct  = Math.max(0, Math.min(1, pr.pct));
    this.contents.fillRect(barX, barY, barW, HUD_BAR_H, COL_BAR_BACK);
    const fill = Math.floor(barW * pct);
    this.contents.gradientFillRect(barX, barY, fill, HUD_BAR_H, COL_BAR_1, COL_BAR_2);

    // Progress text + Cycle hint (right)
    const txX = barX + barW + 10;
    const txY = pad + fh; // second line baseline
    this.changeTextColor(textColor);
    this.drawText(pr.text, txX, txY, this.contents.width - txX - pad, 'left');
    if (SHOW_HINTS && activeContracts().length > 1){
      this.changeTextColor(ColorManager.textColor(7));
      this.drawText(HINT_TEXT, txX, txY, this.contents.width - txX - pad, 'right');
      this.resetTextColor();
    } else {
      this.resetTextColor();
    }
  };
  Window_ContractHUD.prototype.refreshIfNeeded = function(){
    this.contents.fontSize = $gameSystem._bbHudFontSize || HUD_FS;
    const id = s($gameSystem._bbTrackedId||'');
    const c  = id ? findContract(id) : null;
    const pr = c ? contractProgress(c) : null;
    const listLen = activeContracts().length;
    const counter = c ? this.makeCounterText(c) : "0/0";
    const key = c ? `${c.id}|${pr.text}|${this.contents.fontSize}|${HUD_BAR_H}|${HUD_THEME}|${listLen}|${counter}` : `none|${this.contents.fontSize}|${HUD_BAR_H}|${HUD_THEME}|${listLen}`;
    if (key !== this._lastKey){
      this._lastKey = key;
      this.refreshNow();
    }
  };

  // Scene_Map hook
  const _SM_createDO = Scene_Map.prototype.createDisplayObjects;
  Scene_Map.prototype.createDisplayObjects = function(){
    _SM_createDO.call(this);
    this.createContractHUD();
  };
  Scene_Map.prototype.createContractHUD = function(){
    const rect = new Rectangle(0,0, 360, 96);
    this._bbHud = new Window_ContractHUD(rect);
    this.addWindow(this._bbHud);
    this.positionHUD();
    this.updateHudVisibility();
  };
  Scene_Map.prototype.positionHUD = function(){
    if (!this._bbHud) return;
    const need = this._bbHud.computeSize();
    this._bbHud.width  = need.width;
    this._bbHud.height = need.height;

    // vertical (top/bottom) still from anchor
    const a = s($gameSystem._bbHudAnchor||HUD_ANCHOR);
    const oy = n($gameSystem._bbHudOffY||HUD_OFFY);
    const h = this._bbHud.height;
    if (a==='tl' || a==='tr'){ this._bbHud.y = oy; }
    else { this._bbHud.y = Graphics.boxHeight - h - oy; }

    // horizontal from HUD_SIDE override (if set), else anchor
    const ox = n($gameSystem._bbHudOffX||HUD_OFFX);
    const w = this._bbHud.width;
    const side = (HUD_SIDE==='left' || HUD_SIDE==='right') ? HUD_SIDE : ((a==='tl'||a==='bl') ? 'left' : 'right');
    if (side==='left'){ this._bbHud.x = ox; }
    else { this._bbHud.x = Graphics.boxWidth - w - ox; }
  };
  Scene_Map.prototype.updateHudVisibility = function(){
    if (!this._bbHud) return;
    const globalOn = !!($gameSystem && $gameSystem._bbHudVisible && ENABLE_HUD);
    const tracked = s($gameSystem?._bbTrackedId||'');
    const hasTracked = tracked && !!findContract(tracked);
    const battle = !!$gameParty?.inBattle?.();
    const allowBattle = !!HUD_BATTLE;
    const requireTracked = !!HUD_ONLY_TRK;
    const shouldShow = globalOn && (!battle || allowBattle) && (!requireTracked || hasTracked);
    this._bbHud.visible = shouldShow;
  };
  const _SM_update = Scene_Map.prototype.update;
  Scene_Map.prototype.update = function(){
    _SM_update.call(this);
    if (this._bbHud){
      this.positionHUD();
      this.updateHudVisibility();
      if (this._bbHud.visible) this._bbHud.refreshIfNeeded();
    }
    this._bbHudAutoTrackTick();
    this._bbHudMilestoneTick();
    this._bbHudCycleKeysTick();
  };
  Scene_Map.prototype._bbHudAutoTrackTick = function(){
    if (!$gameSystem || !$gameSystem._bbAutoTrack) return;
    const st = $gameSystem._bbLastAccept || {};
    let acceptedJustNow = null;
    for (const c of boardContracts()){
      const prev = st[c.id] || c.status;
      if (prev !== c.status && c.status==='accepted'){ acceptedJustNow = c; }
      st[c.id] = c.status;
    }
    $gameSystem._bbLastAccept = st;
    if (acceptedJustNow){
      $gameSystem._bbTrackedId = acceptedJustNow.id;
      if (this._bbHud) this._bbHud.refreshNow();
    }
  };
  Scene_Map.prototype._bbHudMilestoneTick = function(){
    if (!$gameSystem || !$gameSystem._bbMilestone) return;
    const lp = $gameSystem._bbLastProg || {};
    for (const c of activeContracts()){
      const pr = contractProgress(c);
      const key = c.id;
      const last = Math.max(0, Math.floor(lp[key]||0));
      const now  = Math.max(0, Math.floor(pr.have||0));
      if (now > last){
        const txt = (c.type==='cleanup') ? `${c.name}: ${pr.text}` : `${c.name}: ${now}/${pr.need}`;
        toast(txt);
      }
      lp[key] = now;
    }
    $gameSystem._bbLastProg = lp;
  };
  Scene_Map.prototype._bbHudCycleKeysTick = function(){
    if (!b(P.enableMapCycleKeys||"true")) return;
    if (!this._bbHud || !this._bbHud.visible) return;
    if (activeContracts().length <= 1) return;
    if (Input.isTriggered('pageup'))  { SoundManager.playCursor(); cycleTrack(-1); if (this._bbHud) this._bbHud.refreshNow(); }
    if (Input.isTriggered('pagedown')){ SoundManager.playCursor(); cycleTrack(+1); if (this._bbHud) this._bbHud.refreshNow(); }
  };

  // ----- Contract Log scene -----
  function Window_ContractTabs(){ this.initialize(...arguments); }
  Window_ContractTabs.prototype = Object.create(Window_HorzCommand.prototype);
  Window_ContractTabs.prototype.constructor = Window_ContractTabs;
  Window_ContractTabs.prototype.initialize = function(rect){
    Window_HorzCommand.prototype.initialize.call(this, rect);
    this._cat = 'accepted';
    this.select(0);
  };
  Window_ContractTabs.prototype.maxCols = function(){ return 2; };
  Window_ContractTabs.prototype.makeCommandList = function(){
    this.addCommand('Active','accepted');
    this.addCommand('Done','turnedin');
  };
  Window_ContractTabs.prototype.setCategory = function(cat){
    this._cat = cat; this.select(cat==='accepted'?0:1); this.callHandler('change');
  };
  Window_ContractTabs.prototype.currentCategory = function(){ return this._cat; };

  function Window_ContractList(){ this.initialize(...arguments); }
  Window_ContractList.prototype = Object.create(Window_Selectable.prototype);
  Window_ContractList.prototype.constructor = Window_ContractList;
  Window_ContractList.prototype.initialize = function(rect){
    Window_Selectable.prototype.initialize.call(this, rect);
    this._cat = 'accepted';
    this.refresh(); this.select(0); this.activate();
  };
  Window_ContractList.prototype.setCategory = function(cat){
    if (this._cat!==cat){ this._cat = cat; this.refresh(); this.select(0); }
  };
  function boardData(){ return boardContracts(); }
  Window_ContractList.prototype.data = function(){ return boardData().filter(c => c.status===this._cat); };
  Window_ContractList.prototype.maxItems = function(){ return this.data().length; };
  Window_ContractList.prototype.item = function(){ return this.data()[this.index()]||null; };
  Window_ContractList.prototype.drawItem = function(index){
    const c = this.data()[index]; if (!c) return;
    const r = this.itemRect(index);
    const lh = this.lineHeight();
    const pr = contractProgress(c);
    const status = (c.status==='accepted')?'[ACTIVE]':'[DONE]';
    this.changeTextColor(ColorManager.systemColor());
    this.drawText(`${c.name} ${status}`, r.x+this.textPadding(), r.y, r.width-this.textPadding()*2, 'left');
    this.resetTextColor();
    this.drawText(pr.text, r.x+this.textPadding(), r.y+lh, r.width-this.textPadding()*2, 'left');
  };

  function Window_ContractHelp(){ this.initialize(...arguments); }
  Window_ContractHelp.prototype = Object.create(Window_Base.prototype);
  Window_ContractHelp.prototype.constructor = Window_ContractHelp;
  Window_ContractHelp.prototype.initialize = function(rect){ Window_Base.prototype.initialize.call(this, rect); };
  Window_ContractHelp.prototype.setContract = function(c){
    this.contents.clear();
    if (!c){ this.drawText("No contract.", this.textPadding(), 0, this.contents.width, 'left'); return; }
    const pad = this.textPadding(), w = this.contents.width - pad*2;
    const pr = contractProgress(c);
    this.changeTextColor(ColorManager.systemColor());
    this.drawText(c.name, pad, 0, w, 'left');
    this.resetTextColor();
    let y = this.lineHeight();
    let goalTxt = '';
    if (c.type==='hunt') goalTxt = `Goal: Defeat ${c.goal} × ${c.tagOrTarget}`;
    else if (c.type==='recovery') goalTxt = `Goal: Obtain ${c.goal} × ${c.tagOrTarget}`;
    else goalTxt = `Goal: Wanted(${nice(c.tagOrTarget)}/${c.cleanupScope}) ≤ ${c.goal}`;
    this.drawText(goalTxt, pad, y, w, 'left'); y += this.lineHeight();
    this.drawText(`Progress: ${pr.text}`, pad, y, w, 'left'); y += this.lineHeight();
    const rwd = c.reward || {};
    const bits = [];
    if (rwd.gold>0) bits.push(`${rwd.gold}g`);
    (rwd.rep||[]).forEach(r => bits.push(`Rep ${nice(r.entityId)} ${r.repType} ${r.delta>0?'+':''}${r.delta}`));
    if (rwd.wantedClear && rwd.wantedTarget) bits.push(`Clear Wanted(${nice(rwd.wantedTarget)}/${rwd.wantedScope})`);
    else if (rwd.wantedDelta && rwd.wantedTarget) bits.push(`Wanted(${nice(rwd.wantedTarget)}/${rwd.wantedScope}) ${rwd.wantedDelta}`);
    if (rwd.commonEventId>0) bits.push(`CommonEvent #${rwd.commonEventId}`);
    this.drawText(`Rewards: ${bits.length?bits.join(' , '):'—'}`, pad, y, w, 'left'); y += this.lineHeight();
    if (c.status==='accepted'){
      this.changeTextColor(ColorManager.textColor(7));
      this.drawText("OK: Track on HUD", pad, y, w, 'left');
      this.resetTextColor();
    }
  };

  function Scene_ContractLog(){ this.initialize.apply(this, arguments); }
  Scene_ContractLog.prototype = Object.create(Scene_MenuBase.prototype);
  Scene_ContractLog.prototype.constructor = Scene_ContractLog;
  Scene_ContractLog.prototype.create = function(){
    Scene_MenuBase.prototype.create.call(this);
    const top = this.mainAreaTop();
    const tabH = this.calcWindowHeight(1, false);
    const helpH = this.calcWindowHeight(3, false);
    const listY = top + tabH + helpH;
    const listH = Graphics.boxHeight - listY;

    this._tabs = new Window_ContractTabs(new Rectangle(0, top, Graphics.boxWidth, tabH));
    this._tabs.setHandler('change', this.onTabChange.bind(this));
    this._tabs.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._tabs);

    this._help = new Window_ContractHelp(new Rectangle(0, top+tabH, Graphics.boxWidth, helpH));
    this.addWindow(this._help);

    this._list = new Window_ContractList(new Rectangle(0, listY, Graphics.boxWidth, listH));
    this._list.setHandler('ok', this.onOk.bind(this));
    this._list.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._list);

    const sc = this, li = this._list, baseUpdate = li.update.bind(li);
    li.update = function(){ baseUpdate(); if (sc._help) sc._help.setContract(li.item()); };
  };
  Scene_ContractLog.prototype.start = function(){
    Scene_MenuBase.prototype.start.call(this);
    this._list.refresh(); this._list.select(0); this._list.activate();
    if (this._help) this._help.setContract(this._list.item());
  };
  Scene_ContractLog.prototype.onTabChange = function(){ this._list.setCategory(this._tabs.currentSymbol()); };
  Scene_ContractLog.prototype.onOk = function(){
    const c = this._list.item();
    if (c && c.status==='accepted'){ $gameSystem._bbTrackedId = c.id; SoundManager.playOk(); }
    else { SoundManager.playBuzzer(); }
    this._list.activate();
  };

  if (typeof window!=='undefined'){ window.Scene_ContractLog = Scene_ContractLog; }

})();
