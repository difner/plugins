//=============================================================================
// Gemini_GuardPatrolAI.js  v0.3.6
// Guard patrols + vision + warn/detain/report + smoothing + multi-line tags
// - Bulletproof rep read (getRep or <showRep: ...>)
// - Friendly ignore (respects Wanted unless you override)
// - NEW: Auto-Detain when Wanted >= threshold (configurable trigger)
// - Smoother movement: patrol/chase don't queue moves while isMoving()
//=============================================================================
/*:
 * @target MZ
 * @plugindesc v0.3.6 Guard patrols + vision + warn/detain + auto-detain-by-wanted + smoothing
 * @author Gemini
 * @help
 * Place AFTER: TownReputation, Gemini_BountyWarrants.
 *
 * Example tags (one or multi-line OK)
 * <guard: TownGuards scope:faction range:6 warn:25 detain:75 fov:80 soft:120
 *         speed:2 chasespeed:4 freq:3 chasefreq:5 open:on>
 * <patrol: 10,12 | 18,12 | 18,18 | 10,18 loop wait:1.5>
 * <patrol: random radius:6 wait:1-3>
 * <patrol: random rect:5,6,20,14 wait:0.5-2>
 * <idle: scan lr period:1.2>
 *
 * @command enableAI
 * @text Enable Guard AI
 * @command disableAI
 * @text Disable Guard AI
 * @command toggleAI
 * @text Toggle Guard AI
 * @command setDebugVision
 * @text Set Debug Vision Overlay
 * @arg enabled @type boolean @default false
 *
 * @param ---Core---
 * @default
 * @param enabled @text AI Enabled @type boolean @default true
 * @param scanIntervalFrames @text Scan Interval (frames) @type number @default 6
 * @param warnCommonEvent @text Global On WARN → CE @type common_event @default 0
 * @param detainCommonEvent @text Global On DETAIN → CE @type common_event @default 0
 * @param reportCommonEvent @text Global On WARN → Report/Whistle CE @type common_event @default 0
 * @param reportCooldownSec @text Report Cooldown (sec) @type number @default 5
 * @param surrenderCommonEvent @text Fallback Surrender CE @type common_event @default 0
 * @param muteToastSwitchId @text Mute Toasts (Switch) @type switch @default 0
 * @param warnBalloonId @text Warn Balloon Icon @type number @default 1
 * @param detainBalloonId @text Detain Balloon Icon @type number @default 2
 *
 * @param ignoreIfFriendly @text Ignore if Friendly Rep @type boolean @default true
 * @param friendlyRepThreshold @text Friendly Rep Threshold @type number @default 50
 * @param friendlyIgnoreIgnoresWanted
 * @text Friendly Ignore Overrides Wanted
 * @type boolean @default false
 * @param debugFriendlyToast @text Toast when Friendly-Ignored @type boolean @default false
 * @param friendlyToastCooldownSec @text Friendly Toast Cooldown (sec) @type number @decimals 2 @default 2
 *
 * @param ---Vision---
 * @default
 * @param defaultRange @text Default Vision Range (tiles) @type number @default 6
 * @param defaultFov @text Default FOV (deg) @type number @default 80
 * @param defaultSoftFov @text Default Soft FOV (deg) @type number @default 120
 * @param respectWalls @text Respect Walls (raycast) @type boolean @default false
 * @param debugVision @text Debug Vision Overlay @type boolean @default false
 *
 * @param ---Movement---
 * @default
 * @param normalSpeed @text Guard Speed (normal) @type number @default 4
 * @param chaseSpeed @text Guard Speed (chase) @type number @default 5
 * @param normalFrequency @text Move Frequency (normal) @type number @default 4
 * @param chaseFrequency @text Move Frequency (chase) @type number @default 5
 * @param loseSightTimeSec @text Lose Sight Time (sec) @type number @default 3
 * @param coolDownSec @text Cooldown After Detain (sec) @type number @default 2
 * @param chaseHoldSec @text Min Chase Hold (sec) @type number @default 0.8
 * @param patrolHoldSec @text Min Patrol Hold (sec) @type number @default 0.6
 *
 * @param ---Smoothing & Triggers---
 * @default
 * @param chaseTriggerMode @text Chase Trigger Mode @type select @option warn @option see @option hard @default hard
 * @param chaseApplyDelaySec @text Require Sight For (sec) @type number @decimals 2 @default 0.50
 * @param resetWarnOnLost @text Reset WARN When Lost @type boolean @default true
 * @param useChaseFrequency @text Use Chase Move Frequency @type boolean @default false
 * @param speedRampFrames @text Speed Ramp Frames @type number @default 12
 *
 * @param ---Auto Detain by Wanted---
 * @default
 * @param autoDetainWantedThreshold
 * @text Auto-Detain Wanted ≥
 * @type number @default 50
 * @desc If player's Wanted for this entity/scope is at least this, guard detains on chosen trigger.
 *
 * @param autoDetainTrigger
 * @text Auto-Detain Trigger
 * @type select @option warn @option see @option hard @default see
 * @desc When to apply auto-detain check (same definitions as Chase Trigger Mode).
 *
 * @param autoDetainRespectsFriendly
 * @text Auto-Detain Respects Friendly Ignore
 * @type boolean @default false
 * @desc If true, friendly-ignore can still cancel auto-detain. Default false: auto-detain bypasses friendliness.
 */

