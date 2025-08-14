//=============================================================================
// Gemini_StealthCrime.js v0.4.0
// Theft (owned loot), Watchers (LOS/FOV + Hearing), Stolen tracking
// Fence (sell/launder), Contraband scanning (severity, caps, exemptions),
// Shop Scanner (block/warn + list), Arrest Seizure (stash/destroy + whitelist),
// Evidence UI (return/convert), Hot-Goods decay, Heat system, Disguises,
// Rep-based friendliness, Scanner waivers, Runtime toggles.
// Bridges: Gemini_BountyWarrants (Wanted), TownReputation (getRep/toasts).
//=============================================================================
/*:
 * @target MZ
 * @plugindesc v0.4.0 Stealth & Crime: theft + LOS/hearing + contraband + fence + scanner + seizure + evidence + decay + heat + disguises (all toggleable)
 * @author Gemini
 *
 * @help
 * QUICK TAGS
 * ----------
 * OWNED LOOT (put in event comments on the giving page):
 * <owned loot: TownGuards scope:faction value:25 [allowSwitch:21]>
 *
 * WATCHER (sees theft & contraband; now supports hearing):
 * <watcher: TownGuards scope:faction range:8 fov:120 seeTheft:on seeContraband:on
 * hear:on hearRange:6 reportCE:0 contrabandCE:0>
 *
 * CONTRABAND (put on items/weapons/armors):
 * <contraband: TownGuards scope:faction wanted:10 severity:high
 * [equipOnly:on] [perUnit:on] [permitSwitch:21]
 * [repExemptMin:50 type:default]>
 *
 * SEIZURE WHITELIST (item never seized on arrest):
 * <seizeExempt:on>
 *
 * SHOP SCANNER (in event comments ABOVE "Shop Processing"):
 * <contraband scanner: authority: TownGuards scope:faction mode:block
 * repExemptMin:50 type:default permitSwitch:22
 * list:on ce:0 toast:"No service while carrying contraband.">
 *
 * DISGUISE (equipped armor/weapon that weakens detection by same authority):
 * <disguise: TownGuards scope:faction fov:-40 range:-2 wantedPct:-50>
 *
 * INLINE SHOW
 * <showStolenCount: item 7> <showStolenTotal> <showContrabandTotal>
 *
 * PLUGIN COMMANDS
 * OpenFence
 * ClearStolenAll
 * MarkStolen type id amount
 * DebugDumpStolen
 * SeizeContraband [authority] [scope] [mode] [respectEquipOnly]
 * OpenEvidence
 * ReturnEvidenceAll
 * EvidenceConvertAll // convert seized to gold (percent param)
 * GrantScannerWaiver [authority] [scope] [seconds]
 * SetOption key value // runtime toggle, see keys list below
 * AddHeat amount | SetHeat value | ClearHeat
 *
 * RUNTIME TOGGLE KEYS (SetOption):
 * enableTheft, enableLOS, enableContraband, enableFence, enableShopScanner,
 * enableArrestSeizure, enableHearing, enableHotDecay, enableEvidenceSell,
 * enableHeat, enableFriendRepExempt, enableDisguises
 *
 * Terms: Free to use. Credit “Gemini”.
 *
 * ---------------------------------------------------------------------------
 * PARAMETERS
 * ---------------------------------------------------------------------------
 * @param ---Core Switches & Debug---
 * @default
 *
 * @param debugLog
 * @text Debug Log
 * @type boolean
 * @default false
 *
 * @param toastFallbackToMsg
 * @text Toasts → Message fallback
 * @type boolean
 * @default true
 *
 * @param ---Theft (Owned Loot)---
 * @default
 *
 * @param enableTheft
 * @text Enable Theft (owned loot)
 * @type boolean
 * @default true
 *
 * @param witnessWantedDelta
 * @text Wanted per Witness (Theft)
 * @type number
 * @default 5
 *
 * @param witnessToast
 * @text Witness Toast
 * @type string
 * @default Theft witnessed! Wanted +{W} ({AUTH})
 *
 * @param witnessCooldownSec
 * @text Witness Cooldown (sec)
 * @type number
 * @default 2
 *
 * @param friendRepExemptMin
 * @text Friend Rep Exempt (theft witness)
 * @type number
 * @default 50
 *
 * @param enableFriendRepExempt
 * @text Enable Rep Exemption for Witness
 * @type boolean
 * @default true
 *
 * @param friendRepType
 * @text Friend Rep Type
 * @type string
 * @default default
 *
 * @param ---Watchers (LOS/FOV/Hearing)---
 * @default
 *
 * @param enableLOS
 * @text Enable LOS/FOV Watchers
 * @type boolean
 * @default true
 *
 * @param losRangeDefault
 * @text Default Watch Range (tiles)
 * @type number
 * @default 8
 *
 * @param fovDefault
 * @text Default Watch FOV (deg)
 * @type number
 * @default 120
 *
 * @param blockLOSByWalls
 * @text Block LOS by Impassable Tiles
 * @type boolean
 * @default false
 *
 * @param enableHearing
 * @text Enable Hearing
 * @type boolean
 * @default true
 *
 * @param dashNoiseRange
 * @text Dash Noise Range (tiles)
 * @type number
 * @default 4
 *
 * @param hearingContrabandFactor
 * @text Hearing Contraband Factor (%)
 * @type number
 * @default 50
 *
 * @param ---Contraband---
 * @default
 *
 * @param enableContraband
 * @text Enable Contraband Scanning
 * @type boolean
 * @default true
 *
 * @param contrabandWantedDefault
 * @text Contraband Wanted Default
 * @type number
 * @default 5
 *
 * @param contrabandScanTickSec
 * @text Contraband Scan Tick (sec)
 * @type number
 * @default 3
 *
 * @param contrabandCapPerScan
 * @text Wanted Cap per Scan
 * @type number
 * @default 20
 *
 * @param contrabandToast
 * @text Contraband Toast
 * @type string
 * @default Contraband detected! Wanted +{W} ({AUTH})
 *
 * @param sevLowMult
 * @text Severity Low Mult (%)
 * @type number
 * @default 100
 *
 * @param sevMedMult
 * @text Severity Medium Mult (%)
 * @type number
 * @default 150
 *
 * @param sevHighMult
 * @text Severity High Mult (%)
 * @type number
 * @default 250
 *
 * @param sevVitalMult
 * @text Severity Vital Mult (%)
 * @type number
 * @default 400
 *
 * @param enableDisguises
 * @text Enable Disguises
 * @type boolean
 * @default true
 *
 * @param stealthStateId
 * @text Sneak/Stealth State ID
 * @type state
 * @default 0
 *
 * @param stealthRangePct
 * @text Stealth Range Change (%)
 * @type number
 * @default -25
 *
 * @param stealthFovDeg
 * @text Stealth FOV Change (deg)
 * @type number
 * @default -30
 *
 * @param stealthWantedPct
 * @text Stealth Wanted Change (%)
 * @type number
 * @default -25
 *
 * @param ---Shop Scanner---
 * @default
 *
 * @param enableShopScanner
 * @text Enable Shop Scanner
 * @type boolean
 * @default true
 *
 * @param scannerDefaultMode
 * @text Scanner Default Mode
 * @type select
 * @option block
 * @option warn
 * @default block
 *
 * @param scannerToastDefault
 * @text Scanner Toast (Default)
 * @type string
 * @default No service while carrying contraband.
 *
 * @param dScannerAuthority
 * @text Scanner Authority (Default)
 * @type string
 * @default TownGuards
 *
 * @param dScannerScope
 * @text Scanner Scope (Default)
 * @type select
 * @option faction
 * @option location
 * @default faction
 *
 * @param scannerRepExemptMin
 * @text Scanner Rep Exempt Min
 * @type number
 * @default 50
 *
 * @param scannerRepType
 * @text Scanner Rep Type
 * @type string
 * @default default
 *
 * @param scannerPermitSwitch
 * @text Scanner Permit Switch
 * @type switch
 * @default 0
 *
 * @param scannerShowList
 * @text Scanner Shows Contraband List
 * @type boolean
 * @default true
 *
 * @param scannerListMax
 * @text Scanner List Max Items
 * @type number
 * @default 3
 *
 * @param ---Arrest Seizure / Evidence---
 * @default
 *
 * @param enableArrestSeizure
 * @text Enable Arrest Seizure
 * @type boolean
 * @default true
 *
 * @param seizeModeDefault
 * @text Seizure Mode Default
 * @type select
 * @option stash
 * @option destroy
 * @default stash
 *
 * @param seizeRespectEquipOnly
 * @text Seize Respects equipOnly
 * @type boolean
 * @default false
 *
 * @param dSeizeAuthority
 * @text Seize Authority (Default)
 * @type string
 * @default TownGuards
 *
 * @param dSeizeScope
 * @text Seize Scope (Default)
 * @type select
 * @option faction
 * @option location
 * @default faction
 *
 * @param seizeToast
 * @text Seizure Toast
 * @type string
 * @default Contraband confiscated: {N} items ({AUTH})
 *
 * @param enableEvidenceSell
 * @text Enable Evidence Convert→Gold
 * @type boolean
 * @default true
 *
 * @param evidenceSellPercent
 * @text Evidence Sell % (to gold)
 * @type number
 * @default 25
 *
 * @param ---Fence---
 * @default
 *
 * @param enableFence
 * @text Enable Fence UI
 * @type boolean
 * @default true
 *
 * @param fencePayoutPercent
 * @text Fence Payout % (default)
 * @type number
 * @default 60
 *
 * @param fenceLaunderPercent
 * @text Fence Launder Fee % (default)
 * @type number
 * @default 30
 *
 * @param fenceDetectChance
 * @text Fence Detect Chance % (default)
 * @type number
 * @default 10
 *
 * @param fenceDetectWanted
 * @text Fence Detect Wanted (+)
 * @type number
 * @default 10
 *
 * @param toastOnFence
 * @text Fence Toast Template
 * @type string
 * @default {ACT}: {NAME} x{N} → {G}g
 *
 * @param ---Decay / Heat / Waivers---
 * @default
 *
 * @param enableHotDecay
 * @text Enable Hot-Goods Decay
 * @type boolean
 * @default true
 *
 * @param hotDecayTickSec
 * @text Hot Decay Tick (sec)
 * @type number
 * @default 30
 *
 * @param hotDecayUnitsPerTick
 * @text Decay Units per Tick
 * @type number
 * @default 1
 *
 * @param enableHeat
 * @text Enable Heat System
 * @type boolean
 * @default true
 *
 * @param heatMax
 * @text Heat Max
 * @type number
 * @default 5
 *
 * @param heatAddTheft
 * @text Heat + on Theft Witness
 * @type number
 * @default 1
 *
 * @param heatAddScan
 * @text Heat + on Contraband Scan
 * @type number
 * @default 1
 *
 * @param heatDecaySec
 * @text Heat Decay every (sec)
 * @type number
 * @default 20
 *
 * @param heatWantedPctPerPoint
 * @text Wanted % per Heat Point
 * @type number
 * @default 10
 *
 * @param waiverToast
 * @text Waiver Granted Toast
 * @type string
 * @default Scanner waiver active ({AUTH}) for {S}s
 */

