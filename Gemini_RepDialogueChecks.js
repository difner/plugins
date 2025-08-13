//=============================================================================
// Gemini_RepDialogueChecks.js v1.4.0
// Locks/annotates Show Choices using <req ...> (+ <onselect ...> effects)
// Supports: gold, rep, wanted, item, switch, var, bail (current/authority),
// bailpaid (gold >= current bail), ANY-of groups
// NEW: <req bail ...>, <req bail: ENTITY scope:... ...>, <req bailpaid = true>
// NEW: <onselect paybail [clear:true|false]>
//=============================================================================
/*:
 * @target MZ
 * @plugindesc v1.4.0 Dialogue requirements & effects (gold/rep/wanted/item/switch/var/bail/bailpaid + ANY groups)
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
 * BASIC REQUIREMENT TAGS (put these directly inside the *choice text*)
 * ---------------------------------------------------------------------------
 * Gold: <req gold >= 100>
 * Rep: <req rep: MerchantsGuild >= 25 type:merchant>
 * Wanted: <req wanted: TownGuards > 0 scope:faction>
 * Item: <req item: 7 >= 1> // database item id
 * Switch: <req switch: 21 = on>
 * Variable: <req var: 10 >= 5>
 *
 * Bail (current arrest): <req bail >= 500>
 * Bail (explicit authority): <req bail: TownGuards scope:faction >= 500>
 * Have enough to pay (shorthand):<req bailpaid = true> // gold >= current bail
 *
 * Values can include inline show-tags:
 * <req gold >= <showBail: TownGuards scope:faction>>
 *
 * Combine multiple <req ...> tags on one choice (AND logic between tags).
 *
 * ---------------------------------------------------------------------------
 * ANY-OF GROUPS (pass if ANY group passes; each group is AND inside)
 * ---------------------------------------------------------------------------
 * <req any: [ rep: TownGuards >= 10 ; item:7 >= 1 ] [ gold >= 500 ]>
 * Meaning: EITHER (rep>=10 AND item #7 >=1) OR (gold>=500)
 *
 * ---------------------------------------------------------------------------
 * AUTO-LABELS & LOCKING
 * ---------------------------------------------------------------------------
 * Failing choices can show a compact reason and/or [LOCKED]. Configure below.
 *
 * ---------------------------------------------------------------------------
 * ON-SELECT SIDE EFFECTS (run only if the choice passed)
 * ---------------------------------------------------------------------------
 * <onselect gold:-500 ; rep: TownGuards -5 ; wanted: TownGuards -10 scope:faction ;
 * switch: 31 on ; var:10 +1 ; paybail>
 * Notes:
 * - gold:+/-N
 * - rep: ID +/-N [type:xxx]
 * - wanted: ID +/-N [scope:faction|location]
 * - switch: ID on|off
 * - var: ID +/-N or =N
 * - paybail [clear:true|false] (if omitted, clear:true)
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
  const DEBUG = b(P.debugLog||'false');

  function log(...a){ if (DEBUG) console.log('[RepDlg]', ...a); }

  // --- Comparators -----------------------------------------------------------
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

  // --- Converter for inline show-tags inside numeric values ------------------
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

  // --- Bridges to external systems (used if present) -------------------------
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
    // Use inline converter to leverage <showBail: ...> from BountyWarrants if available
    const t = conv(`<showBail: ${entity} scope:${scope}>`);
    const m = String(t).match(/-?\d+/);
    return m ? Number(m[0]) : currentBail();
  }
  function bailPaid(){
    const bail = currentBail();
    return $gameParty.gold() >= bail;
  }

  // --- Single requirement evaluators (mini syntax) ---------------------------
  // Return {pass:boolean, reason:string}
  function evalOneReqMini(txt){
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

    // BAILPAID (shorthand)
    m = raw.match(/^bailpaid\s*(=)\s*(true|false)/i);
    if (m){
      const wantTrue = (m[2].toLowerCase()==='true');
      const isTrue = !!bailPaid();
      return { pass: (isTrue===wantTrue), reason:`BailPaid = ${wantTrue}` };
    }

    return { pass:false, reason:'(unknown req)' };
  }

  // --- Parse <req ...> tags from final text ----------------------------------
  const RX_REQ_TAG = /<req\s+([^>]+?)>/gi;

  // ANY-of: <req any: [ ... ] [ ... ]>
  // Inside each [ ... ] block, entries separated by ';' — each using "mini" syntax.
  const RX_ANY = /^any\s*:\s*(.+)$/i;
  const RX_GROUPS = /\[([^\]]+)\]/g;

  function evalAnyOf(body){
    const groups = [];
    let gm; RX_GROUPS.lastIndex = 0;
    while ((gm = RX_GROUPS.exec(body)) !== null){
      const raw = gm[1];
      const entries = raw.split(';').map(x=>s(x)).filter(Boolean);
      groups.push(entries);
    }
    if (!groups.length) return { pass:false, reason:'(malformed any)' };

    const groupReasons = [];
    for (const entries of groups){
      const results = entries.map(e => evalOneReqMini(e));
      const ok = results.every(r => r.pass);
      if (ok) return { pass:true, reason:'ANY' };
      groupReasons.push(results.filter(r=>!r.pass).map(r=>r.reason).join(' & '));
    }
    return { pass:false, reason:`ANY[${groupReasons.join(' | ')}]` };
  }

  function stripAllKnownTags(text){
    return String(text||'')
      .replace(RX_REQ_TAG,'')
      .replace(/<onselect\s+[^>]+>/gi,'')
      .trim();
  }

  function evaluateReqTagsOnText(expanded){
    const reqs = [];
    let m;
    RX_REQ_TAG.lastIndex = 0;
    while ((m = RX_REQ_TAG.exec(expanded)) !== null){
      const body = s(m[1]);
      log('REQ tag:', `<req ${body}>`);
      const anym = body.match(RX_ANY);
      if (anym){
        reqs.push(evalAnyOf(body));
      } else {
        reqs.push(evalOneReqMini(body));
      }
    }
    if (!reqs.length) return { pass:true, reasons:[] };
    const pass = reqs.every(r=>r.pass);
    const reasons = reqs.filter(r=>!r.pass).map(r=>r.reason);
    return { pass, reasons };
  }

  function processChoiceText(raw){
    const src = String(raw||'');
    const expanded = conv(src);
    const res = evaluateReqTagsOnText(expanded);

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

  // --- Hook Show Choices to build processed list -----------------------------
  const _GI_cmd102 = Game_Interpreter.prototype.command102;
  Game_Interpreter.prototype.command102 = function(params){
    const list = ($gameMessage._choices || []).slice();
    const processed = list.map(processChoiceText);
    $gameTemp._repDlgChoices = processed;
    return _GI_cmd102.apply(this, arguments);
  };

  // --- Build the actual window entries --------------------------------------
  const _WCL_make = Window_ChoiceList.prototype.makeCommandList;
  Window_ChoiceList.prototype.makeCommandList = function(){
    const state = $gameTemp._repDlgChoices;
    if (!state || state.length !== $gameMessage.choices().length){
      _WCL_make.call(this); return;
    }
    this.clearCommandList();
    state.forEach((c,i)=> this.addCommand(c.label, `choice${i}`, c.pass));
  };

  // Route selection back to the original index
  const _WCL_callOkHandler = Window_ChoiceList.prototype.callOkHandler;
  Window_ChoiceList.prototype.callOkHandler = function(){
    const symbol = this.currentSymbol();
    if (symbol && symbol.startsWith('choice')){
      const idx = Number(symbol.slice('choice'.length))||0;
      this._index = idx;
    }
    _WCL_callOkHandler.call(this);
  };

  // Auto-select first enabled; clean up state on close/cancel
  const _WCL_start = Window_ChoiceList.prototype.start;
  Window_ChoiceList.prototype.start = function(){
    _WCL_start.call(this);
    if ($gameTemp._repDlgChoices){
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

  // --- Onselect side-effects -------------------------------------------------
  const RX_ONSELECT = /<onselect\s+([^>]+)>/i;

  function payBailConvenience(clear=true){
    // Prefer BW API if present
    if (typeof window.BW_payBail === 'function') return !!window.BW_payBail(!!clear);

    // Fallback: use arrestInfo and releaseFromJail if available
    const info = $gameSystem?.arrestInfo?.();
    if (!info || !info.active) return false;
    const cost = Math.max(0, Math.floor(info.bail||0));
    if ($gameParty.gold() < cost) return false;
    $gameParty.loseGold(cost);
    if (typeof window.BW_releaseFromJail === 'function') {
      window.BW_releaseFromJail(!!clear);
    } else if ($gameSystem?.releaseFromJail) {
      $gameSystem.releaseFromJail(!!clear);
    }
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

      // wanted: ID +/-N [scope:...]
      mm = seg.match(/^wanted\s*:\s*([^\s]+)\s*([+\-]?\d+)(?:\s*scope\s*:\s*(faction|location))?/i);
      if (mm){
        const id=mm[1], d=Number(mm[2]), sc=(mm[3]||'faction');
        if ($gameSystem?.addWanted) $gameSystem.addWanted(id,sc,d);
        return;
      }

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