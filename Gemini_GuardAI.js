//=============================================================================
// Gemini_GuardAI.js  v1.0.1
// - Fix: auto-open Surrender uses BW_openSurrender when available
//=============================================================================
/*:
 * @target MZ
 * @plugindesc v1.0.1 Guard AI: warns, opens Surrender UI (Pay Fine/Bribe), optional battle. (Bounty/Warrants aware)
 * @author Gemini
 *
 * @param defaultScope @type select @option faction @option location @default faction
 * @param defaultScanRange @text Default Scan Range (tiles) @type number @default 6
 * @param defaultWarn @text Threshold: Warn @type number @default 25
 * @param defaultDetain @text Threshold: Detain (open Surrender) @type number @default 75
 * @param defaultHunt @text Threshold: Hunt (battle) @type number @default 150
 * @param defaultLOS @text Require Straight-Line LOS @type boolean @default false
 * @param defaultOpenSurrender @type boolean @default true
 * @param allowBattle @text Allow Battle at Hunt Threshold @type boolean @default false
 * @param battleTroopId @type troop @default 1
 * @param scanIntervalFrames @type number @default 10
 * @param warnBalloon @type number @default 1
 * @param detainBalloon @type number @default 2
 * @param warnCooldownFrames @type number @default 120
 * @param detainCooldownFrames @type number @default 240
 * @param safeSwitchId @text Global Safe Switch @type switch @default 0
 * @param safeRegions @text Safe Regions (CSV) @type string @default
 * @param debugLogs @type boolean @default false
 *
 * @help
 * Tag a guard event page with:
 *   <guard: TownGuards scope:faction range:6 warn:25 detain:75 hunt:150 los:off open:on>
 * Optional:
 *   <guard warnText: Halt! {name} suspects you ({wanted}).>
 *   <guard detainText: {name} demands you settle your charges.>
 */
