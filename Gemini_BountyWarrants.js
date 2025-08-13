//=============================================================================
// Gemini_BountyWarrants.js  v0.9.2
// Wanted by faction/location + Fine/Bribe + Surrender UI + Arrest/Jail/Bail
// - v0.9.1: FIX surrender UI (refresh + select first enabled)
// - v0.9.2: NEW "Pay Bail" plugin command + API (deducts bail & releases)
//=============================================================================
/*:
 * @target MZ
 * @plugindesc v0.9.2 Bounty & Warrants (wanted, fine/bribe, surrender UI, jail & bail)
 * @author Gemini
 *
 * @help
 * Load BEFORE: Gemini_GuardPatrolAI.
 *
 * Inline (Show Text):
 *   Wanted: <showWanted: TownGuards scope:faction>
 *   Fine:   <showFine:   TownGuards scope:faction>
 *   Bribe:  <showBribe:  TownGuards scope:faction>
 *   Bail:   <showBail:   TownGuards scope:faction>
 *
 * Typical surrender choices (detain popup):
 *   Pay Fine (<showFine: TownGuards scope:faction>)
 *     <req wanted: TownGuards > 0 scope:faction>
 *     <req gold >= <showFine: TownGuards scope:faction>>
 *     <onselect payfine: TownGuards scope:faction>
 *
 *   Bribe Guard (<showBribe: TownGuards scope:faction>)
 *     <req wanted: TownGuards > 0 scope:faction>
 *     <req gold >= <showBribe: TownGuards scope:faction>>
 *     <onselect bribe: TownGuards scope:faction>
 *
 *   Submit to Arrest (Bail: <showBail: TownGuards scope:faction>)
 *     <req wanted: TownGuards >= 50 scope:faction>
 *     <onselect arrest: TownGuards scope:faction>
 *
 * Jail “Bail Man” event (example):
 *   Show Text:
 *     Wanted:  <showWanted: TownGuards scope:faction>
 *     Bail:    <showBail:   TownGuards scope:faction>
 *   Choices:
 *     - Pay Bail → Plugin Command → Bounty & Warrants → Pay Bail (Clear Wanted: ON)
 *     - Work Duty / Bribe / Escape … your call
 *
 * --------------------------------------------------------------------------
 * Plugin Commands
 * --------------------------------------------------------------------------
 * @command addWanted
 * @text Add Wanted
 * @arg entityId @type string
 * @arg scope @type select @option faction @option location @default faction
 * @arg value @type number @default 1
 *
 * @command setWanted
 * @text Set Wanted
 * @arg entityId @type string
 * @arg scope @type select @option faction @option location @default faction
 * @arg value @type number @default 0
 *
 * @command openSurrender
 * @text Open Surrender UI
 * @arg entityId @type string
 * @arg scope @type select @option faction @option location @default faction
 *
 * @command payFine
 * @text Pay Fine
 * @arg entityId @type string
 * @arg scope @type select @option faction @option location @default faction
 *
 * @command payBribe
 * @text Pay Bribe
 * @arg entityId @type string
 * @arg scope @type select @option faction @option location @default faction
 *
 * @command arrestNow
 * @text Arrest Now (teleport to jail)
 * @arg entityId @type string
 * @arg scope @type select @option faction @option location @default faction
 *
 * @command releaseFromJail
 * @text Release From Jail (teleport back)
 * @arg clearWanted @type boolean @default true
 *
 * @command payBail
 * @text Pay Bail (if arrested)
 * @desc Deducts the active bail and releases the player back to their arrest origin.
 * @arg clearWanted
 * @text Clear Wanted On Release
 * @type boolean
 * @default true
 *
 * --------------------------------------------------------------------------
 * Economy
 * --------------------------------------------------------------------------
 * @param ---Economy---
 * @default
 * @param fineBase @text Fine Base @type number @default 0
 * @param finePerPoint @text Fine Per Wanted @type number @default 5
 * @param bribeBase @text Bribe Base @type number @default 0
 * @param bribePerPoint @text Bribe Per Wanted @type number @default 8
 * @param bribeClearsWanted @text Bribe Clears Wanted @type boolean @default true
 *
 * --------------------------------------------------------------------------
 * Arrest/Jail
 * --------------------------------------------------------------------------
 * @param ---Arrest/Jail---
 * @default
 * @param arrestWantedThreshold @text Arrest Wanted Threshold @type number @default 50
 * @param bailBase @text Bail Base @type number @default 20
 * @param bailPerPoint @text Bail Per Wanted @type number @default 10
 * @param clearWantedOnBail @text Clear Wanted On Bail @type boolean @default true
 * @param jailMapId @text Jail Map ID @type number @default 0
 * @param jailX @text Jail X @type number @default 0
 * @param jailY @text Jail Y @type number @default 0
 * @param jailDir @text Jail Direction (2/4/6/8) @type number @default 2
 * @param jailSwitchId @text In-Jail Switch (optional) @type switch @default 0
 * @param arrestCE @text Common Event On Arrest @type common_event @default 0
 * @param releaseCE @text Common Event On Release @type common_event @default 0
 *
 * --------------------------------------------------------------------------
 * UI
 * --------------------------------------------------------------------------
 * @param ---UI---
 * @default
 * @param toastSwitchMute @text Mute Toasts (Switch) @type switch @default 0
 * @param surrenderTitle @text Surrender Title @type string @default Surrender
 * @param surrenderNoPaymentText @text No Payment Text @type string @default No payment required.
 */

