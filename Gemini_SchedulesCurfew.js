//=============================================================================
// Gemini_SchedulesCurfew.js v0.1.0
// Time-of-day business hours + Curfew (Wanted integration)
// - Event "open hours" with auto "Closed" blocking
// - Rep requirement for entry
// - Curfew per map: adds Wanted over time unless exempt by rep/permit
//=============================================================================
/*:
 * @target MZ
 * @plugindesc v0.1.0 Business hours + Curfew integrated with Wanted & Rep
 * @author Gemini
 *
 * @help
 * QUICK START:
 * - Put comment tags on the event page you want to protect:
 * <open hours: 8-18>
 * <rep open req: TownGuards >= 20 type:default>
 *
 * - In a map's note (Map Properties → Note), enable a curfew:
 * <curfew: start:22 end:6 authority: TownGuards scope:faction warnCE:7
 * wanted:+2 tick:5 repExemptMin:50 type:default permitSwitch:21>
 *
 * TIME SOURCE:
 * - If `timeHourVarId` > 0, reads $gameVariables[timeHourVarId] (0..23).
 * - Else uses system clock (new Date().getHours()).
 *
 * PLUGIN COMMANDS:
 * - SetTimeHour hour
 * - CheckEventOpen eventId switchId
 *
 * COMMENT TAGS (Event Page):
 * - <open hours: 8-18>
 * -> Open from hour 8 up to 18 (6 PM). Overnight supported, e.g., 22-6
 * - <rep open req: ENTITY OP VALUE [type:xxx]>
 * -> Block interaction unless rep condition passes (>=,>,<=,<,=)
 *
 * MAP NOTE TAG (Map Properties → Note):
 * - <curfew: start:22 end:6 authority: TownGuards scope:faction warnCE:7
 * wanted:+2 tick:5 repExemptMin:50 type:default permitSwitch:21>
 * start/end -> curfew hours (overnight OK, e.g., 22..6)
 * authority -> entity ID for Wanted (TownGuards, etc.)
 * scope -> faction | location
 * warnCE -> common event to run one-time when you enter curfew state
 * wanted -> delta per tick during curfew if not exempt
 * tick -> seconds between wanted ticks
 * repExemptMin -> rep value that grants curfew exemption
 * type -> reputation type (default)
 * permitSwitch -> switch ID; ON grants exemption (like a curfew pass)
 *
 * PARAMETERS let you set defaults if the map_note omits parts.
 *
 * REQUIREMENTS:
 * - Wanted system: if Gemini_BountyWarrants is present, we call $gameSystem.addWanted
 * (fallback: no crash; curfew still warns).
 *
 * Terms: free to use, credit “Gemini”.
 *
 * ---------------------------------------------------------------------------
 * @param timeHourVarId
 * @text Time Hour Variable (0..23)
 * @type variable
 * @desc If >0, read this variable for current hour. If 0, use system clock.
 * @default 0
 *
 * @param enableSchedules
 * @text Enable Business Hours
 * @type boolean
 * @default true
 *
 * @param closedToast
 * @text Closed Toast
 * @type string
 * @default Closed (Hours: {open}-{close})
 *
 * @param enableCurfew
 * @text Enable Curfew
 * @type boolean
 * @default true
 *
 * @param dCurfewStart
 * @text Default Curfew Start
 * @type number
 * @min 0
 * @max 23
 * @default 22
 *
 * @param dCurfewEnd
 * @text Default Curfew End
 * @type number
 * @min 0
 * @max 23
 * @default 6
 *
 * @param dAuthority
 * @text Default Curfew Authority
 * @type string
 * @default TownGuards
 *
 * @param dScope
 * @text Default Scope
 * @type select
 * @option faction
 * @option location
 * @default faction
 *
 * @param dRepType
 * @text Default Rep Type
 * @type string
 * @default default
 *
 * @param dRepExemptMin
 * @text Default Rep Exempt Min
 * @type number
 * @default 50
 *
 * @param dPermitSwitchId
 * @text Default Permit Switch
 * @type switch
 * @default 0
 *
 * @param dWantedDelta
 * @text Default Wanted Delta per Tick
 * @type number
 * @default 1
 *
 * @param dTickSeconds
 * @text Default Curfew Tick Seconds
 * @type number
 * @default 5
 *
 * @param warnToast
 * @text Curfew Warn Toast
 * @type string
 * @default Curfew in effect. Go home.
 *
 * @command SetTimeHour
 * @text Set Time Hour
 * @desc Set the hour (0..23) if you’re using the time variable.
 * @arg hour
 * @type number
 * @min 0
 * @max 23
 * @default 12
 *
 * @command CheckEventOpen
 * @text Check Event Open (set switch)
 * @desc Evaluate an event’s open tags and set a switch to ON if open.
 * @arg eventId
 * @type number
 * @default 0
 * @arg switchId
 * @type switch
 * @default 1
 */