(() => {
  'use strict';

  const P = PluginManager.parameters('Gemini_GuardPatrolAI')?.enabled !== undefined
    ? PluginManager.parameters('Gemini_GuardPatrolAI')
    : PluginManager.parameters('Gemini_GuardPatroAI');

  const b=x=>String(x??'false')==='true', n=x=>Number(x??0), s=x=>String(x??'').trim();

  // core
  const AI_ENABLED   = b(P.enabled||'true');
  const SCAN_F       = Math.max(1, n(P.scanIntervalFrames||6));
  const CE_WARN_G    = n(P.warnCommonEvent||0);
  const CE_DETAIN_G  = n(P.detainCommonEvent||0);
  const CE_REPORT_G  = n(P.reportCommonEvent||0);
  const REPORT_CD_S  = n(P.reportCooldownSec||5);
  const CEVT_FB      = n(P.surrenderCommonEvent||0);
  const MUTE_SW      = n(P.muteToastSwitchId||0);
  const WARN_BAL     = n(P.warnBalloonId||1);
  const DETAIN_BAL   = n(P.detainBalloonId||2);

  const IGN_FRIEND   = b(P.ignoreIfFriendly||'true');
  const FRIEND_THR   = n(P.friendlyRepThreshold||50);
  const FRIEND_OV_W  = b(P.friendlyIgnoreIgnoresWanted||'false');
  const DBG_FRIEND   = b(P.debugFriendlyToast||'false');
  const FRIEND_CD_S  = n(P.friendlyToastCooldownSec||2);

  // vision
  const DEF_RANGE    = n(P.defaultRange||6);
  const DEF_FOV      = n(P.defaultFov||80);
  const DEF_SOFT     = n(P.defaultSoftFov||120);
  const RESPECT_WALLS= b(P.respectWalls||'false');
  let   DEBUG_VISION = b(P.debugVision||'false');

  // movement
  const SPD_N        = n(P.normalSpeed||4);
  const SPD_C        = n(P.chaseSpeed||5);
  const FREQ_N       = n(P.normalFrequency||4);
  const FREQ_C       = n(P.chaseFrequency||5);
  const LOSE_S_S     = n(P.loseSightTimeSec||3);
  const COOLD_S      = n(P.coolDownSec||2);
  const HOLD_C_S     = n(P.chaseHoldSec||0.8);
  const HOLD_P_S     = n(P.patrolHoldSec||0.6);

  // triggers
  const TRIG_MODE    = String(P.chaseTriggerMode||'hard');
  const SEE_DELAY_S  = n(P.chaseApplyDelaySec||0.5);
  const RESET_WARN   = b(P.resetWarnOnLost||'true');
  const USE_CH_FREQ  = b(P.useChaseFrequency||'false');
  const RAMP_F       = n(P.speedRampFrames||12);

  // auto-detain
  const AD_WANTED    = n(P.autoDetainWantedThreshold||50);
  const AD_TRIGGER   = String(P.autoDetainTrigger||'see'); // warn|see|hard
  const AD_RESPECT   = b(P.autoDetainRespectsFriendly||'false');

  // commands
  const reg=(n)=>PluginManager.registerCommand(n,'setDebugVision',args=>{
    DEBUG_VISION = String(args.enabled||'false')==='true';
  });
  ['Gemini_GuardPatrolAI','Gemini_GuardPatroAI'].forEach(n=>{
    PluginManager.registerCommand(n,'enableAI', ()=>{$gameSystem._guardAIEnabled=true;});
    PluginManager.registerCommand(n,'disableAI',()=>{$gameSystem._guardAIEnabled=false;});
    PluginManager.registerCommand(n,'toggleAI', ()=>{$gameSystem._guardAIEnabled=!$gameSystem._guardAIEnabled;});
    ['startGuard','stopGuard','startPatrol','stopPatrol'].forEach(cmd=>{
      PluginManager.registerCommand(n,cmd, args=>{
        const id=Number(args.eventId||0); const ev = id>0 ? $gameMap.event(id) : $gameMap.event($gameMap._interpreter?.eventId());
        if (!ev || !ev._guardAI) return;
        if (cmd==='startGuard')  { ev._guardAI.active=true; forceApplySpeedFreq(ev); }
        if (cmd==='stopGuard')   { ev._guardAI.active=false; }
        if (cmd==='startPatrol') { ev._guardAI.patrolActive=true; }
        if (cmd==='stopPatrol')  { ev._guardAI.patrolActive=false; }
      });
    });
    reg(n);
  });

  // helpers
  const toastsMuted=()=> (MUTE_SW>0 && $gameSwitches.value(MUTE_SW));
  const addToast=(m)=>{ if (toastsMuted()) return; const sc=SceneManager._scene; sc?.addRepToast?.(String(m)); };
  const openSurrender=(entity,scope)=>{
    if (typeof BW_openSurrenderUI==='function') { BW_openSurrenderUI(entity,scope); return; }
    if ($gameSystem?.openSurrenderUI) { $gameSystem.openSurrenderUI(entity,scope); return; }
    if (CEVT_FB>0) $gameTemp.reserveCommonEvent(CEVT_FB);
  };
  const readWanted=(e,sc)=>{
    try { if (typeof BW_getWanted==='function') return Number(BW_getWanted(e,sc)||0); } catch(_){}
    try { if ($gameSystem?.getWanted) return Number($gameSystem.getWanted(e,sc)||0); } catch(_){}
    try { if (typeof getWanted==='function') return Number(getWanted(e,sc)||0); } catch(_){}
    return 0;
  };
  let _TR_repConvWin=null;
  function readRep(entity,type='default'){
    try { if (typeof getRep==='function') return Number(getRep(entity,type)||0); } catch(_){}
    try {
      if (!_TR_repConvWin) _TR_repConvWin = new Window_Base(new Rectangle(0,0,1,1));
      const tag = `<showRep: ${entity}${type&&type!=='default'?' type:'+type:''}>`;
      const out = _TR_repConvWin.convertEscapeCharacters(tag);
      const v = Number(String(out).replace(/[^\d\-]/g,'')); return isNaN(v)?0:v;
    } catch(_){}
    return 0;
  }

  // math/geom
  const dirVec=(d)=> d===2?{x:0,y:1}:d===4?{x:-1,y:0}:d===6?{x:1,y:0}:{x:0,y:-1};
  const angDeg=(ax,ay,bx,by)=>{ const dot=ax*bx+ay*by, ma=Math.max(1e-6,Math.hypot(ax,ay)), mb=Math.max(1e-6,Math.hypot(bx,by)); const c=Math.max(-1,Math.min(1,dot/(ma*mb))); return Math.acos(c)*180/Math.PI; };
  const dist=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
  function los(evx,evy,px,py){
    if (!RESPECT_WALLS) return true;
    const steps=Math.ceil(Math.max(Math.abs(px-evx),Math.abs(py-evy))*2);
    for (let i=1;i<=steps;i++){ const t=i/steps; const x=Math.round(evx+(px-evx)*t), y=Math.round(evy+(py-evy)*t);
      const pass=$gameMap.isPassable(x,y,2)||$gameMap.isPassable(x,y,4)||$gameMap.isPassable(x,y,6)||$gameMap.isPassable(x,y,8);
      if (!pass) return false;
    } return true;
  }

  // parse tags
  function pageCommentText(ev){ const out=[]; for (const c of ev.list()||[]) if (c.code===108||c.code===408) out.push(String(c.parameters[0]||'')); return out.join('\n'); }
  function parseGuard(text){
    const m=text.match(/<guard:\s*([^\s>]+)([\s\S]*?)>/i); if(!m) return null;
    const e=s(m[1]), r=m[2]||'';
    return {
      entity:e, scope:(r.match(/scope:\s*(faction|location)/i)?.[1]||'faction').toLowerCase(),
      range:Number(r.match(/range:\s*(\d+)/i)?.[1]||DEF_RANGE),
      warn:Number(r.match(/warn:\s*(\d+)/i)?.[1]||25),
      detain:Number(r.match(/detain:\s*(\d+)/i)?.[1]||75),
      fov:Number(r.match(/fov:\s*(\d+)/i)?.[1]||DEF_FOV),
      soft:Number(r.match(/soft:\s*(\d+)/i)?.[1]||DEF_SOFT),
      speed:Number(r.match(/speed:\s*(\d+)/i)?.[1]||SPD_N),
      chaseSpeed:Number(r.match(/chasespeed:\s*(\d+)/i)?.[1]||SPD_C),
      freq:Number(r.match(/freq:\s*(\d+)/i)?.[1]||FREQ_N),
      chaseFreq:Number(r.match(/chasefreq:\s*(\d+)/i)?.[1]||FREQ_C),
      onwarnCE:Number(r.match(/onwarn:\s*(\d+)/i)?.[1]||0),
      ondetainCE:Number(r.match(/ondetain:\s*(\d+)/i)?.[1]||0),
      reportCE:Number(r.match(/reportce:\s*(\d+)/i)?.[1]||0),
      active:/open:\s*on/i.test(r),
      suspicion:0, warned:false, chasing:false, lastSeeF:0, state:'patrol',
      patrolActive:false, coolUntilF:0, waitUntilF:0, reportUntilF:0,
      chaseSinceF:0, patrolSinceF:0, seeFrames:0, curSpeed:0, targetSpeed:0, rampTick:0, _freqState:null,
      _lastFriendlyToastF:0
    };
  }
  function parsePatrol(text){
    const m=text.match(/<patrol:\s*([\s\S]*?)>/i); if(!m) return null;
    const b=m[1];
    const r1=b.match(/random\s+radius\s*:\s*(\d+)(?:[\s\S]*?wait\s*:\s*([0-9.]+)\s*-\s*([0-9.]+))?/i);
    const r2=b.match(/random\s+rect\s*:\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:[\s\S]*?wait\s*:\s*([0-9.]+)\s*-\s*([0-9.]+))?/i);
    const w =b.match(/wait\s*:\s*([0-9.]+)(?!-)/i);
    const loop=/loop/i.test(b);
    if (r1) return {mode:'randomRadius', radius:Number(r1[1]||5), waitMinSec:Number(r1[2]||0), waitMaxSec:Number(r1[3]||Number(r1[2]||0)), loop:true, target:null};
    if (r2) return {mode:'randomRect', rect:{x1:Number(r2[1]),y1:Number(r2[2]),x2:Number(r2[3]),y2:Number(r2[4])}, waitMinSec:Number(r2[5]||0), waitMaxSec:Number(r2[6]||Number(r2[5]||0)), loop:true, target:null};
    const pts=b.replace(/loop|wait\s*:[^|]+/ig,'').split('|').map(s0=>{ const mm=s0.trim().match(/(\d+)\s*,\s*(\d+)/); return mm?{x:Number(mm[1]),y:Number(mm[2])}:null;}).filter(Boolean);
    return {mode:'fixed', points:pts, loop, index:0, dir:1, waitSec:Number(w?.[1]||0)};
  }
  function parseIdle(text){ const m=text.match(/<idle:\s*scan(?:\s+(lr|cross))?(?:\s+period\s*:\s*([0-9.]+))?\s*>/i); if(!m) return null; return {mode:(m[1]||'lr').toLowerCase(), periodSec:Number(m[2]||1.2), nextF:0, idx:0}; }

  // setup
  const _GE_setupPage=Game_Event.prototype.setupPage;
  Game_Event.prototype.setupPage=function(){
    _GE_setupPage.call(this);
    this._guardAI=null; if(!this.page()) return;
    const txt=pageCommentText(this);
    const g=parseGuard(txt), p=parsePatrol(txt), i=parseIdle(txt);
    if (g){ this._guardAI=g; g.curSpeed=g.speed; g.targetSpeed=g.speed; forceApplySpeedFreq(this); }
    if (this._guardAI&&p){ this._guardAI.patrol=p; this._guardAI.patrolActive=true; }
    if (this._guardAI&&i){ this._guardAI.idleScan=i; }
  };

  function forceApplySpeedFreq(ev){
    const G=ev._guardAI; if(!G) return;
    ev.setMoveSpeed(Math.max(1,Math.min(6,Math.round(G.curSpeed||G.speed))));
    const nf=(USE_CH_FREQ && G.chasing)?G.chaseFreq:G.freq;
    if (G._freqState!==nf){ ev.setMoveFrequency(nf); G._freqState=nf; }
  }
  function setChaseState(ev,ch){ const G=ev._guardAI; if(!G) return; if(G.chasing===ch) return;
    G.chasing=ch; G.targetSpeed=ch?G.chaseSpeed:G.speed;
    if (USE_CH_FREQ){ const nf=ch?G.chaseFreq:G.freq; if(G._freqState!==nf){ ev.setMoveFrequency(nf); G._freqState=nf; } }
  }

  // update
  const _GE_update=Game_Event.prototype.update;
  Game_Event.prototype.update=function(){
    _GE_update.call(this);
    const G=this._guardAI; if(G){ updateSpeedRamp(this,G); } if(!G) return;
    if (!($gameSystem._guardAIEnabled ?? AI_ENABLED)) return;
    if (!G.active) return;

    // FRIENLDY IGNORE (respects Wanted unless FRIEND_OV_W)
    const fps=60;
    if (IGN_FRIEND){
      const rep=readRep(G.entity,'default');
      const wanted=readWanted(G.entity,G.scope);
      const canIgnore = rep>=FRIEND_THR && (FRIEND_OV_W || wanted<=0);
      if (canIgnore){
        G.suspicion=0; G.warned=false; if(G.chasing) setChaseState(this,false); G.state='patrol';
        // keep patrol running & overlay visible
        if (G.patrolActive && G.patrol) patrolStep(this,G); else idleScanTick(this,G);
        if (DEBUG_VISION && SceneManager._scene?._spriteset) drawVision(SceneManager._scene._spriteset,this,G);
        if (DBG_FRIEND){
          const cd=Math.floor(Math.max(1,FRIEND_CD_S*fps));
          if (!G._lastFriendlyToastF || Graphics.frameCount-G._lastFriendlyToastF>=cd){
            G._lastFriendlyToastF=Graphics.frameCount; addToast(`${G.entity}: Friendly (${rep}) — ignoring`);
          }
        }
        return;
      }
    }

    // throttle / cooldown
    if ((Graphics.frameCount % SCAN_F) !== 0) return;
    if (G.coolUntilF && Graphics.frameCount < G.coolUntilF) return;

    const px=$gamePlayer.x, py=$gamePlayer.y, evx=this.x, evy=this.y;

    // vision & suspicion
    let see=false, inHard=false;
    const within = dist(evx,evy,px,py) <= G.range+0.001;
    if (within){
      const dv=dirVec(this.direction()), vx=(px-evx), vy=(py-evy);
      const ang=angDeg(dv.x,dv.y,vx,vy);
      inHard = (ang <= (G.fov*0.5+0.001));
      const inSoft = (ang <= (G.soft*0.5+0.001));
      if (los(evx,evy,px,py) && (inHard||inSoft)){
        see=true;
        const distTiles=Math.max(0.25,dist(evx,evy,px,py));
        const wanted=readWanted(G.entity,G.scope);
        const base=(inHard?2.5:1.2), wmul=(wanted>0?1+Math.min(2,wanted/50):0.4);
        const gain=(base*wmul)/distTiles;
        G.suspicion=Math.min(100,G.suspicion+gain);
        G.lastSeeF=Graphics.frameCount;
        G.seeFrames += SCAN_F;
      } else { G.seeFrames=0; }
    } else { G.seeFrames=0; }

    if (!see) G.suspicion=Math.max(0,G.suspicion-1.5);

    // warn
    if (!G.warned && G.suspicion >= G.warn){
      G.warned=true; if (WARN_BAL>0) $gameTemp.requestBalloon(this,WARN_BAL);
      addToast(`${G.entity}: Halt!`);
      const ceW=G.onwarnCE||CE_WARN_G; if (ceW>0) $gameTemp.reserveCommonEvent(ceW);
      const cdF=Math.floor(REPORT_CD_S*60), ceR=G.reportCE||CE_REPORT_G;
      if (ceR>0 && Graphics.frameCount >= (G.reportUntilF||0)){ $gameTemp.reserveCommonEvent(ceR); G.reportUntilF=Graphics.frameCount+cdF; }
    }

    const lost=(Graphics.frameCount - (G.lastSeeF||0)) > Math.floor(LOSE_S_S*60);
    if (lost && RESET_WARN) G.warned=false;

    // chase trigger
    const needSeeF=Math.floor(Math.max(0,SEE_DELAY_S)*60);
    let trig=false;
    if (TRIG_MODE==='warn') trig=(G.warned && !lost);
    else if (TRIG_MODE==='see') trig=(G.seeFrames >= needSeeF);
    else /* hard */ trig=(G.seeFrames >= needSeeF && inHard);

    // AUTO-DETAIN (Wanted)
    const wantedNow = readWanted(G.entity,G.scope);
    if (wantedNow >= AD_WANTED){
      let adTrig=false;
      if (AD_TRIGGER==='warn') adTrig=(G.warned && !lost);
      else if (AD_TRIGGER==='see') adTrig=(G.seeFrames >= needSeeF);
      else adTrig=(G.seeFrames >= needSeeF && inHard);
      const repNow = readRep(G.entity,'default');
      const canFriendlyCancel = AD_RESPECT && IGN_FRIEND && (repNow>=FRIEND_THR) && (FRIEND_OV_W || wantedNow<=0);
      if (adTrig && !canFriendlyCancel){
        // force detain immediately
        if (DETAIN_BAL>0) $gameTemp.requestBalloon(this,DETAIN_BAL);
        G.suspicion=0; G.warned=false; setChaseState(this,false); G.state='cooldown';
        G.coolUntilF=Graphics.frameCount + Math.floor(COOLD_S*60);
        const ceD=G.ondetainCE||CE_DETAIN_G; if(ceD>0) $gameTemp.reserveCommonEvent(ceD);
        openSurrender(G.entity,G.scope);
        return;
      }
    }

    // hold / state switch
    const now=Graphics.frameCount;
    const hC=Math.floor(HOLD_C_S*60), hP=Math.floor(HOLD_P_S*60);
    if (trig){
      if (!G.chasing && (!G.patrolSinceF || now - G.patrolSinceF >= hP)){ setChaseState(this,true); G.chaseSinceF=now; }
    } else {
      if (G.chasing && (!G.chaseSinceF || now - G.chaseSinceF >= hC)){ setChaseState(this,false); G.patrolSinceF=now; }
    }

    // detain via suspicion
    if (G.suspicion >= G.detain){
      if (DETAIN_BAL>0) $gameTemp.requestBalloon(this,DETAIN_BAL);
      G.suspicion=0; G.warned=false; setChaseState(this,false); G.state='cooldown';
      G.coolUntilF=Graphics.frameCount + Math.floor(COOLD_S*60);
      const ceD=G.ondetainCE||CE_DETAIN_G; if(ceD>0) $gameTemp.reserveCommonEvent(ceD);
      openSurrender(G.entity,G.scope);
      return;
    }

    // MOVE (avoid queuing steps while moving)
    if (G.chasing){
      if (!this.isMoving()) this.moveTowardPlayer();
      G.state='chase';
    } else {
      if (G.patrolActive && G.patrol){ patrolStep(this,G); G.state='patrol'; }
      else { G.state='idle'; idleScan(this,G); }
    }

    if (DEBUG_VISION && SceneManager._scene?._spriteset) drawVision(SceneManager._scene._spriteset,this,G);
  };

  function updateSpeedRamp(ev,G){
    const want=Math.max(1,Math.min(6,Math.round(G.chasing?G.chaseSpeed:G.speed)));
    if (RAMP_F<=0){ if ((G.curSpeed|0)!==want){ G.curSpeed=want; ev.setMoveSpeed(want);} return; }
    if (!G.curSpeed) G.curSpeed=want;
    if (G.curSpeed===want) return;
    if (--G.rampTick<=0){
      G.rampTick=Math.max(1,Math.floor(RAMP_F/Math.max(1,Math.abs(want-G.curSpeed))));
      G.curSpeed += (want>G.curSpeed?1:-1);
      ev.setMoveSpeed(Math.max(1,Math.min(6,Math.round(G.curSpeed))));
    }
  }
  function idleScan(ev,G){
    const I=G.idleScan; if (!I) return; const fps=60;
    if (!I.nextF || Graphics.frameCount>=I.nextF){
      const pat=(I.mode==='cross')?[4,2,6,8]:[4,6];
      I.idx=(I.idx+1)%pat.length; ev.setDirection(pat[I.idx]);
      I.nextF = Graphics.frameCount + Math.floor(Math.max(0.2,I.periodSec||1.2)*fps);
    }
  }
  function patrolStep(ev,G){
    const P=G.patrol; if(!P) return;
    if (G.waitUntilF && Graphics.frameCount < G.waitUntilF) return;
    // smooth: don't stack moves
    if (ev.isMoving()) return;

    const fps=60;
    if (P.mode==='fixed'){
      if (!P.points || !P.points.length) return;
      const tgt=P.points[P.index];
      if (arrived(ev,tgt)){
        if (P.waitSec>0) G.waitUntilF = Graphics.frameCount + Math.floor(P.waitSec*fps);
        if (P.loop){ P.index = (P.index+1)%P.points.length; }
        else { if (P.index===0) P.dir=1; if (P.index===P.points.length-1) P.dir=-1; P.index += P.dir; }
        return;
      }
      stepToward(ev,tgt.x,tgt.y); return;
    }
    if (!P.target || arrived(ev,P.target)){
      const w=randRange(P.waitMinSec||0,P.waitMaxSec||0);
      if (w>0) G.waitUntilF = Graphics.frameCount + Math.floor(w*fps);
      P.target = pickRandom(ev,P); if (!P.target) return;
    }
    stepToward(ev,P.target.x,P.target.y);
  }
  const arrived=(ev,pt)=> !pt ? true : (dist(ev.x,ev.y,pt.x,pt.y)<0.5);
  function stepToward(ev,tx,ty){
    const dx=Math.sign(tx-ev.x), dy=Math.sign(ty-ev.y);
    if (Math.abs(tx-ev.x) >= Math.abs(ty-ev.y)){
      if (dx>0) ev.moveStraight(6); else if (dx<0) ev.moveStraight(4);
      else if (dy>0) ev.moveStraight(2); else if (dy<0) ev.moveStraight(8);
    } else {
      if (dy>0) ev.moveStraight(2); else if (dy<0) ev.moveStraight(8);
      else if (dx>0) ev.moveStraight(6); else if (dx<0) ev.moveStraight(4);
    }
  }
  const randRange=(a,b)=>{ const lo=Math.min(a,b), hi=Math.max(a,b); if (hi<=0) return 0; return lo + Math.random()*(hi-lo); };
  function pickRandom(ev,P){
    let tries=20; const W=$gameMap.width(), H=$gameMap.height();
    const pass=(x,y)=> x>=0&&y>=0&&x<W&&y<H && ($gameMap.isPassable(x,y,2)||$gameMap.isPassable(x,y,4)||$gameMap.isPassable(x,y,6)||$gameMap.isPassable(x,y,8));
    if (P.mode==='randomRadius'){
      while(tries--){ const r=Math.floor(Math.random()*P.radius), ang=Math.random()*Math.PI*2;
        const x=ev.x+Math.round(Math.cos(ang)*r), y=ev.y+Math.round(Math.sin(ang)*r); if(pass(x,y)) return {x,y}; }
    } else if (P.mode==='randomRect'){
      const x1=Math.min(P.rect.x1,P.rect.x2), x2=Math.max(P.rect.x1,P.rect.x2);
      const y1=Math.min(P.rect.y1,P.rect.y2), y2=Math.max(P.rect.y1,P.rect.y2);
      while(tries--){ const x=Math.floor(x1+Math.random()*(x2-x1+1)), y=Math.floor(y1+Math.random()*(y2-y1+1)); if(pass(x,y)) return {x,y}; }
    }
    return null;
  }

  function drawVision(ss,ev,G){
    if (!ss._guardVisionLayer){ ss._guardVisionLayer = new PIXI.Graphics(); ss.addChild(ss._guardVisionLayer); }
    const g=ss._guardVisionLayer; g.clear();
    const th=$gameMap.tileHeight(); const cx=ev.screenX(); const cy=ev.screenY()-th/2;
    const dv=dirVec(ev.direction()); const base=Math.atan2(dv.y,dv.x);
    const wedge=(color,r,fov,a)=>{ const half=(fov*Math.PI/180)/2; g.beginFill(color,a); g.moveTo(cx,cy);
      for(let t=-half;t<=half;t+=(Math.PI/90)){ const ang=base+t; g.lineTo(cx+Math.cos(ang)*r, cy+Math.sin(ang)*r); }
      g.lineTo(cx,cy); g.endFill(); };
    const r=(G.range+0.5)*Math.max($gameMap.tileWidth(),$gameMap.tileHeight());
    if (G.soft>G.fov) wedge(0x66CCFF,r,G.soft,0.10);
    wedge(0x33FF66,r,G.fov,0.20);
  }

  const _SS_create=Spriteset_Map.prototype.createLowerLayer;
  Spriteset_Map.prototype.createLowerLayer=function(){ _SS_create.call(this); this._guardVisionLayer=null; };
})();
