//=============================================================================
// Gemini_RepDialogueChecks.js v1.5.0 (Ultimate Options Pack)
// - Choice requirements & onselect effects, with ANY/NOT groups
// - New reqs: actor/party state & level, equipped, map, region, bail/bailpaid
// - New onselect: items/weapons/armors, states, CE, transfer, SE, toast, wanted
// - New inline show-tags: Gold/Var/Item/Weapon/Armor/Wanted/Bail/BailPaid
// - Backward compatible with v1.4.0 syntax
//=============================================================================
/*:
 * @target MZ
 * @plugindesc v1.5.0 Dialogue requirements & effects (gold/rep/wanted/item/switch/var/bail/bailpaid/actor/equipped/map/region + ANY/NOT groups)
 * @author Gemini
 *
 * @help
 * Recommended load order:
 * 1) TownReputation
 * 2) Gemini_BountyWarrants (>= v0.9.2)
 * 3) Gemini_RepDialogueChecks (this)
 * 4) Guard/Patrol AI and others
 *
 * ---------------------------------------------------------------------------
 * BASIC REQ TAGS (put inside the *choice text*)
 * ---------------------------------------------------------------------------
 * Gold: <req gold >= 100>
 * Rep: <req rep: MerchantsGuild >= 25 type:merchant>
 * Wanted: <req wanted: TownGuards > 0 scope:faction>
 * Item: <req item: 7 >= 1> // DB item id
 * Switch: <req switch: 21 = on>
 * Variable: <req var: 10 >= 5>
 *
 * Bail (current arrest): <req bail >= 500>
 * Bail (explicit authority): <req bail: TownGuards scope:faction >= 500>
 * Have enough to pay (shorthand):<req bailpaid = true> // gold >= current bail
 *
 * Actor / Party:
 * <req actor: 3 inparty> // Actor #3 in party
 * <req actor: 3 level >= 10> // Actor #3 level gate
 * <req state: 10 inparty = true> // Any party member has state 10
 * <req state: 10 actor:3 = true> // Actor #3 has state 10
 *
 * Equipped (exact equipped check on an actor):
 * <req equipped: actor:3 weapon:5 = true>
 * <req equipped: actor:3 armor:12 = true>
 *
 * Map / Region:
 * <req map = 3> // On map ID 3
 * <req region = 5> // Player on region 5
 *
 * ANY-of (OR across groups; AND within each group):
 * <req any: [ rep: TownGuards >= 10 ; item:7 >= 1 ] [ gold >= 500 ]>
 *
 * NOT-of (passes only if NONE of the groups pass):
 * <req not: [ rep: Bandits >= 25 ] [ wanted: TownGuards > 0 scope:faction ]>
 *
 * Values may contain inline show-tags (below). Examples:
 * <req gold >= <showBail: TownGuards scope:faction>>
 *
 * ---------------------------------------------------------------------------
 * INLINE SHOW-TAGS (usable in labels or inside numeric values)
 * ---------------------------------------------------------------------------
 * <showGold> -> party gold
 * <showVar: 5> -> variable #5
 * <showItem: 7> -> count of item #7
 * <showWeapon: 3> -> count of weapon #3
 * <showArmor: 2> -> count of armor #2
 * <showWanted: TownGuards scope:faction>
 * <showBail> -> current arrest bail
 * <showBail: TownGuards scope:faction>
 * <showBailPaid> -> "Yes" / "No"
 *
 * ---------------------------------------------------------------------------
 * ON-SELECT (only if the choice passed)
 * ---------------------------------------------------------------------------
 * Existing:
 * gold:+/-N
 * rep: ID +/-N [type:xxx]
 * wanted: ID +/-N [scope:faction|location]
 * switch: ID on|off
 * var: ID +/-N or =N
 * paybail [clear:true|false]
 *
 * New:
 * item:7 +1 weapon:3 -1 armor:2 +2
 * addstate: 10 actor:3 remstate: 10 actor:3
 * addstateParty: 10 remstateParty: 10
 * ce: 12 // reserve Common Event 12
 * transfer: 3,10,12,2 // mapId,x,y,dir(2,4,6,8)
 * se: Name[,vol[,pitch[,pan]]] // play sound effect
 * toast: Your message here
 * setwanted: TownGuards 0 scope:faction
 * addwanted: TownGuards -10 scope:faction
 *
 * ---------------------------------------------------------------------------
 * PARAMETERS
 * ---------------------------------------------------------------------------
 * @param showLockSuffix
 * @text Show [LOCKED] Suffix
 * @type boolean
 * @default true
 *
 * @param showReason
 * @text Show Reason Suffix
 * @type boolean
 * @default true
 *
 * @param lockSuffix
 * @text Locked Suffix Text
 * @type string
 * @default [LOCKED]
 *
 * @param reasonPrefix
 * @text Reason Prefix
 * @type string
 * @default [Req:
 *
 * @param reasonSuffix
 * @text Reason Suffix
 * @type string
 * @default ]
 *
 * @param hideLocked
 * @text Hide Locked Choices
 * @type boolean
 * @default false
 *
 * @param autoSelectFirstEnabled
 * @text Auto-Select First Enabled
 * @type boolean
 * @default true
 *
 * @param autoSkipIfOneEnabled
 * @text Auto-Skip If Only One Enabled
 * @type boolean
 * @default false
 *
 * @param debugLog
 * @text Debug Log to Console
 * @type boolean
 * @default false
 */