(() => {
  'use strict';

  const PLUGIN = 'Gemini_SchedulesCurfew';
  const P = PluginManager.parameters(PLUGIN);

  const timeHourVarId = Number(P.timeHourVarId||0);
  const enableSchedules = String(P.enableSchedules||'true')==='true';
  const closedToast = String(P.closedToast||'Closed (Hours: {open}-{close})');

  const enableCurfew = String(P.enableCurfew||'true')==='true';
  const dCurfewStart = Number(P.dCurfewStart||22);
  const dCurfewEnd = Number(P.dCurfewEnd||6);
  const dAuthority = String(P.dAuthority||'TownGuards');
  const dScope = String(P.dScope||'faction');
  const dRepType = String(P.dRepType||'default');
  const dRepExemptMin = Number(P.dRepExemptMin||50);
  const dPermitSwitchId = Number(P.dPermitSwitchId||0);
  const dWantedDelta = Number(P.dWantedDelta||1);
  const dTickSeconds = Number(P.dTickSeconds||5);
  const warnToast = String(P.warnToast||'Curfew in effect. Go home.');

  // --- Helpers ---------------------------------------------------------------
  function currentHour(){
    if (timeHourVarId>0) return Math.max(0, Math.min(23, Number($gameVariables.value(timeHourVarId)||0)));
    try { return new Date().getHours(); } catch(_) { return 12; }
  }
  function hourInRange(h, start, end){
    // inclusive start, exclusive end; overnight ok
    if (start === end) return true; // full-day curfew/open
    if (start < end) return (h >= start && h < end);
    return (h >= start || h < end);
  }
  function opCheck(a,op,b){
    switch(op){
      case '>=': return a>=b;
      case '<=': return a<=b;
      case '>': return a>b;
      case '<': return a<b;
      case '=': return a===b;
      default: return false;
    }
  }
  function getRepBridge(id,type){
    try{ return Number(window.getRep?.(id,type) ?? 0); }catch(_){ return 0; }
  }
  function addWantedBridge(id,scope,delta){
    try{
      if ($gameSystem?.addWanted) $gameSystem.addWanted(id,scope,delta);
    }catch(_){}
  }
  function addToast(text){
    const sc = SceneManager._scene;
    if (sc && typeof sc.addRepToast === 'function') sc.addRepToast(text);
    else $gameMessage.add(String(text));
  }

  // --- Plugin Commands -------------------------------------------------------
  PluginManager.registerCommand(PLUGIN, 'SetTimeHour', args=>{
    const hr = Math.max(0, Math.min(23, Number(args.hour||0)));
    if (timeHourVarId>0) $gameVariables.setValue(timeHourVarId, hr);
  });

  PluginManager.registerCommand(PLUGIN, 'CheckEventOpen', args=>{
    const eid = Number(args.eventId||0);
    const sid = Number(args.switchId||1);
    const ev = eid>0 ? $gameMap.event(eid) : $gameMap.event($gameMap._interpreter.eventId());
    const open = ev ? ev.isGeminiOpenNow() : false;
    $gameSwitches.setValue(sid, !!open);
  });

  // --- Parse comment tags from an event page --------------------------------
  function parseEventGate(ev){
    ev._gemOpen = null;
    if (!ev || !ev.page()) return;
    const list = ev.list() || [];
    let hours = null;
    let repReq = null;

    const rxHours = /<open\s+hours:\s*(\d{1,2})\s*-\s*(\d{1,2})\s*>/i;
    const rxRep = /<rep\s+open\s+req:\s*([^\s]+)\s*(>=|<=|>|<|=)\s*(-?\d+)(?:\s+type\s*:\s*(\w+))?\s*>/i;

    for (const cmd of list){
      if (cmd.code !== 108 && cmd.code !== 408) continue;
      const t = String(cmd.parameters[0]||'');
      let m = t.match(rxHours);
      if (m){
        hours = { open: Number(m[1]), close: Number(m[2]) };
      }
      m = t.match(rxRep);
      if (m){
        repReq = { id: m[1], op: m[2], val: Number(m[3]), type: (m[4]||'default') };
      }
    }
    ev._gemOpen = { hours, repReq };
  }

  // evaluate current openness for an event
  Game_Event.prototype.isGeminiOpenNow = function(){
    if (!enableSchedules) return true;
    if (!this._gemOpen) parseEventGate(this);
    const info = this._gemOpen || {};
    const H = currentHour();

    // Hours gate
    if (info.hours){
      const st = Math.max(0, Math.min(23, info.hours.open|0));
      const en = Math.max(0, Math.min(23, info.hours.close|0));
      if (!hourInRange(H, st, en)) return false;
    }
    // Rep req
    if (info.repReq){
      const r = getRepBridge(info.repReq.id, info.repReq.type||'default');
      if (!opCheck(r, info.repReq.op, info.repReq.val)) return false;
    }
    return true;
  };

  // Hook setupPage to parse tags
  const _GE_setupPage = Game_Event.prototype.setupPage;
  Game_Event.prototype.setupPage = function(){
    _GE_setupPage.call(this);
    parseEventGate(this);
  };

  // Block interaction if closed
  const _GE_start = Game_Event.prototype.start;
  Game_Event.prototype.start = function(){
    if (enableSchedules && !this.isGeminiOpenNow()){
      if (this._gemOpen && this._gemOpen.hours){
        const st = this._gemOpen.hours.open, en = this._gemOpen.hours.close;
        addToast(closedToast.replace('{open}', st).replace('{close}', en));
      } else {
        addToast('Closed.');
      }
      return; // swallow
    }
    _GE_start.call(this);
  };

  // --- Curfew (Map Note) ----------------------------------------------------
  function parseMapCurfew(dataMap){
    const note = String(dataMap && dataMap.note || '');
    const rx = /<curfew:\s*([^>]+)>/i;
    const m = note.match(rx);
    if (!m) return null;
    const body = m[1];

    function pick(re, def){ const mm = body.match(re); return mm ? mm[1] : def; }

    const start = Number(pick(/start\s*:\s*(\d{1,2})/i, dCurfewStart));
    const end = Number(pick(/end\s*:\s*(\d{1,2})/i, dCurfewEnd));
    const auth = String(pick(/authority\s*:\s*([^\s]+)/i, dAuthority));
    const scope = String(pick(/scope\s*:\s*(faction|location)/i, dScope));
    const warnCE= Number(pick(/warnCE\s*:\s*(\d+)/i, 0));
    const wanted= Number(pick(/wanted\s*:\s*(-?\d+)/i, dWantedDelta));
    const tick = Number(pick(/tick\s*:\s*(\d+)/i, dTickSeconds));
    const repMin= Number(pick(/repExemptMin\s*:\s*(-?\d+)/i, dRepExemptMin));
    const rType = String(pick(/type\s*:\s*(\w+)/i, dRepType));
    const psw = Number(pick(/permitSwitch\s*:\s*(\d+)/i, dPermitSwitchId));

    return { start, end, auth, scope, warnCE, wanted, tick, repMin, rType, psw };
  }

  // Store curfew state in Game_System
  const _GS_init = Game_System.prototype.initialize;
  Game_System.prototype.initialize = function(){
    _GS_init.call(this);
    this._curfew = { warnedForMapId: 0, lastTickF: 0 };
  };

  // Map update hook
  const _SM_update = Scene_Map.prototype.update;
  Scene_Map.prototype.update = function(){
    _SM_update.call(this);
    if (!enableCurfew || !$gameMap) return;

    const map = $dataMap; // current map data
    if (!map) return;
    const C = parseMapCurfew(map);
    if (!C) return;

    const H = currentHour();
    const inCurfew = hourInRange(H, C.start, C.end);
    if (!inCurfew) { this._curfewWarned = false; return; }

    // Exemptions: permit switch OR rep high enough
    let exempt = false;
    if (C.psw>0 && $gameSwitches.value(C.psw)) exempt = true;
    if (!exempt){
      const r = getRepBridge(C.auth, C.rType||'default');
      if (r >= C.repMin) exempt = true;
    }
    if (exempt) return;

    // One-time warn
    if (!this._curfewWarned){
      this._curfewWarned = true;
      if (C.warnCE>0) $gameTemp.reserveCommonEvent(C.warnCE);
      else addToast(warnToast);
    }

    // Wanted tick
    const nowF = Graphics.frameCount;
    const delayF = Math.max(1, Math.floor((C.tick||dTickSeconds) * 60));
    if (nowF - ($gameSystem._curfew.lastTickF||0) >= delayF){
      $gameSystem._curfew.lastTickF = nowF;
      if (C.wanted) addWantedBridge(C.auth, C.scope||'faction', Number(C.wanted||0));
    }
  };

})();