(() => {
  'use strict';

  const P = PluginManager.parameters('Gemini_BountyWarrants');
  const n=x=>Number(x??0), b=x=>String(x??'false')==='true', s=x=>String(x??'').trim();

  // economy
  const FINE_BASE=n(P.fineBase||0), FINE_PER=n(P.finePerPoint||5);
  const BRIBE_BASE=n(P.bribeBase||0), BRIBE_PER=n(P.bribePerPoint||8), BRIBE_CLEARS=b(P.bribeClearsWanted||'true');

  // arrest/jail
  const ARREST_THR=n(P.arrestWantedThreshold||50);
  const BAIL_BASE=n(P.bailBase||20), BAIL_PER=n(P.bailPerPoint||10), BAIL_CLEAR=b(P.clearWantedOnBail||'true');
  const J_MAP=n(P.jailMapId||0), J_X=n(P.jailX||0), J_Y=n(P.jailY||0), J_DIR=n(P.jailDir||2), J_SWITCH=n(P.jailSwitchId||0);
  const CE_ARREST=n(P.arrestCE||0), CE_RELEASE=n(P.releaseCE||0);

  // ui
  const MUTE_SW=n(P.toastSwitchMute||0);
  const UI_TITLE=s(P.surrenderTitle||'Surrender');
  const UI_NOPAY=s(P.surrenderNoPaymentText||'No payment required.');

  const toastsMuted=()=> (n(MUTE_SW)>0 && $gameSwitches.value(n(MUTE_SW)));
  const addToast=(m)=>{ if(toastsMuted()) return; SceneManager._scene?.addRepToast?.(String(m)); };

  // ---------- Game_System: Wanted store + jail state ----------
  const _GS_init=Game_System.prototype.initialize;
  Game_System.prototype.initialize=function(){
    _GS_init.call(this);
    this._bwWanted = this._bwWanted || {};   // key: "entity||scope" => number
    this._bwArrest = null;                   // {entity, scope, wantedAtArrest, origin:{mapId,x,y,dir}, bail, active:true}
  };

  function keyFor(entity,scope){ return `${entity}||${scope||'faction'}`; }

  Game_System.prototype.getWanted=function(entity,scope='faction'){ return Number(this._bwWanted[keyFor(entity,scope)]||0); };
  Game_System.prototype.setWanted=function(entity,scope='faction',val){
    const k=keyFor(entity,scope); const v=Math.max(0,Math.floor(Number(val||0))); this._bwWanted[k]=v; return v;
  };
  Game_System.prototype.addWanted=function(entity,scope='faction',delta){
    const cur=this.getWanted(entity,scope); return this.setWanted(entity,scope,cur+Number(delta||0));
  };

  // jail state
  Game_System.prototype.isArrested=function(){ return !!(this._bwArrest && this._bwArrest.active); };
  Game_System.prototype.arrestInfo=function(){ return this._bwArrest || null; };

  // ---------- Cost calculators ----------
  function fineFor(entity,scope){
    const w=$gameSystem.getWanted(entity,scope); return Math.max(0, Math.floor(FINE_BASE + w*FINE_PER));
  }
  function bribeFor(entity,scope){
    const w=$gameSystem.getWanted(entity,scope); return Math.max(0, Math.floor(BRIBE_BASE + w*BRIBE_PER));
  }
  function bailFor(entity,scope,wantedOverride=null){
    const w=(wantedOverride!=null)?wantedOverride:$gameSystem.getWanted(entity,scope);
    return Math.max(0, Math.floor(BAIL_BASE + w*BAIL_PER));
  }

  // ---------- Inline escape codes ----------
  const _WB_convert=Window_Base.prototype.convertEscapeCharacters;
  Window_Base.prototype.convertEscapeCharacters=function(text){
    let t=_WB_convert.call(this,text);
    t=t.replace(/<showWanted:\s*([^>]+?)\s+scope:(faction|location)\s*>/gi,(_,id,sc)=>String($gameSystem.getWanted(id.trim(),sc)));
    t=t.replace(/<showFine:\s*([^>]+?)\s+scope:(faction|location)\s*>/gi,(_,id,sc)=>String(fineFor(id.trim(),sc)));
    t=t.replace(/<showBribe:\s*([^>]+?)\s+scope:(faction|location)\s*>/gi,(_,id,sc)=>String(bribeFor(id.trim(),sc)));
    t=t.replace(/<showBail:\s*([^>]+?)\s+scope:(faction|location)\s*>/gi,(_,id,sc)=>{
      const inf=$gameSystem.arrestInfo(); if (inf && inf.entity===id.trim() && inf.scope===sc) return String(inf.bail);
      return String(bailFor(id.trim(),sc));
    });
    return t;
  };

  // ---------- Plugin Commands ----------
  PluginManager.registerCommand('Gemini_BountyWarrants','addWanted',args=>{
    $gameSystem.addWanted(args.entityId, args.scope||'faction', Number(args.value||0));
  });
  PluginManager.registerCommand('Gemini_BountyWarrants','setWanted',args=>{
    $gameSystem.setWanted(args.entityId, args.scope||'faction', Number(args.value||0));
  });
  PluginManager.registerCommand('Gemini_BountyWarrants','openSurrender',args=>{
    BW_openSurrenderUI(args.entityId, args.scope||'faction');
  });
  PluginManager.registerCommand('Gemini_BountyWarrants','payFine',args=>{
    BW_payFine(args.entityId, args.scope||'faction');
  });
  PluginManager.registerCommand('Gemini_BountyWarrants','payBribe',args=>{
    BW_payBribe(args.entityId, args.scope||'faction');
  });
  PluginManager.registerCommand('Gemini_BountyWarrants','arrestNow',args=>{
    BW_arrestNow(args.entityId, args.scope||'faction');
  });
  PluginManager.registerCommand('Gemini_BountyWarrants','releaseFromJail',args=>{
    BW_releaseFromJail(String(args.clearWanted||'true')==='true');
  });
  // NEW: Pay Bail
  PluginManager.registerCommand('Gemini_BountyWarrants','payBail',args=>{
    BW_payBail(String(args.clearWanted||'true')==='true');
  });

  // ---------- Public API (used by guard AI or events) ----------
  window.BW_getWanted = (e,sc)=> $gameSystem.getWanted(e,sc);
  window.BW_openSurrenderUI = (e,sc)=> openSurrenderUI(e,sc);
  window.BW_payFine  = (e,sc)=> payFine(e,sc);
  window.BW_payBribe = (e,sc)=> payBribe(e,sc);
  window.BW_arrestNow= (e,sc)=> doArrest(e,sc);
  window.BW_releaseFromJail = (clear)=> releaseFromJail(!!clear);
  window.BW_payBail  = (clear)=> payBailNow(!!clear);

  // ---------- Surrender UI ----------
  function openSurrenderUI(entity,scope){
    const w=$gameSystem.getWanted(entity,scope);
    const fine=fineFor(entity,scope), bribe=bribeFor(entity,scope);
    const arrestable = (w>=ARREST_THR);
    SceneManager._scene && SceneManager._scene.startBW_Surrender({entity,scope,wanted:w,fine,bribe,arrestable});
  }

  function payFine(entity,scope){
    const cost=fineFor(entity,scope);
    if (cost<=0){ addToast('No fine due.'); return true; }
    if ($gameParty.gold() < cost){ addToast('Not enough gold.'); return false; }
    $gameParty.loseGold(cost);
    $gameSystem.setWanted(entity,scope,0);
    addToast(`Fine paid: ${cost}. Wanted cleared.`);
    return true;
  }

  function payBribe(entity,scope){
    const cost=bribeFor(entity,scope);
    if (cost<=0){ addToast('No bribe due.'); return true; }
    if ($gameParty.gold() < cost){ addToast('Not enough gold.'); return false; }
    $gameParty.loseGold(cost);
    if (BRIBE_CLEARS) $gameSystem.setWanted(entity,scope,0);
    addToast(`Bribe paid: ${cost}. ${BRIBE_CLEARS?'Wanted cleared.':'(Officials look the other way.)'}`);
    return true;
  }

  function doArrest(entity,scope){
    const wanted=$gameSystem.getWanted(entity,scope);
    const bail=bailFor(entity,scope,wanted);
    // remember origin
    const origin={ mapId:$gameMap.mapId(), x:$gamePlayer.x, y:$gamePlayer.y, dir:$gamePlayer.direction() };
    $gameSystem._bwArrest = { entity, scope, wantedAtArrest:wanted, origin, bail, active:true };
    if (n(J_SWITCH)>0) $gameSwitches.setValue(n(J_SWITCH),true);
    if (n(CE_ARREST)>0) $gameTemp.reserveCommonEvent(n(CE_ARREST));
    // transfer to jail
    if (n(J_MAP)>0){
      $gamePlayer.reserveTransfer(n(J_MAP), n(J_X), n(J_Y), n(J_DIR), 0);
    }
    addToast(`Arrested for ${wanted}. (Bail: ${bail})`);
  }

  function releaseFromJail(clearWanted=true){
    const a=$gameSystem._bwArrest; if (!a) return;
    if (n(J_SWITCH)>0) $gameSwitches.setValue(n(J_SWITCH),false);
    if (n(CE_RELEASE)>0) $gameTemp.reserveCommonEvent(n(CE_RELEASE));
    if (clearWanted){ $gameSystem.setWanted(a.entity,a.scope,0); }
    // transfer back
    const o=a.origin||{mapId:$gameMap.mapId(),x:$gamePlayer.x,y:$gamePlayer.y,dir:$gamePlayer.direction()};
    $gameSystem._bwArrest=null;
    if (o.mapId>0){
      $gamePlayer.reserveTransfer(o.mapId,o.x,o.y,o.dir,0);
    }
    addToast('Released.');
  }

  // NEW: Pay Bail now (only when arrested)
  function payBailNow(clearWanted=true){
    const a=$gameSystem._bwArrest;
    if (!a || !a.active){
      addToast('Not under arrest.');
      return false;
    }
    const cost = Math.max(0, Math.floor(a.bail ?? bailFor(a.entity,a.scope,a.wantedAtArrest)));
    if (cost<=0){
      addToast('No bail due.');
      releaseFromJail(clearWanted);
      return true;
    }
    if ($gameParty.gold() < cost){
      addToast('Not enough gold for bail.');
      return false;
    }
    $gameParty.loseGold(cost);
    addToast(`Bail paid: ${cost}.`);
    releaseFromJail(!!clearWanted);
    return true;
  }

  // ---------- Scene_Map additions (UI) ----------
  Scene_Map.prototype.startBW_Surrender=function(payload){
    if (this._bwSurrenderActive) return;
    this._bwSurrenderActive = true;
    $gamePlayer._bwFreeze = true;

    const width = Math.floor(Graphics.boxWidth*0.6);
    const height= this.calcWindowHeight(6,true);
    const x=(Graphics.boxWidth-width)/2, y=(Graphics.boxHeight-height)/2;

    this._bwSurrWin = new Window_Command(new Rectangle(x,y,width,height));

    this._bwSurrWin.makeCommandList = ()=> {
      const w=payload.wanted, fine=payload.fine, bribe=payload.bribe;
      this._bwSurrWin.addCommand(`${UI_TITLE} — ${payload.entity}/${payload.scope}`, 'noop', false);

      const noPay = (w<=0 && fine<=0 && bribe<=0);
      if (noPay) {
        this._bwSurrWin.addCommand(UI_NOPAY,'noop',false);
      } else {
        const canFine = (w>0 && fine>0 && $gameParty.gold()>=fine);
        const canBribe= (w>0 && bribe>0 && $gameParty.gold()>=bribe);
        this._bwSurrWin.addCommand(`Pay Fine (${fine})`, 'fine',  canFine);
        this._bwSurrWin.addCommand(`Bribe (${bribe})`,  'bribe', canBribe);
      }

      const arrestLine = `Submit to Arrest (Bail: ${bailFor(payload.entity,payload.scope)})`;
      this._bwSurrWin.addCommand(arrestLine, 'arrest', payload.arrestable);
      this._bwSurrWin.addCommand('Walk Away','cancel',true);
    };

    this._bwSurrWin.setHandler('fine',   ()=>{ if (payFine(payload.entity,payload.scope))  this.closeBW_Surrender(); });
    this._bwSurrWin.setHandler('bribe',  ()=>{ if (payBribe(payload.entity,payload.scope)) this.closeBW_Surrender(); });
    this._bwSurrWin.setHandler('arrest', ()=>{ doArrest(payload.entity,payload.scope); this.closeBW_Surrender(); });
    this._bwSurrWin.setHandler('cancel', ()=> this.closeBW_Surrender());

    // Build items NOW and select first enabled
    this._bwSurrWin.refresh();
    const firstEnabledIndex = (()=> {
      for (let i=0;i<this._bwSurrWin.maxItems();i++){
        if (this._bwSurrWin.isCommandEnabled(i)) return i;
      }
      return Math.max(0, this._bwSurrWin.maxItems()-1);
    })();
    this._bwSurrWin.select(firstEnabledIndex);
    this._bwSurrWin.open();
    this._bwSurrWin.activate();

    this.addWindow(this._bwSurrWin);
  };

  Scene_Map.prototype.closeBW_Surrender=function(){
    if (!this._bwSurrenderActive) return;
    this._bwSurrWin?.close(); this._bwSurrWin?.deactivate();
    this.removeChild(this._bwSurrWin); this._bwSurrWin=null;
    this._bwSurrenderActive=false;
    $gamePlayer._bwFreeze = false;
  };

  // hard stop movement when surrender UI is open
  const _GP_canMove=Game_Player.prototype.canMove;
  Game_Player.prototype.canMove=function(){
    if (SceneManager._scene?._bwSurrenderActive) return false;
    if (this._bwFreeze) return false;
    return _GP_canMove.call(this);
  };

})();