(() => {
  'use strict';

  const P = PluginManager.parameters('Gemini_RepDialogueChecks');
  const b=x=>String(x??'false')==='true', s=x=>String(x??'').trim(), n=x=>Number(x??0);

  const SHOW_LOCK = b(P.showLockSuffix||'true');
  const SHOW_REASON = b(P.showReason||'true');
  const LOCK_TXT = s(P.lockSuffix||'[LOCKED]');
  const REASON_PRE = s(P.reasonPrefix||'[Req:');
  const REASON_SUF = s(P.reasonSuffix||']');

  const HIDE_LOCKED = b(P.hideLocked||'false');
  const AUTO_FIRST = b(P.autoSelectFirstEnabled||'true');
  const AUTO_SKIP_1 = b(P.autoSkipIfOneEnabled||'false');

  const DEBUG = b(P.debugLog||'false');
  const log=(...a)=>{ if (DEBUG) console.log('[RepDlg]', ...a); };

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------
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

  // Converter to expand show-tags inside values/text
  let _convWin=null;
  function conv(text){
    try{
      if (!_convWin) _convWin = new Window_Base(new Rectangle(0,0,1,1));
      return _convWin.convertEscapeCharacters(String(text??''));
    }catch(_){ return String(text??''); }
  }
  function parseNumberFrom(text){
    const t = conv(text);
    const m = String(t).match(/-?\d+/);
    return m ? Number(m[0]) : 0;
  }

  // Bridges (used if present)
  function getRep(entity,type){
    try{ return Number(window.getRep?.(entity,type) ?? 0); }catch(_){ return 0; }
  }
  function getWanted(entity,scope){
    try{
      if (typeof BW_getWanted==='function') return Number(BW_getWanted(entity,scope)||0);
      return Number($gameSystem?.getWanted?.(entity,scope)||0);
    }catch(_){ return 0; }
  }
  function currentBail(){
    try{
      const a=$gameSystem?.arrestInfo?.(); if (a && a.active) return Number(a.bail||0);
    }catch(_){}
    return 0;
  }
  function entityBail(entity,scope){
    const t = conv(`<showBail: ${entity} scope:${scope}>`);
    const m = String(t).match(/-?\d+/);
    return m ? Number(m[0]) : currentBail();
  }
  function bailPaid(){
    const bail = currentBail();
    return $gameParty.gold() >= bail;
  }

  function anyPartyHasState(stateId){
    return $gameParty.members().some(a => a && a.isStateAffected(stateId));
  }
  function actorHasState(actorId, stateId){
    const a = $gameActors.actor(actorId);
    return !!(a && a.isStateAffected(stateId));
  }
  function actorInParty(actorId){
    const a = $gameActors.actor(actorId);
    return !!(a && $gameParty.members().includes(a));
  }
  function actorLevel(actorId){
    const a = $gameActors.actor(actorId);
    return a ? a.level : 0;
  }
  function actorEquipped(actorId, isWeapon, id){
    const a = $gameActors.actor(actorId);
    if (!a) return false;
    return a.equips().some(eq => !!eq && (isWeapon ? DataManager.isWeapon(eq) : DataManager.isArmor(eq)) && eq.id === id);
  }

  // ---------------------------------------------------------------------------
  // Inline show-tags (augment convertEscapeCharacters)
  // ---------------------------------------------------------------------------
  const _alias_convert = Window_Base.prototype.convertEscapeCharacters;
  Window_Base.prototype.convertEscapeCharacters = function(text){
    let t = _alias_convert.call(this, text);
    // Simple counters
    t = t.replace(/<showGold>/gi, String($gameParty.gold()));
    t = t.replace(/<showVar:\s*(\d+)\s*>/gi, (_,id)=> String($gameVariables.value(Number(id))||0));
    t = t.replace(/<showItem:\s*(\d+)\s*>/gi, (_,id)=> {
      const it=$dataItems[Number(id)]; return String(it ? $gameParty.numItems(it) : 0);
    });
    t = t.replace(/<showWeapon:\s*(\d+)\s*>/gi, (_,id)=> {
      const it=$dataWeapons[Number(id)]; return String(it ? $gameParty.numItems(it) : 0);
    });
    t = t.replace(/<showArmor:\s*(\d+)\s*>/gi, (_,id)=> {
      const it=$dataArmors[Number(id)]; return String(it ? $gameParty.numItems(it) : 0);
    });
    // Wanted
    t = t.replace(/<showWanted:\s*([^\s>]+)(?:\s+scope\s*:\s*(\w+))?\s*>/gi, (_,id,sc)=> String(getWanted(id, sc||'faction')));
    // Bail (current or explicit)
    t = t.replace(/<showBail(?:\s*:\s*([^\s>]+)(?:\s+scope\s*:\s*(\w+))?)?\s*>/gi, (m,id,sc)=> String(id?entityBail(id, sc||'faction'):currentBail()));
    t = t.replace(/<showBailPaid\s*>/gi, bailPaid() ? 'Yes' : 'No');
    return t;
  };

  // ---------------------------------------------------------------------------
  // Requirement parsing
  // ---------------------------------------------------------------------------
  const RX_REQ_TAG = /<req\s+([^>]+?)>/gi;
  const RX_ANY = /^any\s*:\s*(.+)$/i;
  const RX_NOT = /^not\s*:\s*(.+)$/i;
  const RX_GROUPS = /\[([^\]]+)\]/g;

  // Mini evaluators return {pass, reason}
  function evalMini(txt){
    const raw = s(txt);

    // GOLD
    let m = raw.match(/^gold\s*(>=|<=|>|<|=)\s*(.+)$/i);
    if (m){
      const op=m[1], val=parseNumberFrom(m[2]);
      const have=$gameParty.gold();
      return { pass: opCheck(have,op,val), reason:`Gold ${op} ${val}` };
    }

    // REP
    m = raw.match(/^rep\s*:\s*([^\s]+)\s*(>=|<=|>|<|=)\s*(-?\d+)(?:\s+type\s*:\s*(\w+))?/i);
    if (m){
      const id=m[1], op=m[2], val=Number(m[3]), type=(m[4]||'default');
      const cur=getRep(id,type);
      return { pass: opCheck(cur,op,val), reason:`Rep(${id}${type!=='default'?`/${type}`:''}) ${op} ${val}` };
    }

    // WANTED
    m = raw.match(/^wanted\s*:\s*([^\s]+)\s*(>=|<=|>|<|=)\s*(-?\d+)(?:\s+scope\s*:\s*(faction|location))?/i);
    if (m){
      const id=m[1], op=m[2], val=Number(m[3]), scope=(m[4]||'faction');
      const cur=getWanted(id,scope);
      return { pass: opCheck(cur,op,val), reason:`Wanted(${id}/${scope}) ${op} ${val}` };
    }

    // ITEM
    m = raw.match(/^item\s*:\s*(\d+)\s*(>=|<=|>|<|=)\s*(-?\d+)/i);
    if (m){
      const itemId=Number(m[1]), op=m[2], val=Number(m[3]);
      const it=$dataItems[itemId]; const have = it ? $gameParty.numItems(it) : 0;
      return { pass: opCheck(have,op,val), reason:`Item(${itemId}) ${op} ${val}` };
    }

    // SWITCH
    m = raw.match(/^switch\s*:\s*(\d+)\s*=\s*(on|off)/i);
    if (m){
      const sid=Number(m[1]), want=(m[2].toLowerCase()==='on');
      const cur=!!$gameSwitches.value(sid);
      return { pass:(cur===want), reason:`Switch(${sid}) = ${want?'on':'off'}` };
    }

    // VARIABLE
    m = raw.match(/^var\s*:\s*(\d+)\s*(>=|<=|>|<|=)\s*(-?\d+)/i);
    if (m){
      const vid=Number(m[1]), op=m[2], val=Number(m[3]);
      const cur=Number($gameVariables.value(vid)||0);
      return { pass: opCheck(cur,op,val), reason:`Var(${vid}) ${op} ${val}` };
    }

    // BAIL (current)
    m = raw.match(/^bail\s*(>=|<=|>|<|=)\s*(.+)$/i);
    if (m){
      const op=m[1], val=parseNumberFrom(m[2]);
      const cur=currentBail();
      return { pass: opCheck(cur,op,val), reason:`Bail ${op} ${val}` };
    }

    // BAIL (explicit)
    m = raw.match(/^bail\s*:\s*([^\s]+)(?:\s+scope\s*:\s*(faction|location))?\s*(>=|<=|>|<|=)\s*(.+)$/i);
    if (m){
      const id=m[1], scope=(m[2]||'faction'), op=m[3], val=parseNumberFrom(m[4]);
      const cur=entityBail(id,scope);
      return { pass: opCheck(cur,op,val), reason:`Bail(${id}/${scope}) ${op} ${val}` };
    }

    // BAILPAID
    m = raw.match(/^bailpaid\s*=\s*(true|false)/i);
    if (m){
      const wantTrue=(m[1].toLowerCase()==='true');
      const isTrue=!!bailPaid();
      return { pass:(isTrue===wantTrue), reason:`BailPaid = ${wantTrue}` };
    }

    // ACTOR IN PARTY
    m = raw.match(/^actor\s*:\s*(\d+)\s*inparty$/i);
    if (m){
      const id=Number(m[1]);
      const ok=actorInParty(id);
      return { pass: ok, reason:`Actor(${id}) in party` };
    }

    // ACTOR LEVEL
    m = raw.match(/^actor\s*:\s*(\d+)\s*level\s*(>=|<=|>|<|=)\s*(\d+)/i);
    if (m){
      const id=Number(m[1]), op=m[2], val=Number(m[3]);
      const cur=actorLevel(id);
      return { pass: opCheck(cur,op,val), reason:`Actor(${id}) level ${op} ${val}` };
    }

    // PARTY STATE
    m = raw.match(/^state\s*:\s*(\d+)\s*inparty\s*=\s*(true|false)/i);
    if (m){
      const stateId=Number(m[1]), want=(m[2].toLowerCase()==='true');
      const has = anyPartyHasState(stateId);
      return { pass:(has===want), reason:`State(${stateId}) in party = ${want}` };
    }

    // ACTOR STATE
    m = raw.match(/^state\s*:\s*(\d+)\s*actor\s*:\s*(\d+)\s*=\s*(true|false)/i);
    if (m){
      const stateId=Number(m[1]), actorId=Number(m[2]), want=(m[3].toLowerCase()==='true');
      const has = actorHasState(actorId,stateId);
      return { pass:(has===want), reason:`State(${stateId}) actor(${actorId}) = ${want}` };
    }

    // EQUIPPED (actor weapon/armor exact ID)
    m = raw.match(/^equipped\s*:\s*actor\s*:\s*(\d+)\s*weapon\s*:\s*(\d+)\s*=\s*(true|false)/i);
    if (m){
      const actorId=Number(m[1]), weaponId=Number(m[2]), want=(m[3].toLowerCase()==='true');
      const has = actorEquipped(actorId, true, weaponId);
      return { pass:(has===want), reason:`Equipped actor(${actorId}) weapon(${weaponId}) = ${want}` };
    }
    m = raw.match(/^equipped\s*:\s*actor\s*:\s*(\d+)\s*armor\s*:\s*(\d+)\s*=\s*(true|false)/i);
    if (m){
      const actorId=Number(m[1]), armorId=Number(m[2]), want=(m[3].toLowerCase()==='true');
      const has = actorEquipped(actorId, false, armorId);
      return { pass:(has===want), reason:`Equipped actor(${actorId}) armor(${armorId}) = ${want}` };
    }

    // MAP / REGION
    m = raw.match(/^map\s*=\s*(\d+)/i);
    if (m){
      const wantId=Number(m[1]);
      const cur=$gameMap.mapId();
      return { pass:(cur===wantId), reason:`Map = ${wantId}` };
    }
    m = raw.match(/^region\s*=\s*(\d+)/i);
    if (m){
      const wantR=Number(m[1]);
      const cur=$gameMap.regionId($gamePlayer.x, $gamePlayer.y);
      return { pass:(cur===wantR), reason:`Region = ${wantR}` };
    }

    return { pass:false, reason:'(unknown req)' };
  }

  function evalGroupList(body){
    const groups = [];
    let gm; RX_GROUPS.lastIndex = 0;
    while ((gm = RX_GROUPS.exec(body)) !== null){
      const raw = gm[1];
      const entries = raw.split(';').map(x=>s(x)).filter(Boolean);
      groups.push(entries);
    }
    return groups;
  }

  function evalAny(body){
    const groups = evalGroupList(body);
    if (!groups.length) return { pass:false, reason:'(malformed any)' };
    const failWhy=[];
    for (const entries of groups){
      const results = entries.map(e => evalMini(e));
      if (results.every(r=>r.pass)) return { pass:true, reason:'ANY' };
      failWhy.push(results.filter(r=>!r.pass).map(r=>r.reason).join(' & '));
    }
    return { pass:false, reason:`ANY[${failWhy.join(' | ')}]` };
  }

  function evalNot(body){
    const groups = evalGroupList(body);
    if (!groups.length) return { pass:false, reason:'(malformed not)' };
    // Pass only if NO group passes
    for (const entries of groups){
      const results = entries.map(e => evalMini(e));
      if (results.every(r=>r.pass)) return { pass:false, reason:'NOT[blocked]' };
    }
    return { pass:true, reason:'NOT' };
  }

  function evaluateReqs(expanded){
    const reqs = [];
    let m;
    RX_REQ_TAG.lastIndex = 0;
    while ((m = RX_REQ_TAG.exec(expanded)) !== null){
      const body = s(m[1]);
      log('REQ tag:', `<req ${body}>`);
      if (RX_ANY.test(body)) reqs.push(evalAny(body));
      else if (RX_NOT.test(body)) reqs.push(evalNot(body));
      else reqs.push(evalMini(body));
    }
    if (!reqs.length) return { pass:true, reasons:[] };
    const pass = reqs.every(r=>r.pass);
    const reasons = reqs.filter(r=>!r.pass).map(r=>r.reason);
    return { pass, reasons };
  }

  function stripAllKnownTags(text){
    return String(text||'')
      .replace(RX_REQ_TAG,'')
      .replace(/<onselect\s+[^>]+>/gi,'')
      .trim();
  }

  function processChoiceText(raw){
    const src = String(raw||'');
    const expanded = conv(src);
    const res = evaluateReqs(expanded);

    let label = stripAllKnownTags(expanded);
    if (!res.pass){
      if (SHOW_REASON && res.reasons.length){
        label += ` ${REASON_PRE} ${res.reasons.join(' & ')} ${REASON_SUF}`;
      }
      if (SHOW_LOCK){
        label += ` ${LOCK_TXT}`;
      }
    }
    return { raw: src, label, pass: res.pass };
  }

  // ---------------------------------------------------------------------------
  // Hook Show Choices → stash processed choices
  // ---------------------------------------------------------------------------
  const _GI_cmd102 = Game_Interpreter.prototype.command102;
  Game_Interpreter.prototype.command102 = function(params){
    const list = ($gameMessage._choices || []).slice();
    const processed = list.map(processChoiceText);
    $gameTemp._repDlgChoices = processed;
    return _GI_cmd102.apply(this, arguments);
  };

  // ---------------------------------------------------------------------------
  // Build window commands (preserve original index with symbols)
  // ---------------------------------------------------------------------------
  const _WCL_make = Window_ChoiceList.prototype.makeCommandList;
  Window_ChoiceList.prototype.makeCommandList = function(){
    const state = $gameTemp._repDlgChoices;
    if (!state || state.length !== $gameMessage.choices().length){
      _WCL_make.call(this); return;
    }
    this.clearCommandList();
    state.forEach((c,i)=>{
      if (HIDE_LOCKED && !c.pass) return; // Hide safely: we keep symbol with original index for visible ones
      this.addCommand(c.label, `choice${i}`, c.pass);
    });
  };

  // Route OK back to original index
  const _WCL_callOkHandler = Window_ChoiceList.prototype.callOkHandler;
  Window_ChoiceList.prototype.callOkHandler = function(){
    const symbol = this.currentSymbol();
    if (symbol && symbol.startsWith('choice')){
      const idx = Number(symbol.slice('choice'.length))||0;
      this._index = idx;
    }
    _WCL_callOkHandler.call(this);
  };

  // Auto-select / Auto-skip
  const _WCL_start = Window_ChoiceList.prototype.start;
  Window_ChoiceList.prototype.start = function(){
    _WCL_start.call(this);
    // gather enabled indices
    const enabledIdx = [];
    for (let i=0;i<this.maxItems();i++){
      if (this.isCommandEnabled(i)) enabledIdx.push(i);
    }
    if (AUTO_SKIP_1 && enabledIdx.length===1){
      this.select(enabledIdx[0]);
      this.callOkHandler();
      return;
    }
    if (AUTO_FIRST){
      for (let i=0;i<this.maxItems();i++){
        if (this.isCommandEnabled(i)){ this.select(i); break; }
      }
    }
  };

  const _WCL_cancel = Window_ChoiceList.prototype.callCancelHandler;
  Window_ChoiceList.prototype.callCancelHandler = function(){
    _WCL_cancel.call(this);
    $gameTemp._repDlgChoices = null;
  };

  // ---------------------------------------------------------------------------
  // Onselect side-effects
  // ---------------------------------------------------------------------------
  const RX_ONSELECT = /<onselect\s+([^>]+)>/i;

  function playSE(spec){
    // "Name" or "Name,vol[,pitch[,pan]]"
    const parts = spec.split(',').map(s=>s.trim()).filter(Boolean);
    if (!parts.length) return;
    const name = parts[0];
    const vol = Number(parts[1]||90);
    const pit = Number(parts[2]||100);
    const pan = Number(parts[3]||0);
    if (name) AudioManager.playSe({name, volume: vol, pitch: pit, pan});
  }

  function showToast(text){
    const sc = SceneManager._scene;
    if (sc && typeof sc.addRepToast === 'function') sc.addRepToast(text);
    else $gameMessage.add(String(text));
  }

  function payBailConvenience(clear=true){
    if (typeof window.BW_payBail === 'function') return !!window.BW_payBail(!!clear);
    const info = $gameSystem?.arrestInfo?.();
    if (!info || !info.active) return false;
    const cost = Math.max(0, Math.floor(info.bail||0));
    if ($gameParty.gold() < cost) return false;
    $gameParty.loseGold(cost);
    if (typeof window.BW_releaseFromJail === 'function') window.BW_releaseFromJail(!!clear);
    else if ($gameSystem?.releaseFromJail) $gameSystem.releaseFromJail(!!clear);
    return true;
  }

  function applyOnSelect(raw){
    const m = String(raw||'').match(RX_ONSELECT); if (!m) return;
    const parts = m[1].split(';').map(x=>s(x)).filter(Boolean);

    parts.forEach(seg=>{
      // paybail [clear:true|false]
      let mm = seg.match(/^paybail(?:\s+clear\s*:\s*(true|false))?$/i);
      if (mm){ const clear = (String(mm[1]||'true').toLowerCase()==='true'); payBailConvenience(clear); return; }

      // gold:+/-N
      mm = seg.match(/^gold\s*:\s*([+\-]?\d+)/i);
      if (mm){ $gameParty.loseGold(-Number(mm[1])); return; }

      // rep: ID +/-N [type:xxx]
      mm = seg.match(/^rep\s*:\s*([^\s]+)\s*([+\-]?\d+)(?:\s*type\s*:\s*(\w+))?/i);
      if (mm){ const id=mm[1], d=Number(mm[2]), t=(mm[3]||'default'); try{ window.addRep?.(id,d,t); }catch(_){ } return; }

      // wanted adjust / set
      mm = seg.match(/^addwanted\s*:\s*([^\s]+)\s*([+\-]?\d+)(?:\s*scope\s*:\s*(faction|location))?/i);
      if (mm){ const id=mm[1], d=Number(mm[2]), sc=(mm[3]||'faction'); if ($gameSystem?.addWanted) $gameSystem.addWanted(id,sc,d); return; }
      mm = seg.match(/^setwanted\s*:\s*([^\s]+)\s*(\-?\d+)(?:\s*scope\s*:\s*(faction|location))?/i);
      if (mm){ const id=mm[1], v=Number(mm[2]), sc=(mm[3]||'faction'); if ($gameSystem?.setWanted) $gameSystem.setWanted(id,sc,v); else if ($gameSystem?.addWanted) { const cur=getWanted(id,sc); $gameSystem.addWanted(id,sc,(v-cur)); } return; }

      // switch: ID on|off
      mm = seg.match(/^switch\s*:\s*(\d+)\s*(on|off)/i);
      if (mm){ $gameSwitches.setValue(Number(mm[1]), mm[2].toLowerCase()==='on'); return; }

      // var: ID +/-N or =N
      mm = seg.match(/^var\s*:\s*(\d+)\s*([+\-=])\s*(\d+)/i);
      if (mm){
        const id=Number(mm[1]), op=mm[2], val=Number(mm[3]), cur=Number($gameVariables.value(id)||0);
        if (op==='+') $gameVariables.setValue(id, cur+val);
        else if (op==='-') $gameVariables.setValue(id, cur-val);
        else $gameVariables.setValue(id, val);
        return;
      }

      // items / weapons / armors
      mm = seg.match(/^item\s*:\s*(\d+)\s*([+\-])\s*(\d+)/i);
      if (mm){ const it=$dataItems[Number(mm[1])]; if (it) $gameParty.gainItem(it, Number(mm[2]==='+'?mm[3]:-mm[3])); return; }
      mm = seg.match(/^weapon\s*:\s*(\d+)\s*([+\-])\s*(\d+)/i);
      if (mm){ const it=$dataWeapons[Number(mm[1])]; if (it) $gameParty.gainItem(it, Number(mm[2]==='+'?mm[3]:-mm[3])); return; }
      mm = seg.match(/^armor\s*:\s*(\d+)\s*([+\-])\s*(\d+)/i);
      if (mm){ const it=$dataArmors[Number(mm[1])]; if (it) $gameParty.gainItem(it, Number(mm[2]==='+'?mm[3]:-mm[3])); return; }

      // states (single actor or whole party)
      mm = seg.match(/^addstate\s*:\s*(\d+)\s*actor\s*:\s*(\d+)/i);
      if (mm){ const st=Number(mm[1]), aid=Number(mm[2]); const a=$gameActors.actor(aid); if (a) a.addState(st); return; }
      mm = seg.match(/^remstate\s*:\s*(\d+)\s*actor\s*:\s*(\d+)/i);
      if (mm){ const st=Number(mm[1]), aid=Number(mm[2]); const a=$gameActors.actor(aid); if (a) a.removeState(st); return; }
      mm = seg.match(/^addstateParty\s*:\s*(\d+)/i);
      if (mm){ const st=Number(mm[1]); $gameParty.members().forEach(a=>a && a.addState(st)); return; }
      mm = seg.match(/^remstateParty\s*:\s*(\d+)/i);
      if (mm){ const st=Number(mm[1]); $gameParty.members().forEach(a=>a && a.removeState(st)); return; }

      // Common Event
      mm = seg.match(/^ce\s*:\s*(\d+)/i);
      if (mm){ $gameTemp.reserveCommonEvent(Number(mm[1])); return; }

      // Transfer (mapId,x,y,dir)
      mm = seg.match(/^transfer\s*:\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
      if (mm){ $gamePlayer.reserveTransfer(Number(mm[1]), Number(mm[2]), Number(mm[3]), Number(mm[4]), 0); return; }

      // SE
      mm = seg.match(/^se\s*:\s*(.+)$/i);
      if (mm){ playSE(mm[1]); return; }

      // Toast
      mm = seg.match(/^toast\s*:\s*(.+)$/i);
      if (mm){ showToast(conv(mm[1])); return; }
    });
  }

  const _GI_command402 = Game_Interpreter.prototype.command402;
  Game_Interpreter.prototype.command402 = function(params){
    const i = params[0];
    const processed = $gameTemp._repDlgChoices;
    if (processed && processed[i] && processed[i].pass){
      applyOnSelect(processed[i].raw);
    }
    $gameTemp._repDlgChoices = null;
    return _GI_command402.apply(this, arguments);
  };

})();