(() => { "use strict";
  const PN="Gemini_GuardAI", P=PluginManager.parameters(PN);
  const s=x=>String(x??"").trim(), n=x=>Number(x??0), b=x=>String(x??"false")==="true";
  const arr=csv=>s(csv).length?s(csv).split(/\s*,\s*/).map(Number).filter(v=>!isNaN(v)):[];
  const DEF={
    scope:s(P.defaultScope||"faction"),
    range:n(P.defaultScanRange||6),
    warn:n(P.defaultWarn||25),
    det:n(P.defaultDetain||75),
    hunt:n(P.defaultHunt||150),
    los:b(P.defaultLOS||"false"),
    open:b(P.defaultOpenSurrender||"true"),
    allowBattle:b(P.allowBattle||"false"),
    troopId:n(P.battleTroopId||1),
    scanF:n(P.scanIntervalFrames||10),
    warnBalloon:n(P.warnBalloon||1),
    detBalloon:n(P.detainBalloon||2),
    warnCD:n(P.warnCooldownFrames||120),
    detCD:n(P.detainCooldownFrames||240),
    safeSwitch:n(P.safeSwitchId||0),
    safeRegions:arr(P.safeRegions||""),
    debug:b(P.debugLogs||"false")
  };
  const hasBW = ()=> typeof getWanted==="function" && (typeof BW_openSurrender==="function" || typeof Scene_Surrender!=="undefined");
  const showName=id=> (typeof TR_getDisplayName==="function")?TR_getDisplayName(id):String(id||"");
  const showToast=txt=>{
    if ($gameSystem && typeof $gameSystem._pushToast==="function") $gameSystem._pushToast(txt);
    else if (SceneManager._scene && typeof Scene_Map.prototype.addRepToast==="function") SceneManager._scene.addRepToast(txt);
  };
  const straightLineLOS=(x1,y1,x2,y2)=> (x1===x2 || y1===y2);

  function parseGuard(list){
    if (!Array.isArray(list)) return null;
    const lines=[]; for (const cmd of list){ if ((cmd.code===108||cmd.code===408)&&cmd.parameters&&cmd.parameters[0]) lines.push(cmd.parameters[0]); }
    const blob=lines.join("\n");
    const tag=blob.match(/<guard:\s*([^>\s]+)([^>]*)>/i); if(!tag) return null;
    const entityId=s(tag[1]); const rest=s(tag[2]||"");
    const get=(key,f)=>{ const m=rest.match(new RegExp(`\\b${key}\\s*:\\s*([^\\s>]+)`,'i')); return m?s(m[1]):f; };
    const warnTextM=blob.match(/<guard\s+warnText:\s*([^>]+)>/i);
    const detainTextM=blob.match(/<guard\s+detainText:\s*([^>]+)>/i);
    return {
      id:entityId,
      scope:get('scope',DEF.scope),
      range:n(get('range',DEF.range)),
      warn:n(get('warn',DEF.warn)),
      det:n(get('detain',DEF.det)),
      hunt:n(get('hunt',DEF.hunt)),
      los:/los\s*:\s*on/i.test(rest)?true:(/los\s*:\s*off/i.test(rest)?false:DEF.los),
      open:/open\s*:\s*on/i.test(rest)?true:(/open\s*:\s*off/i.test(rest)?false:DEF.open),
      allowBattle:/battle\s*:\s*on/i.test(rest)?true:(/battle\s*:\s*off/i.test(rest)?false:DEF.allowBattle),
      troopId:n(get('battleTroop',DEF.troopId)),
      safeSwitch:n(get('safeSwitch',DEF.safeSwitch)),
      safeRegions:(()=>{ const v=get('safeRegions',''); if(!v) return DEF.safeRegions.slice(); return v.split(/\s*,\s*/).map(Number).filter(x=>!isNaN(x)); })(),
      warnText:warnTextM?s(warnTextM[1]):"",
      detainText:detainTextM?s(detainTextM[1]):""
    };
  }

  const _GE_setupPage=Game_Event.prototype.setupPage;
  Game_Event.prototype.setupPage=function(){ _GE_setupPage.call(this); this._guardCfg=null; this._guardWarnTick=0; this._guardDetainTick=0; if(!this.page())return; const cfg=parseGuard(this.list()); if(cfg&&cfg.id)this._guardCfg=cfg; };

  const _SM_update=Scene_Map.prototype.update;
  Scene_Map.prototype.update=function(){
    _SM_update.call(this);
    if (!hasBW()) return;
    this._ga_if=(this._ga_if||0)+1; if (this._ga_if % Math.max(1, DEF.scanF)!==0) return;

    const px=$gamePlayer.x, py=$gamePlayer.y;
    const safeSwitchGlobal=(DEF.safeSwitch>0 && $gameSwitches.value(DEF.safeSwitch));
    const hereRegion=$gameMap.regionId(px,py);
    const globalSafeRegion=DEF.safeRegions.includes(hereRegion);

    $gameMap.events().forEach(ev=>{
      const cfg=ev._guardCfg; if(!cfg) return;
      if (safeSwitchGlobal) return;
      if (cfg.safeSwitch>0 && $gameSwitches.value(cfg.safeSwitch)) return;

      const d=$gameMap.distance(px,py,ev.x,ev.y); if (d>cfg.range) return;
      if (cfg.los && !straightLineLOS(px,py,ev.x,ev.y)) return;

      const regionSafe = cfg.safeRegions.length ? cfg.safeRegions.includes(hereRegion) : globalSafeRegion;
      if (regionSafe) return;

      const w = getWanted(cfg.id, cfg.scope);
      if (w<=0) return;

      const face=()=>ev.turnTowardCharacter($gamePlayer);
      const balloon=i=>{ if(i>0) $gameTemp.requestBalloon(ev,i); };

      if (w >= cfg.warn){
        const now=Graphics.frameCount;
        if (now - (ev._guardWarnTick||0) >= Math.max(1, DEF.warnCD)){
          ev._guardWarnTick=now; face(); balloon(DEF.warnBalloon);
          const name=showName(cfg.id);
          const msg=cfg.warnText?cfg.warnText.replace(/\{name\}/g,name).replace(/\{wanted\}/g,String(w)): `Halt! ${name} suspects you (${w}).`;
          showToast(msg);
          if (DEF.debug) console.log('[GuardAI] WARN', cfg, 'wanted=', w);
        }
      }

      if (w >= cfg.det){
        const now=Graphics.frameCount;
        if (now - (ev._guardDetainTick||0) >= Math.max(1, DEF.detCD)){
          ev._guardDetainTick=now; face(); balloon(DEF.detBalloon);
          const name=showName(cfg.id);
          const msg=cfg.detainText?cfg.detainText.replace(/\{name\}/g,name).replace(/\{wanted\}/g,String(w)): `${name} demands you settle your charges.`;
          showToast(msg);
          if (cfg.open){
            try {
              if (typeof BW_openSurrender === 'function') {
                BW_openSurrender(cfg.id, cfg.scope);
              } else if (typeof Scene_Surrender !== 'undefined') {
                SceneManager.push(Scene_Surrender);
                SceneManager._scene.setTarget(cfg.id, cfg.scope);
              } else {
                if (DEF.debug) console.warn('[GuardAI] No BW_openSurrender / Scene_Surrender visible.');
              }
            } catch(e){ if (DEF.debug) console.warn('[GuardAI] open surrender failed', e); }
          }
          if (cfg.allowBattle && w >= cfg.hunt){
            try { BattleManager.setup(Math.max(1,cfg.troopId||DEF.troopId),true,true); BattleManager.onEncounter(); SceneManager.push(Scene_Battle); }
            catch(e){ if (DEF.debug) console.warn('[GuardAI] battle failed', e); }
          }
          if (DEF.debug) console.log('[GuardAI] DETAIN', cfg, 'wanted=', w);
        }
      }
    });
  };
})();