(() => {
  'use strict';

  const PLUGIN = 'Gemini_StealthCrime';
  const P = PluginManager.parameters(PLUGIN);
  const B = s => String(s||'false')==='true';
  const N = s => Number(s||0);
  const S = s => String(s||'').trim();

  const debugLog = B(P.debugLog||'false');
  const toastFallbackToMsg = B(P.toastFallbackToMsg||'true');

  // Theft / witness
  let enableTheft = B(P.enableTheft||'true');
  let witnessWantedDelta = N(P.witnessWantedDelta||5);
  const witnessToast = S(P.witnessToast||'Theft witnessed! Wanted +{W} ({AUTH})');
  const witnessCooldownSec = N(P.witnessCooldownSec||2);
  let enableFriendRepExempt = B(P.enableFriendRepExempt||'true');
  const friendRepExemptMin = N(P.friendRepExemptMin||50);
  const friendRepType = S(P.friendRepType||'default');

  // Watchers
  let enableLOS = B(P.enableLOS||'true');
  const losRangeDefault = N(P.losRangeDefault||8);
  const fovDefault = N(P.fovDefault||120);
  const blockLOSByWalls = B(P.blockLOSByWalls||'false');

  // Hearing
  let enableHearing = B(P.enableHearing||'true');
  const dashNoiseRange = N(P.dashNoiseRange||4);
  const hearingContrabandFactor = Math.max(0, N(P.hearingContrabandFactor||50))/100;

  // Contraband
  let enableContraband = B(P.enableContraband||'true');
  const contrabandWantedDefault = N(P.contrabandWantedDefault||5);
  const contrabandScanTickSec = N(P.contrabandScanTickSec||3);
  const contrabandCapPerScan = N(P.contrabandCapPerScan||20);
  const contrabandToast = S(P.contrabandToast||'Contraband detected! Wanted +{W} ({AUTH})');
  const sevLowMult = Math.max(0, N(P.sevLowMult||100))/100;
  const sevMedMult = Math.max(0, N(P.sevMedMult||150))/100;
  const sevHighMult = Math.max(0, N(P.sevHighMult||250))/100;
  const sevVitalMult = Math.max(0, N(P.sevVitalMult||400))/100;

  // Disguises & stealth state
  let enableDisguises = B(P.enableDisguises||'true');
  const stealthStateId = N(P.stealthStateId||0);
  const stealthRangePct = N(P.stealthRangePct||-25)/100;
  const stealthFovDeg = N(P.stealthFovDeg||-30);
  const stealthWantedPct = N(P.stealthWantedPct||-25)/100;

  // Shop Scanner
  let enableShopScanner = B(P.enableShopScanner||'true');
  const scannerDefaultMode = S(P.scannerDefaultMode||'block');
  const scannerToastDefault = S(P.scannerToastDefault||'No service while carrying contraband.');
  const dScannerAuthority = S(P.dScannerAuthority||'TownGuards');
  const dScannerScope = S(P.dScannerScope||'faction');
  const scannerRepExemptMin = N(P.scannerRepExemptMin||50);
  const scannerRepType = S(P.scannerRepType||'default');
  const scannerPermitSwitch = N(P.scannerPermitSwitch||0);
  const scannerShowList = B(P.scannerShowList||'true');
  const scannerListMax = Math.max(0, N(P.scannerListMax||3));

  // Seizure / Evidence
  let enableArrestSeizure = B(P.enableArrestSeizure||'true');
  const seizeModeDefault = S(P.seizeModeDefault||'stash');
  const seizeRespectEquipOnly = B(P.seizeRespectEquipOnly||'false');
  const dSeizeAuthority = S(P.dSeizeAuthority||'TownGuards');
  const dSeizeScope = S(P.dSeizeScope||'faction');
  const seizeToast = S(P.seizeToast||'Contraband confiscated: {N} items ({AUTH})');
  let enableEvidenceSell = B(P.enableEvidenceSell||'true');
  const evidenceSellPercent = Math.max(0, N(P.evidenceSellPercent||25));

  // Fence
  let enableFence = B(P.enableFence||'true');
  const fencePayoutPercent = N(P.fencePayoutPercent||60);
  const fenceLaunderPercent = N(P.fenceLaunderPercent||30);
  const fenceDetectChance = N(P.fenceDetectChance||10);
  const fenceDetectWanted = N(P.fenceDetectWanted||10);
  const toastOnFence = S(P.toastOnFence||'{ACT}: {NAME} x{N} → {G}g');

  // Decay / Heat / Waivers
  let enableHotDecay = B(P.enableHotDecay||'true');
  const hotDecayTickSec = N(P.hotDecayTickSec||30);
  const hotDecayUnitsPerTick = Math.max(0, N(P.hotDecayUnitsPerTick||1));

  let enableHeat = B(P.enableHeat||'true');
  const heatMax = N(P.heatMax||5);
  const heatAddTheft = N(P.heatAddTheft||1);
  const heatAddScan = N(P.heatAddScan||1);
  const heatDecaySec = N(P.heatDecaySec||20);
  const heatWantedPctPerPoint = N(P.heatWantedPctPerPoint||10)/100;

  const waiverToast = S(P.waiverToast||'Scanner waiver active ({AUTH}) for {S}s');

  const log=(...a)=>{ if (debugLog) console.log('[StealthCrime]', ...a); };

  // Bridges
  function addWanted(auth, scope, delta){
    try { if ($gameSystem?.addWanted) $gameSystem.addWanted(auth, scope||'faction', delta); } catch(_){}
  }
  function getWanted(auth, scope){
    try { return Number($gameSystem?.getWanted?.(auth, scope||'faction')||0); } catch(_) { return 0; }
  }
  function getRep(id,type){
    try{ return Number(window.getRep?.(id,type) ?? 0); }catch(_){ return 0; }
  }
  function addToast(text){
    const sc = SceneManager._scene;
    if (sc && typeof sc.addRepToast === 'function') sc.addRepToast(text);
    else if (toastFallbackToMsg) $gameMessage.add(String(text));
  }

  // LOS utils
  function withinRange(ev, px, py, range){
    const dx = ev.x - px, dy = ev.y - py;
    return (Math.abs(dx)+Math.abs(dy)) <= range || Math.hypot(dx,dy) <= range;
  }
  function withinFOV(ev, px, py, fovDeg){
    if (fovDeg >= 360) return true;
    const dx = px - ev.x, dy = py - ev.y;
    const angToPlayer = Math.atan2(-dy, dx) * 180 / Math.PI;
    const facing = (function(dir){
      switch(dir){ case 2: return 90; case 4: return 180; case 6: return 0; case 8: return 270; default: return 0; }
    })(ev.direction());
    let diff = Math.abs(((angToPlayer - facing + 540)%360)-180);
    return diff <= (fovDeg/2);
  }
  function clearLine(px,py, ex,ey){
    if (!blockLOSByWalls) return true;
    let x=px, y=py;
    const dx = Math.sign(ex-px), dy = Math.sign(ey-py);
    while (x!==ex || y!==ey){
      if (!$gameMap.isPassable(x,y,2) && !$gameMap.isPassable(x,y,4) && !$gameMap.isPassable(x,y,6) && !$gameMap.isPassable(x,y,8)){
        return false;
      }
      if (x!==ex) x+=dx;
      if (y!==ey) y+=dy;
    }
    return true;
  }

  //-----------------------------------------------------------------------------
  // DATA: Stolen + Evidence + Heat + Waivers
  //-----------------------------------------------------------------------------
  const TYPES = { item:'items', weapon:'weapons', armor:'armors' };

  const _GP_init = Game_Party.prototype.initialize;
  Game_Party.prototype.initialize = function(){
    _GP_init.call(this);
    this._stolen = this._stolen || { items:{}, weapons:{}, armors:{} };
  };

  Game_Party.prototype.stolenCount = function(kind, id){ const k=TYPES[kind]; return k?Number(this._stolen[k][id]||0):0; };
  Game_Party.prototype.totalStolen = function(){ let t=0; for (const k in this._stolen){ for (const id in this._stolen[k]) t += Math.max(0, this._stolen[k][id]|0); } return t; };
  Game_Party.prototype.markStolen = function(kind, id, n){ const k=TYPES[kind]; if (!k||!id||!n) return; const cur=Number(this._stolen[k][id]||0); this._stolen[k][id]=Math.max(0,cur+n); };
  Game_Party.prototype.unmarkStolen= function(kind, id, n){ const k=TYPES[kind]; if (!k||!id||!n) return; const cur=Number(this._stolen[k][id]||0); this._stolen[k][id]=Math.max(0,cur-n); };
  Game_Party.prototype.clearStolenAll=function(){ this._stolen = { items:{}, weapons:{}, armors:{} }; };

  const _GS_init = Game_System.prototype.initialize;
  Game_System.prototype.initialize = function(){
    _GS_init.call(this);
    this._scEvidence = this._scEvidence || { items:{}, weapons:{}, armors:{} };
    this._scHeat = this._scHeat || 0;
    this._scWaiver = this._scWaiver || {}; // key "AUTH||SCOPE" -> expireFrame
  };

  function stashAdd(kind, id, n){ const k=TYPES[kind]; if (!k||!id||!n) return; const cur=Number($gameSystem._scEvidence[k][id]||0); $gameSystem._scEvidence[k][id]=Math.max(0,cur+n); }
  function stashTake(kind, id, n){ const k=TYPES[kind]; if (!k||!id||!n) return 0; const cur=Number($gameSystem._scEvidence[k][id]||0); const take=Math.min(cur,n); $gameSystem._scEvidence[k][id]=Math.max(0,cur-take); return take; }
  function stashTotal(){ let t=0; const E=$gameSystem._scEvidence; for (const k in E){ for (const id in E[k]) t+=Math.max(0,E[k][id]|0);} return t; }

  // Heat utils
  function addHeat(n){ if (!enableHeat) return; $gameSystem._scHeat = Math.max(0, Math.min(heatMax, ($gameSystem._scHeat||0)+n)); }
  function decHeat(){ if (!enableHeat) return; $gameSystem._scHeat = Math.max(0, ($gameSystem._scHeat||0)-1); }

  // Waiver utils
  function grantWaiver(auth, scope, seconds){
    const key = `${auth}||${scope||'faction'}`;
    const frames = Math.max(1, Math.floor(seconds*60));
    $gameSystem._scWaiver[key] = Graphics.frameCount + frames;
    addToast(waiverToast.replace('{AUTH}', auth).replace('{S}', String(seconds)));
  }
  function waiverActive(auth, scope){
    const key = `${auth}||${scope||'faction'}`;
    const until = $gameSystem._scWaiver[key]||0;
    return Graphics.frameCount < until;
  }

  //-----------------------------------------------------------------------------
  // Notes parsing
  //-----------------------------------------------------------------------------
  function parseOwnedTag(ev){
    ev._scOwned = null;
    if (!ev || !ev.page()) return;
    const rx = /<owned\s+loot:\s*([^\s]+)\s+scope\s*:\s*(faction|location)\s+value\s*:\s*(-?\d+)(?:\s+allowSwitch\s*:\s*(\d+))?\s*>/i;
    for (const cmd of (ev.list()||[])){
      if (cmd.code!==108 && cmd.code!==408) continue;
      const t = String(cmd.parameters[0]||'');
      const m = t.match(rx);
      if (m){ ev._scOwned = { auth:m[1], scope:m[2], value:Number(m[3]), allowSwitch:Number(m[4]||0) }; break; }
    }
  }
  function parseWatcherTag(ev){
    ev._scWatcher = null;
    if (!ev || !ev.page()) return;
    const rx = /<watcher:\s*([^\s]+)\s+scope\s*:\s*(faction|location)(?:\s+range\s*:\s*(\d+))?(?:\s+fov\s*:\s*(\d+))?(?:\s+seeTheft\s*:\s*(on|off))?(?:\s+seeContraband\s*:\s*(on|off))?(?:\s+hear\s*:\s*(on|off))?(?:\s+hearRange\s*:\s*(\d+))?(?:\s+reportCE\s*:\s*(\d+))?(?:\s+contrabandCE\s*:\s*(\d+))?\s*>/i;
    for (const cmd of (ev.list()||[])){
      if (cmd.code!==108 && cmd.code!==408) continue;
      const m = String(cmd.parameters[0]||'').match(rx);
      if (m){
        ev._scWatcher = {
          auth:m[1], scope:(m[2]||'faction'),
          range: Number(m[3]||losRangeDefault),
          fov: Number(m[4]||fovDefault),
          see: (String(m[5]||'on').toLowerCase()!=='off'),
          seeCB: (String(m[6]||'on').toLowerCase()!=='off'),
          hear: (String(m[7]||'on').toLowerCase()!=='off'),
          hearRange: Number(m[8]||dashNoiseRange),
          ce: Number(m[9]||0),
          ceCB: Number(m[10]||0),
          _lastWitnessF: 0,
          _lastScanF: 0
        };
        break;
      }
    }
  }
  function parseFenceTag(ev){
    ev._scFence = null;
    if (!ev || !ev.page()) return;
    const rx = /<fence:\s*authority\s*:\s*([^\s]+)\s+scope\s*:\s*(faction|location)(?:\s+payout\s*:\s*(\d+))?(?:\s+launder\s*:\s*(\d+))?(?:\s+detect\s*:\s*(\d+))?(?:\s+wanted\s*:\s*(\d+))?\s*>/i;
    for (const cmd of (ev.list()||[])){
      if (cmd.code!==108 && cmd.code!==408) continue;
      const m = String(cmd.parameters[0]||'').match(rx);
      if (m){
        ev._scFence = {
          auth: m[1], scope: (m[2]||'faction'),
          payout: Number(m[3]||fencePayoutPercent),
          launder: Number(m[4]||fenceLaunderPercent),
          detect: Number(m[5]||fenceDetectChance),
          wanted: Number(m[6]||fenceDetectWanted)
        };
        break;
      }
    }
  }
  function parseContrabandNote(obj){
    if (!obj) return null;
    if (obj._scContra !== undefined) return obj._scContra;
    const rx = /<contraband:\s*([^\s]+)\s+scope\s*:\s*(faction|location)(?:\s+wanted\s*:\s*(-?\d+))?(?:\s+severity\s*:\s*(low|med|high|vital))?(?:\s+equipOnly\s*:\s*(on|off))?(?:\s+perUnit\s*:\s*(on|off))?(?:\s+permitSwitch\s*:\s*(\d+))?(?:\s+repExemptMin\s*:\s*(-?\d+))?(?:\s+type\s*:\s*(\w+))?\s*>/i;
    const m = String(obj.note||'').match(rx);
    if (!m){ obj._scContra = null; return null; }
    obj._scContra = {
      auth: m[1],
      scope:(m[2]||'faction'),
      wanted: Number(m[3]||contrabandWantedDefault),
      severity: (m[4]||'low'),
      equipOnly: String(m[5]||'off').toLowerCase()==='on',
      perUnit: String(m[6]||'off').toLowerCase()==='on',
      permitSwitch: Number(m[7]||0),
      repExemptMin: (m[8]!=null ? Number(m[8]) : null),
      repType: (m[9]||'default')
    };
    return obj._scContra;
  }
  function parseSeizeExempt(obj){
    if (!obj) return false;
    if (obj._scSeizeEx !== undefined) return obj._scSeizeEx;
    obj._scSeizeEx = /<seizeExempt\s*:\s*on\s*>/i.test(String(obj.note||''));
    return obj._scSeizeEx;
  }
  function parseDisguise(obj){
    if (!obj) return null;
    if (obj._scDisguise !== undefined) return obj._scDisguise;
    const rx = /<disguise:\s*([^\s]+)\s+scope\s*:\s*(faction|location)(?:\s+fov\s*:\s*(-?\d+))?(?:\s+range\s*:\s*(-?\d+))?(?:\s+wantedPct\s*:\s*(-?\d+))?\s*>/i;
    const m = String(obj.note||'').match(rx);
    if (!m){ obj._scDisguise=null; return null; }
    obj._scDisguise = {
      auth:m[1], scope:(m[2]||'faction'),
      fovDelta: N(m[3]||0), rangeDelta: N(m[4]||0), wantedPct: N(m[5]||0)/100
    };
    return obj._scDisguise;
  }

  //-----------------------------------------------------------------------------
  // Setup page hooks
  //-----------------------------------------------------------------------------
  const _GE_setupPage = Game_Event.prototype.setupPage;
  Game_Event.prototype.setupPage = function(){
    _GE_setupPage.call(this);
    parseOwnedTag(this);
    parseWatcherTag(this);
    parseFenceTag(this);
  };

  //-----------------------------------------------------------------------------
  // Theft interception (items/weapons/armors gains)
  //-----------------------------------------------------------------------------
  let _SC_activeOwned = null;
  const _GE_start = Game_Event.prototype.start;
  Game_Event.prototype.start = function(){
    _SC_activeOwned = this._scOwned || null;
    _GE_start.call(this);
    _SC_activeOwned = null;
  };

  function actorHasStealth(){
    if (!stealthStateId) return false;
    return $gameParty.members().some(a=>a && a.isStateAffected(stealthStateId));
    }
  function friendRepOk(auth){
    if (!enableFriendRepExempt) return false;
    const r = getRep(auth, friendRepType);
    return r >= friendRepExemptMin;
  }

  function markIfStolen(item, amount){
    if (!enableTheft) return;
    if (!_SC_activeOwned) return;
    if (_SC_activeOwned.allowSwitch>0 && $gameSwitches.value(_SC_activeOwned.allowSwitch)) return;
    if (!item || amount<=0) return;
    const kind = DataManager.isItem(item) ? 'item' : (DataManager.isWeapon(item) ? 'weapon' : (DataManager.isArmor(item) ? 'armor' : null));
    if (!kind) return;
    $gameParty.markStolen(kind, item.id, amount);

    // witness (LOS or hearing)
    if (!enableLOS) return;
    const px=$gamePlayer.x, py=$gamePlayer.y;
    const nowF=Graphics.frameCount;
    for (const ev of $gameMap.events()){
      const W = ev._scWatcher; if (!W||!W.see) continue;
      // friend exemption
      if (friendRepOk(_SC_activeOwned.auth||W.auth)) continue;

      let effRange=W.range, effFov=W.fov;
      const mod = disguiseModifiersFor(_SC_activeOwned.auth||W.auth, W.scope);
      effRange += mod.rangeDelta;
      effFov += mod.fovDelta;
      if (actorHasStealth()) { effRange += Math.round(effRange*stealthRangePct); effFov += stealthFovDeg; }

      const seeByLOS = withinRange(ev, px, py, effRange) && withinFOV(ev, px, py, effFov) && clearLine(px,py, ev.x,ev.y);
      const seeByHear= enableHearing && W.hear && withinRange(ev, px, py, W.hearRange);

      if (!seeByLOS && !seeByHear) continue;

      const minF = Math.max(1, Math.floor((witnessCooldownSec||2)*60));
      if (nowF - (W._lastWitnessF||0) < minF) continue;
      W._lastWitnessF = nowF;

      let wanted = witnessWantedDelta;
      wanted = applyHeatToWanted(wanted, true);
      addWanted(_SC_activeOwned.auth || W.auth, _SC_activeOwned.scope || W.scope, wanted);
      addToast(witnessToast.replace('{W}', String(wanted)).replace('{AUTH}', String(_SC_activeOwned.auth||W.auth)));
      if (W.ce>0) $gameTemp.reserveCommonEvent(W.ce);
      addHeat(heatAddTheft);
      break;
    }
  }

  const _GI_126 = Game_Interpreter.prototype.command126; // Items
  Game_Interpreter.prototype.command126 = function(params){
    const it = $dataItems[params[0]];
    const value = this.operateValue(params[1], params[2], params[3]);
    const r = _GI_126.apply(this, arguments);
    if (value>0) markIfStolen(it, value);
    return r;
  };
  const _GI_127 = Game_Interpreter.prototype.command127; // Weapons
  Game_Interpreter.prototype.command127 = function(params){
    const it = $dataWeapons[params[0]];
    const value = this.operateValue(params[1], params[2], params[3]);
    const r = _GI_127.apply(this, arguments);
    if (value>0) markIfStolen(it, value);
    return r;
  };
  const _GI_128 = Game_Interpreter.prototype.command128; // Armors
  Game_Interpreter.prototype.command128 = function(params){
    const it = $dataArmors[params[0]];
    const value = this.operateValue(params[1], params[2], params[3]);
    const r = _GI_128.apply(this, arguments);
    if (value>0) markIfStolen(it, value);
    return r;
  };

  //-----------------------------------------------------------------------------
  // Disguises and stealth modifiers
  //-----------------------------------------------------------------------------
  function playerHasEquipped(obj){
    for (const a of $gameParty.members()){
      if (!a) continue;
      if (DataManager.isWeapon(obj)||DataManager.isArmor(obj)){
        if (a.equips().some(eq => eq && eq===obj)) return true;
      }
    }
    return false;
  }
  function disguiseModifiersFor(auth, scope){
    if (!enableDisguises) return {fovDelta:0, rangeDelta:0, wantedPct:0};
    let fovD=0, rangeD=0, wantedPct=0;
    function scanList(db){
      for (let i=1;i<db.length;i++){
        const obj=db[i]; if (!obj) continue;
        if ($gameParty.numItems(obj)<=0) continue;
        if (!playerHasEquipped(obj)) continue;
        const d = parseDisguise(obj); if (!d) continue;
        if (d.auth!==auth || (d.scope||'faction')!==(scope||'faction')) continue;
        fovD += d.fovDelta||0;
        rangeD += d.rangeDelta||0;
        wantedPct += d.wantedPct||0;
      }
    }
    scanList($dataWeapons); scanList($dataArmors);
    return { fovDelta:fovD, rangeDelta:rangeD, wantedPct };
  }

  //-----------------------------------------------------------------------------
  // Contraband scanning (LOS + hearing + severity + heat + disguises)
  //-----------------------------------------------------------------------------
  function severityMult(sev){
    switch((sev||'low').toLowerCase()){
      case 'med': return sevMedMult;
      case 'high':return sevHighMult;
      case 'vital':return sevVitalMult;
      default: return sevLowMult;
    }
  }

  function contrabandList(auth, scope){
    // returns array of {name,n,baseWanted,severity}
    const out=[];
    function push(obj, n){
      const c=parseContrabandNote(obj); if (!c) return;
      if (c.auth!==auth || (c.scope||'faction')!==(scope||'faction')) return;
      if (c.permitSwitch>0 && $gameSwitches.value(c.permitSwitch)) return;
      if (c.repExemptMin!=null){
        const r = getRep(c.auth, c.repType||'default'); if (r>=c.repExemptMin) return;
      }
      if (c.equipOnly && !playerHasEquipped(obj)) return;
      out.push({name:obj.name, n, baseWanted:c.wanted, severity:c.severity||'low', equipOnly:c.equipOnly});
    }
    for (let i=1;i<$dataItems.length;i++){ const o=$dataItems[i]; const n=$gameParty.numItems(o); if (o&&n>0) push(o,n); }
    for (let i=1;i<$dataWeapons.length;i++){ const o=$dataWeapons[i]; const n=$gameParty.numItems(o); if (o&&n>0) push(o,n); }
    for (let i=1;i<$dataArmors.length;i++){ const o=$dataArmors[i]; const n=$gameParty.numItems(o); if (o&&n>0) push(o,n); }
    return out;
  }

  function contrabandScanSum(W, useHearing=false){
    const list = contrabandList(W.auth, W.scope);
    if (!list.length) return { sum:0, names:[] };

    const dis = disguiseModifiersFor(W.auth, W.scope);
    const heat = ($gameSystem._scHeat||0);
    const heatMult = 1 + (enableHeat ? heat*heatWantedPctPerPoint : 0);
    const stealthMult = actorHasStealth()? (1+stealthWantedPct) : 1;
    const disMult = (1 + (dis.wantedPct||0));

    let sum=0;
    for (const e of list){
      const units = e.equipOnly ? 1 : e.n;
      let add = Math.max(0, Math.floor(e.baseWanted * units * severityMult(e.severity)));
      if (useHearing) add = Math.floor(add * hearingContrabandFactor);
      add = Math.floor(add * heatMult * stealthMult * disMult);
      sum += add;
    }
    sum = Math.min(sum, contrabandCapPerScan);
    const names = list.slice(0, scannerListMax).map(e=>`${e.name}${e.equipOnly?'(eq)':''}x${e.n}`);
    return { sum, names };
  }

  // Map update: hearing ping from dash + periodic scans
  const _SM_update = Scene_Map.prototype.update;
  Scene_Map.prototype.update = function(){
    _SM_update.call(this);

    // Heat decay
    if (enableHeat){
      this._scHeatAcc = (this._scHeatAcc||0) + 1;
      if (this._scHeatAcc >= Math.max(1, Math.floor(heatDecaySec*60))){
        this._scHeatAcc = 0; decHeat();
      }
    }

    // Hot goods decay
    if (enableHotDecay){
      this._scHotAcc = (this._scHotAcc||0) + 1;
      if (this._scHotAcc >= Math.max(1, Math.floor(hotDecayTickSec*60))){
        this._scHotAcc = 0; decayStolen(hotDecayUnitsPerTick);
      }
    }

    if (!enableContraband || !enableLOS) return;

    const px=$gamePlayer.x, py=$gamePlayer.y;
    const nowF = Graphics.frameCount;
    const tickF = Math.max(1, Math.floor(contrabandScanTickSec*60));
    const dashing = enableHearing && $gamePlayer.isDashing();

    for (const ev of $gameMap.events()){
      const W = ev._scWatcher;
      if (!W || (!W.seeCB && !(W.hear && enableHearing))) continue;

      // Effective range/fov after disguises & stealth
      let effRange=W.range, effFov=W.fov;
      const dis = disguiseModifiersFor(W.auth, W.scope);
      effRange += dis.rangeDelta;
      effFov += dis.fovDelta;
      if (actorHasStealth()) { effRange += Math.round(effRange*stealthRangePct); effFov += stealthFovDeg; }

      const inLOS = withinRange(ev, px, py, effRange) && withinFOV(ev, px, py, effFov) && clearLine(px,py, ev.x,ev.y);
      const inHear= W.hear && withinRange(ev, px, py, W.hearRange) && (dashing); // simple dash noise

      // LOS scan gated by tick; hearing uses same tick (cheap).
      if (inLOS && W.seeCB && nowF - (W._lastScanF||0) >= tickF){
        W._lastScanF = nowF;
        const { sum, names } = contrabandScanSum(W, false);
        if (sum>0){
          const wanted = applyHeatToWanted(sum, false);
          addWanted(W.auth, W.scope, wanted);
          addToast(contrabandToast.replace('{W}', String(wanted)).replace('{AUTH}', String(W.auth)));
          if (W.ceCB>0) $gameTemp.reserveCommonEvent(W.ceCB);
          addHeat(heatAddScan);
        }
      }
      if (inHear && W.seeCB && nowF - (W._lastScanF||0) >= tickF){
        W._lastScanF = nowF;
        const { sum } = contrabandScanSum(W, true);
        if (sum>0){
          const wanted = applyHeatToWanted(sum, false);
          addWanted(W.auth, W.scope, wanted);
          addToast(contrabandToast.replace('{W}', String(wanted)).replace('{AUTH}', String(W.auth)));
          if (W.ceCB>0) $gameTemp.reserveCommonEvent(W.ceCB);
          addHeat(heatAddScan);
        }
      }
    }
  };

  function applyHeatToWanted(base, theft){
    if (!enableHeat) return base;
    const heat = ($gameSystem._scHeat||0);
    const mult = 1 + heat*heatWantedPctPerPoint;
    return Math.max(0, Math.floor(base * mult));
  }

  function decayStolen(units){
    // reduce 'units' from the largest stacks first (simple hot-goods bleed)
    if (units<=0) return;
    const S = $gameParty._stolen;
    const buckets = [];
    for (const k in S){ for (const id in S[k]){ const n=S[k][id]|0; if (n>0) buckets.push({k,id:Number(id),n}); } }
    buckets.sort((a,b)=>b.n-a.n);
    for (const b of buckets){
      const r = Math.min(units, b.n);
      S[b.k][b.id]-=r; units-=r;
      if (units<=0) break;
    }
  }

  //-----------------------------------------------------------------------------
  // Inline show tags
  //-----------------------------------------------------------------------------
  const _WB_convert = Window_Base.prototype.convertEscapeCharacters;
  Window_Base.prototype.convertEscapeCharacters = function(text){
    let t = _WB_convert.call(this, text);
    t = t.replace(/<showStolenCount:\s*(item|weapon|armor)\s+(\d+)\s*>/gi,
      (_,kind,id)=> String($gameParty.stolenCount(kind, Number(id))));
    t = t.replace(/<showStolenTotal\s*>/gi, String($gameParty.totalStolen()));
    t = t.replace(/<showContrabandTotal\s*>/gi, String(countContrabandDistinct()));
    return t;
  };
  function countContrabandDistinct(){
    let c=0;
    function test(obj){
      if (!obj) return;
      if ($gameParty.numItems(obj)<=0) return;
      const meta = parseContrabandNote(obj); if (!meta) return;
      if (meta.permitSwitch>0 && $gameSwitches.value(meta.permitSwitch)) return;
      if (meta.equipOnly && !playerHasEquipped(obj)) return;
      c++;
    }
    for (let i=1;i<$dataItems.length;i++) test($dataItems[i]);
    for (let i=1;i<$dataWeapons.length;i++) test($dataWeapons[i]);
    for (let i=1;i<$dataArmors.length;i++) test($dataArmors[i]);
    return c;
  }

  //-----------------------------------------------------------------------------
  // Fence (UI)
  //-----------------------------------------------------------------------------
  function itemBasePrice(obj){ return obj && obj.price != null ? Number(obj.price)||0 : 0; }

  function fenceContext(){
    const ev = $gameMap && $gameMap._interpreter && $gameMap.event($gameMap._interpreter.eventId());
    const t = ev && ev._scFence;
    return {
      auth: t?.auth || 'TownGuards',
      scope: t?.scope || 'faction',
      payout: t?.payout ?? fencePayoutPercent,
      launder:t?.launder ?? fenceLaunderPercent,
      detect: t?.detect ?? fenceDetectChance,
      wanted: t?.wanted ?? fenceDetectWanted
    };
  }
  function maybeDetectAndPunish(C){
    if (C.detect<=0) return false;
    if (Math.random()*100 < C.detect){
      addWanted(C.auth, C.scope, C.wanted);
      addToast(`Fence bust! Wanted +${C.wanted} (${C.auth})`);
      return true;
    }
    return false;
  }

  function Window_FenceList(){ this.initialize(...arguments); }
  Window_FenceList.prototype = Object.create(Window_Selectable.prototype);
  Window_FenceList.prototype.constructor = Window_FenceList;
  Window_FenceList.prototype.initialize = function(rect){
    Window_Selectable.prototype.initialize.call(this, rect);
    this._data = [];
    this.refresh();
    this.select(0);
    this.activate();
  };
  Window_FenceList.prototype.maxItems = function(){ return this._data.length; };
  Window_FenceList.prototype.refresh = function(){
    this._data = [];
    const S = $gameParty._stolen;
    function pushKind(kind, db){
      for (const id in S[kind]){
        const n = S[kind][id]|0; if (n<=0) continue;
        const obj = db[Number(id)];
        if (obj) this._data.push({ kind, id:Number(id), n, obj });
      }
    }
    pushKind.call(this, 'items', $dataItems);
    pushKind.call(this, 'weapons', $dataWeapons);
    pushKind.call(this, 'armors', $dataArmors);
    Window_Selectable.prototype.refresh.call(this);
  };
  Window_FenceList.prototype.drawItem = function(i){
    const e = this._data[i]; if (!e) return;
    const r = this.itemRect(i);
    this.drawItemName(e.obj, r.x, r.y, r.width-120);
    this.drawText(`x${e.n}`, r.x + r.width-120, r.y, 50, 'right');
    const price = itemBasePrice(e.obj);
    this.changeTextColor(ColorManager.systemColor());
    this.drawText(`${price}g`, r.x + r.width-60, r.y, 60, 'right');
    this.resetTextColor();
  };
  Window_FenceList.prototype.item = function(){ return this._data[this.index()]||null; };

  function Window_FenceHelp(){ this.initialize(...arguments); }
  Window_FenceHelp.prototype = Object.create(Window_Base.prototype);
  Window_FenceHelp.prototype.constructor = Window_FenceHelp;
  Window_FenceHelp.prototype.initialize = function(rect){
    Window_Base.prototype.initialize.call(this, rect);
    this._text = '';
  };
  Window_FenceHelp.prototype.setText = function(t){
    if (this._text===t) return;
    this._text = t; this.refresh();
  };
  Window_FenceHelp.prototype.refresh = function(){
    this.contents.clear();
    this.drawTextEx(this._text, this.textPadding(), 0, this.contents.width);
  };

  function Window_FenceActions(){ this.initialize(...arguments); }
  Window_FenceActions.prototype = Object.create(Window_Command.prototype);
  Window_FenceActions.prototype.constructor = Window_FenceActions;
  Window_FenceActions.prototype.initialize = function(rect){
    Window_Command.prototype.initialize.call(this, rect);
    this._context = fenceContext();
  };
  Window_FenceActions.prototype.makeCommandList = function(){
    this.addCommand('Sell (all x1)', 'sell1');
    this.addCommand('Sell (choose amount)', 'sell');
    this.addCommand('Launder (x1)', 'launder1');
    this.addCommand('Launder (choose amount)', 'launder');
    this.addCommand('Close', 'cancel');
  };

  function Scene_Fence(){ this.initialize.apply(this, arguments); }
  Scene_Fence.prototype = Object.create(Scene_MenuBase.prototype);
  Scene_Fence.prototype.constructor = Scene_Fence;
  Scene_Fence.prototype.create = function(){
    if (!enableFence){ this.popScene(); return; }
    Scene_MenuBase.prototype.create.call(this);
    const y0 = this.mainAreaTop();
    const listH = this.calcWindowHeight(10,true);
    const listR = new Rectangle(0, y0, Graphics.boxWidth, listH);
    this._list = new Window_FenceList(listR);
    this.addWindow(this._list);

    const helpR = new Rectangle(0, y0+listH, Graphics.boxWidth, this.calcWindowHeight(2,false));
    this._help = new Window_FenceHelp(helpR);
    this.addWindow(this._help);

    const actR = new Rectangle(0, helpR.y+helpR.height, Graphics.boxWidth, this.calcWindowHeight(1,true));
    this._acts = new Window_FenceActions(actR);
    this.addWindow(this._acts);

    this._list.setHandler('ok', ()=>{ this._acts.activate(); this._acts.select(0); });
    this._list.setHandler('cancel', ()=> this.popScene());
    this._acts.setHandler('sell1', ()=> this.doFenceAction('sell', 1));
    this._acts.setHandler('sell', ()=> this.doFenceAction('sell', 0));
    this._acts.setHandler('launder1',()=> this.doFenceAction('launder', 1));
    this._acts.setHandler('launder', ()=> this.doFenceAction('launder', 0));
    this._acts.setHandler('cancel', ()=> { this._list.activate(); this._acts.select(0); });

    this.updateHelp();
  };
  Scene_Fence.prototype.update = function(){
    Scene_MenuBase.prototype.update.call(this);
    this.updateHelp();
  };
  Scene_Fence.prototype.updateHelp = function(){
    const it = this._list.item();
    const C = this._acts._context;
    if (!it){ this._help.setText('No stolen items.'); return; }
    const base = itemBasePrice(it.obj);
    const pay = Math.floor(base * (C.payout/100));
    const fee = Math.floor(base * (C.launder/100));
    const t = `Payout: ~${pay}g ea Launder Fee: ~${fee}g ea Detect: ${C.detect}% (Wanted +${C.wanted})`;
    this._help.setText(t);
  };
  Scene_Fence.prototype.doFenceAction = function(kind, chooseAmount){
    const e = this._list.item(); if (!e) return;
    const C = this._acts._context;
    const base = itemBasePrice(e.obj);
    const pay = Math.floor(base * (C.payout/100));
    const fee = Math.floor(base * (C.launder/100));
    let n = 1;
    if (chooseAmount===0){
      n = Math.max(1, Math.min(e.n, promptNumber(`Amount (1..${e.n})`, e.n) ));
      if (!Number.isFinite(n)) n=1;
    }
    if (n<1) n=1; if (n>e.n) n=e.n;

    if (kind==='sell'){
      const gold = pay*n;
      $gameParty.gainGold(gold);
      $gameParty.unmarkStolen(e.kind.slice(0,-1), e.id, n);
      addToast(toastOnFence.replace('{ACT}','Sold').replace('{NAME}', e.obj.name).replace('{N}', String(n)).replace('{G}', String(gold)));
      maybeDetectAndPunish(C);
    } else {
      const cost = fee*n;
      if ($gameParty.gold() < cost){ addToast('Not enough gold to launder.'); return; }
      $gameParty.loseGold(cost);
      $gameParty.unmarkStolen(e.kind.slice(0,-1), e.id, n);
      addToast(toastOnFence.replace('{ACT}','Launder').replace('{NAME}', e.obj.name).replace('{N}', String(n)).replace('{G}', String(cost)));
      maybeDetectAndPunish(C);
    }
    this._list.refresh();
    this._list.activate();
  };

  function promptNumber(msg, defVal){
    const s = window.prompt(msg, String(defVal));
    if (s==null) return NaN;
    const v = Number(s);
    return Number.isFinite(v)?v:NaN;
  }

  //-----------------------------------------------------------------------------
  // Shop Scanner (comment tag parser + command302 guard)
  //-----------------------------------------------------------------------------
  let _sc_shopScanCfg = null;
  function parseShopScanTag(text){
    if (!text) return;
    const rx = /<contraband\s+scanner:\s*([^>]+)>/i;
    const m = text.match(rx);
    if (!m) return;
    const body = m[1];
    function pick(re, def){ const mm = body.match(re); return mm ? mm[1] : def; }
    _sc_shopScanCfg = {
      auth: S(pick(/authority\s*:\s*([^\s]+)/i, dScannerAuthority)),
      scope: S(pick(/scope\s*:\s*(faction|location)/i, dScannerScope)),
      mode: S(pick(/mode\s*:\s*(block|warn)/i, scannerDefaultMode)),
      repMin:N(pick(/repExemptMin\s*:\s*(-?\d+)/i, scannerRepExemptMin)),
      repType:S(pick(/type\s*:\s*(\w+)/i, scannerRepType)),
      permit:N(pick(/permitSwitch\s*:\s*(\d+)/i, scannerPermitSwitch)),
      list: /list\s*:\s*on/i.test(body),
      ce: N(pick(/ce\s*:\s*(\d+)/i, 0)),
      toast: S(pick(/toast\s*:\s*\"([^"]*)\"/i, scannerToastDefault))
    };
  }
  const _GI_c108 = Game_Interpreter.prototype.command108;
  Game_Interpreter.prototype.command108 = function(){
    try {
      const cmd = this.currentCommand && this.currentCommand();
      const txt = cmd && cmd.parameters ? cmd.parameters[0] : null;
      parseShopScanTag(String(txt||''));
    } catch(_) {}
    return _GI_c108 ? _GI_c108.apply(this, arguments) : true;
  };
  const _GI_c408 = Game_Interpreter.prototype.command408;
  Game_Interpreter.prototype.command408 = function(){
    try {
      const cmd = this.currentCommand && this.currentCommand();
      const txt = cmd && cmd.parameters ? cmd.parameters[0] : null;
      parseShopScanTag(String(txt||''));
    } catch(_) {}
    return _GI_c408 ? _GI_c408.apply(this, arguments) : true;
  };

  function carryingContrabandFor(auth, scope, {repMin, repType, permit}){
    let found=false, names=[];
    for (let i=1;i<$dataItems.length;i++){ const o=$dataItems[i]; const n=$gameParty.numItems(o); if (o&&n>0 && isCB(o)) push(o,n); }
    for (let i=1;i<$dataWeapons.length;i++){ const o=$dataWeapons[i]; const n=$gameParty.numItems(o); if (o&&n>0 && isCB(o)) push(o,n); }
    for (let i=1;i<$dataArmors.length;i++){ const o=$dataArmors[i]; const n=$gameParty.numItems(o); if (o&&n>0 && isCB(o)) push(o,n); }
    return {found, names};
    function isCB(o){
      const c=parseContrabandNote(o); if (!c) return false;
      if (c.auth!==auth || (c.scope||'faction')!==(scope||'faction')) return false;
      if (permit>0 && $gameSwitches.value(permit)) return false;
      if (c.permitSwitch>0 && $gameSwitches.value(c.permitSwitch)) return false;
      const r = getRep(c.auth, repType||'default'); if (repMin!=null && r>=repMin) return false;
      return true;
    }
    function push(o,n){ if (!found) found=true; if (names.length<scannerListMax) names.push(`${o.name}x${n}`); }
  }

  const _GI_c302 = Game_Interpreter.prototype.command302;
  Game_Interpreter.prototype.command302 = function(params){
    if (!enableShopScanner) return _GI_c302.apply(this, arguments);
    const cfg = _sc_shopScanCfg || {
      auth:dScannerAuthority, scope:dScannerScope, mode:scannerDefaultMode,
      repMin:scannerRepExemptMin, repType:scannerRepType, permit:scannerPermitSwitch,
      list:scannerShowList, ce:0, toast:scannerToastDefault
    };
    _sc_shopScanCfg = null;

    // Waiver?
    if (waiverActive(cfg.auth, cfg.scope)) return _GI_c302.apply(this, arguments);

    const {found, names} = carryingContrabandFor(cfg.auth, cfg.scope, cfg);
    if (!found) return _GI_c302.apply(this, arguments);

    if (cfg.mode==='warn'){
      addToast(cfg.toast + (cfg.list && names.length? ` [${names.join(', ')}]` : ''));
      return _GI_c302.apply(this, arguments);
    } else {
      addToast(cfg.toast + (cfg.list && names.length? ` [${names.join(', ')}]` : ''));
      if (cfg.ce>0) $gameTemp.reserveCommonEvent(cfg.ce);
      return true; // swallow
    }
  };

  //-----------------------------------------------------------------------------
  // Seizure + Evidence UI
  //-----------------------------------------------------------------------------
  function eachContrabandFor(auth, scope, fn){
    function testList(db, kind){
      for (let i=1;i<db.length;i++){
        const obj=db[i]; if (!obj) continue;
        const meta = parseContrabandNote(obj); if (!meta) continue;
        if (meta.auth!==auth || (meta.scope||'faction')!==(scope||'faction')) continue;
        const n = $gameParty.numItems(obj);
        if (n>0) fn(kind, obj, meta, n);
      }
    }
    testList($dataItems, 'item'); testList($dataWeapons,'weapon'); testList($dataArmors,'armor');
  }

  function seizeContraband(auth, scope, {mode=seizeModeDefault, respectEO=seizeRespectEquipOnly}={}){
    if (!enableArrestSeizure) return 0;
    let seized=0;
    eachContrabandFor(auth, scope, (kind, obj, meta, n)=>{
      if (meta.permitSwitch>0 && $gameSwitches.value(meta.permitSwitch)) return;
      if (respectEO && meta.equipOnly && !playerHasEquipped(obj)) return;
      if (parseSeizeExempt(obj)) return;
      if (n<=0) return;
      $gameParty.loseItem(obj, n, false);
      seized += n;
      if (mode==='stash') stashAdd(kind, obj.id, n);
    });
    return seized;
  }

  function evidenceValueSum(){
    let sum=0;
    function each(db, bag){ for (const id in bag){ const n=bag[id]|0; if (n>0){ const obj=db[Number(id)]; sum += (obj?.price||0)*n; } } }
    each($dataItems, $gameSystem._scEvidence.items);
    each($dataWeapons, $gameSystem._scEvidence.weapons);
    each($dataArmors, $gameSystem._scEvidence.armors);
    return sum;
  }

  function Window_EvidenceList(){ this.initialize(...arguments); }
  Window_EvidenceList.prototype = Object.create(Window_Selectable.prototype);
  Window_EvidenceList.prototype.constructor = Window_EvidenceList;
  Window_EvidenceList.prototype.initialize = function(rect){
    Window_Selectable.prototype.initialize.call(this, rect);
    this._data = [];
    this.refresh();
    this.select(0);
    this.activate();
  };
  Window_EvidenceList.prototype.maxItems = function(){ return this._data.length; };
  Window_EvidenceList.prototype.refresh = function(){
    this._data = [];
    function pushKind(kind, db){
      const bag = $gameSystem._scEvidence[TYPES[kind]];
      for (const id in bag){
        const n = bag[id]|0; if (n<=0) continue;
        const obj = db[Number(id)];
        if (obj) this._data.push({ kind, id:Number(id), n, obj });
      }
    }
    pushKind.call(this,'items',$dataItems);
    pushKind.call(this,'weapons',$dataWeapons);
    pushKind.call(this,'armors',$dataArmors);
    Window_Selectable.prototype.refresh.call(this);
  };
  Window_EvidenceList.prototype.item = function(){ return this._data[this.index()]||null; };
  Window_EvidenceList.prototype.drawItem = function(i){
    const e = this._data[i]; if (!e) return;
    const r = this.itemRect(i);
    this.drawItemName(e.obj, r.x, r.y, r.width-160);
    this.drawText(`x${e.n}`, r.x + r.width-100, r.y, 40, 'right');
    this.changeTextColor(ColorManager.systemColor());
    this.drawText(`${e.obj.price||0}g`, r.x + r.width-60, r.y, 60, 'right');
    this.resetTextColor();
  };

  function Window_EvidenceActions(){ this.initialize(...arguments); }
  Window_EvidenceActions.prototype = Object.create(Window_Command.prototype);
  Window_EvidenceActions.prototype.constructor = Window_EvidenceActions;
  Window_EvidenceActions.prototype.initialize = function(rect){ Window_Command.prototype.initialize.call(this, rect); };
  Window_EvidenceActions.prototype.makeCommandList = function(){
    this.addCommand('Return Selected x1', 'ret1');
    this.addCommand('Return Selected (choose)', 'ret');
    this.addCommand('Return All', 'retAll');
    if (enableEvidenceSell) this.addCommand('Convert All → Gold', 'sellAll');
    this.addCommand('Close', 'cancel');
  };

  function Scene_Evidence(){ this.initialize.apply(this, arguments); }
  Scene_Evidence.prototype = Object.create(Scene_MenuBase.prototype);
  Scene_Evidence.prototype.constructor = Scene_Evidence;
  Scene_Evidence.prototype.create = function(){
    Scene_MenuBase.prototype.create.call(this);
    const y0 = this.mainAreaTop();
    const listH = this.calcWindowHeight(10,true);
    const listR = new Rectangle(0, y0, Graphics.boxWidth, listH);
    this._list = new Window_EvidenceList(listR); this.addWindow(this._list);

    const sumVal = evidenceValueSum();
    const actR = new Rectangle(0, y0+listH, Graphics.boxWidth, this.calcWindowHeight(1,true));
    this._acts = new Window_EvidenceActions(actR); this.addWindow(this._acts);
    this._footerText = new Window_Base(new Rectangle(0, actR.y+actR.height, Graphics.boxWidth, this.calcWindowHeight(1,false)));
    this.addWindow(this._footerText);
    this._footerText.drawText(`Total (market): ~${sumVal}g Convert %: ${evidenceSellPercent}%`, this._footerText.textPadding(), 0, this._footerText.contents.width);

    this._list.setHandler('ok', ()=>{ this._acts.activate(); this._acts.select(0); });
    this._list.setHandler('cancel', ()=> this.popScene());
    this._acts.setHandler('ret1', ()=> this.returnSelected(1));
    this._acts.setHandler('ret', ()=> this.returnSelected(0));
    this._acts.setHandler('retAll', ()=> evidenceReturnAll());
    this._acts.setHandler('sellAll',()=> this.convertAll());
    this._acts.setHandler('cancel', ()=> { this._list.activate(); });
    this._list.activate();
  };
  Scene_Evidence.prototype.returnSelected = function(amount){
    const e = this._list.item(); if (!e) return;
    let n = amount===1 ? 1 : Math.max(1, Math.min(e.n, promptNumber(`Amount (1..${e.n})`, e.n) ));
    if (!Number.isFinite(n)) n=1;
    const take = stashTake(e.kind, e.id, n);
    if (take>0) $gameParty.gainItem(e.obj, take);
    this._list.refresh();
  };
  function evidenceReturnAll(){
    let ret=0;
    function giveBack(db, kind){
      const bag = $gameSystem._scEvidence[TYPES[kind]];
      for (const id in bag){
        const amt = stashTake(kind, Number(id), bag[id]|0);
        if (amt>0){ $gameParty.gainItem(db[Number(id)], amt); ret += amt; }
      }
    }
    giveBack($dataItems,'item'); giveBack($dataWeapons,'weapon'); giveBack($dataArmors,'armor');
    if (ret>0) addToast(`Evidence returned: ${ret}`);
  }
  Scene_Evidence.prototype.convertAll = function(){
    if (!enableEvidenceSell) return;
    let gold=0;
    function drain(db, kind){
      const bag = $gameSystem._scEvidence[TYPES[kind]];
      for (const id in bag){
        const n = stashTake(kind, Number(id), bag[id]|0);
        if (n>0){ const obj=db[Number(id)]; gold += Math.floor((obj?.price||0)*n * (evidenceSellPercent/100)); }
      }
    }
    drain($dataItems,'item'); drain($dataWeapons,'weapon'); drain($dataArmors,'armor');
    if (gold>0){ $gameParty.gainGold(gold); addToast(`Evidence converted: +${gold}g`); }
    this._list.refresh();
  };

  //-----------------------------------------------------------------------------
  // Plugin commands
  //-----------------------------------------------------------------------------
  PluginManager.registerCommand(PLUGIN, 'OpenFence', ()=>{ if (!enableFence){ addToast('Fence disabled.'); return; } SceneManager.push(Scene_Fence); });
  PluginManager.registerCommand(PLUGIN, 'ClearStolenAll', ()=> $gameParty.clearStolenAll());
  PluginManager.registerCommand(PLUGIN, 'MarkStolen', args=>{
    const kind = S(args.type||'item').toLowerCase();
    const id = N(args.id||0);
    const amt = N(args.amount||1);
    if (TYPES[kind] && id>0 && amt!==0) $gameParty.markStolen(kind, id, amt);
  });
  PluginManager.registerCommand(PLUGIN, 'DebugDumpStolen', ()=>{
    log('STOLEN REG:', JSON.stringify($gameParty._stolen, null, 2));
    log('EVIDENCE :', JSON.stringify($gameSystem._scEvidence, null, 2));
    log('HEAT :', $gameSystem._scHeat);
    log('WAIVERS :', JSON.stringify($gameSystem._scWaiver||{}, null, 2));
  });

  PluginManager.registerCommand(PLUGIN, 'SeizeContraband', args=>{
    if (!enableArrestSeizure) return;
    const auth = S(args.authority||dSeizeAuthority);
    const scope= S(args.scope||dSeizeScope);
    const mode = S(args.mode||seizeModeDefault);
    const respectEO = (args.respectEquipOnly!=null) ? (String(args.respectEquipOnly).toLowerCase()==='on') : seizeRespectEquipOnly;
    const n = seizeContraband(auth, scope, {mode, respectEO});
    if (n>0) addToast(seizeToast.replace('{N}', String(n)).replace('{AUTH}', auth));
  });
  PluginManager.registerCommand(PLUGIN, 'OpenEvidence', ()=> SceneManager.push(Scene_Evidence));
  PluginManager.registerCommand(PLUGIN, 'ReturnEvidenceAll', ()=> evidenceReturnAll());
  PluginManager.registerCommand(PLUGIN, 'EvidenceConvertAll', ()=> { if (enableEvidenceSell) { const sc = new Scene_Evidence(); } });

  PluginManager.registerCommand(PLUGIN, 'GrantScannerWaiver', args=>{
    const auth=S(args.authority||dScannerAuthority);
    const scope=S(args.scope||dScannerScope);
    const secs=N(args.seconds||60);
    grantWaiver(auth, scope, secs);
  });

  PluginManager.registerCommand(PLUGIN, 'SetOption', args=>{
    const key=S(args.key||'');
    const val=S(args.value||'');
    const bool = (v)=> ['true','on','1','yes'].includes(String(v).toLowerCase());
    switch(key){
      case 'enableTheft': enableTheft=bool(val); break;
      case 'enableLOS': enableLOS=bool(val); break;
      case 'enableContraband': enableContraband=bool(val); break;
      case 'enableFence': enableFence=bool(val); break;
      case 'enableShopScanner': enableShopScanner=bool(val); break;
      case 'enableArrestSeizure': enableArrestSeizure=bool(val); break;
      case 'enableHearing': enableHearing=bool(val); break;
      case 'enableHotDecay': enableHotDecay=bool(val); break;
      case 'enableEvidenceSell': enableEvidenceSell=bool(val); break;
      case 'enableHeat': enableHeat=bool(val); break;
      case 'enableFriendRepExempt': enableFriendRepExempt=bool(val); break;
      case 'enableDisguises': enableDisguises=bool(val); break;
      default: addToast(`Unknown option: ${key}`); break;
    }
  });

  PluginManager.registerCommand(PLUGIN, 'AddHeat', args=> addHeat(N(args.amount||1)));
  PluginManager.registerCommand(PLUGIN, 'SetHeat', args=> { $gameSystem._scHeat = Math.max(0, Math.min(heatMax, N(args.value||0))); });
  PluginManager.registerCommand(PLUGIN, 'ClearHeat', _=> { $gameSystem._scHeat = 0; });

  //-----------------------------------------------------------------------------
  // Evidence helpers (API)
  //-----------------------------------------------------------------------------
  window.SC_SeizeContraband = function(auth, scope, opts){ return seizeContraband(auth||dSeizeAuthority, scope||dSeizeScope, opts||{}); };
  window.SC_OpenEvidence = function(){ SceneManager.push(Scene_Evidence); };
  window.SC_ReturnEvidenceAll = evidenceReturnAll;
  window.SC_GrantWaiver = grantWaiver;

})();
