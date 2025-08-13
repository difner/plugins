//=============================================================================
// Gemini_BountyBoard.js  v0.3.1
// Rotation (daily/weekly), expiry, cooldown/blacklist, weighted templates,
// owner-aware seeding, reward scaling, categories & filters, popup rewards.
// NEW in 0.3.1: Built-in commands to spawn a contract directly from a Template:
//   - Spawn From Template
//   - Open Board (Template)
//=============================================================================
/*:
 * @target MZ
 * @plugindesc v0.3.1 Bounty Board — rotation/expiry/cooldown + weighted templates, owner-aware, scaling, filters + spawn template cmds
 * @author Gemini
 *
 * @help
 * QUICK START
 * 1) Put this after TownReputation and Gemini_BountyWarrants (or merged).
 * 2) Add at least one Template (see “Template Pools” param section).
 * 3) (Optional) Set Map Note: <board owner: TownGuards scope:faction>
 * 4) Use Plugin Command: Bounty Board → Open Board
 *    or Bounty Board → Force Refresh (to seed immediately),
 *    or Spawn From Template / Open Board (Template) to drop a specific template.
 *
 * ENEMY NOTETAG (for hunt):
 *   <bounty tag: Wolves>
 * ITEM/WEAPON/ARMOR NOTETAG (for recovery):
 *   <contract tag: LostParcel>
 *
 * UI ESCAPES:
 *   <showBoardTitle> , <showContractsCount>
 *
 * -----------------------------------------------------------------------------
 * ROTATION/EXPIRY/COOLDOWN BASICS
 * - Rotation creates contracts from Templates using weighted random.
 * - “Owner-aware” optionally filters/boosts Templates by territory owner (map note).
 * - Expiry removes contracts after N minutes (configurable).
 * - Cooldown/Blacklist prevents repeats for N minutes after turn-in (and/or abandon).
 * - Reward scaling uses formulas with level: highest party level.
 *
 * -----------------------------------------------------------------------------
 * @param boardTitle
 * @text Board Title
 * @type string
 * @default Bounty Board
 *
 * @param useShownNames
 * @text Use TownReputation Shown Names (if any)
 * @type boolean
 * @default true
 *
 * @param listFontSize
 * @text List Font Size
 * @type number
 * @default 20
 *
 * @param helpLines
 * @text Help Lines
 * @type number
 * @default 3
 *
 * @param toastOnTurnIn
 * @text Toast On Turn-In
 * @type boolean
 * @default true
 *
 * @param showGateHints
 * @text Show Gate Hints
 * @type boolean
 * @default true
 *
 * @param showProgressBar
 * @text Show Progress Bar
 * @type boolean
 * @default true
 *
 * @param progressBarHeight
 * @text Progress Bar Height
 * @type number
 * @default 10
 *
 * @param autoTrackKills
 * @text Auto Track Kills
 * @type boolean
 * @default true
 *
 * @param autoTrackInventory
 * @text Auto Track Inventory
 * @type boolean
 * @default true
 *
 * @param enableFilters
 * @text Enable Category Tabs/Filters
 * @type boolean
 * @default true
 *
 * @param ---Rotation & Pools---
 * @text Rotation & Pools
 * @default
 *
 * @param enableRotation
 * @parent ---Rotation & Pools---
 * @text Enable Rotation
 * @type boolean
 * @default true
 *
 * @param rotationFreq
 * @parent ---Rotation & Pools---
 * @text Frequency
 * @type select
 * @option daily
 * @option weekly
 * @option manual
 * @default daily
 *
 * @param rotationHour
 * @parent ---Rotation & Pools---
 * @text Rotation Hour (0-23)
 * @type number
 * @min 0
 * @max 23
 * @default 9
 *
 * @param rotationMinute
 * @parent ---Rotation & Pools---
 * @text Rotation Minute (0-59)
 * @type number
 * @min 0
 * @max 59
 * @default 0
 *
 * @param rotationMode
 * @parent ---Rotation & Pools---
 * @text Rotation Mode
 * @type select
 * @option replace
 * @option append
 * @default replace
 *
 * @param rotationCountMin
 * @parent ---Rotation & Pools---
 * @text Contracts Min
 * @type number
 * @default 2
 *
 * @param rotationCountMax
 * @parent ---Rotation & Pools---
 * @text Contracts Max
 * @type number
 * @default 4
 *
 * @param ownerAware
 * @parent ---Rotation & Pools---
 * @text Owner-Aware (filter by map owner)
 * @type boolean
 * @default true
 *
 * @param ownerTemplateBoosts
 * @parent ---Rotation & Pools---
 * @text Owner → Template Boosts
 * @type struct<OwnerBoost>[]
 * @default []
 *
 * @param templates
 * @parent ---Rotation & Pools---
 * @text Template Pools
 * @type struct<Template>[]
 * @default []
 *
 * @param ---Expiry & Cooldown---
 * @text Expiry & Cooldown
 * @default
 *
 * @param enableExpiry
 * @parent ---Expiry & Cooldown---
 * @text Enable Expiry
 * @type boolean
 * @default true
 *
 * @param defaultExpiryMin
 * @parent ---Expiry & Cooldown---
 * @text Default Expiry (min)
 * @type number
 * @default 240
 *
 * @param enableCooldown
 * @parent ---Expiry & Cooldown---
 * @text Enable Cooldown/Blacklist
 * @type boolean
 * @default true
 *
 * @param defaultCooldownMin
 * @parent ---Expiry & Cooldown---
 * @text Default Cooldown (min)
 * @type number
 * @default 180
 *
 * @param blacklistAbandoned
 * @parent ---Expiry & Cooldown---
 * @text Blacklist On Abandon
 * @type boolean
 * @default false
 *
 * @param ---Reward Scaling---
 * @text Reward Scaling
 * @default
 *
 * @param enableScaling
 * @parent ---Reward Scaling---
 * @text Enable Scaling
 * @type boolean
 * @default false
 *
 * @param goldFormula
 * @parent ---Reward Scaling---
 * @text Gold Formula (JS)
 * @type string
 * @default base + level * 2
 *
 * @param repFormula
 * @parent ---Reward Scaling---
 * @text Rep Formula (JS)
 * @type string
 * @default base
 *
 * @command openBoard
 * @text Open Board
 *
 * @command forceRefresh
 * @text Force Refresh
 * @desc Generate a fresh set of contracts right now.
 * @arg mode
 * @text Mode
 * @type select
 * @option follow params
 * @option replace
 * @option append
 * @default follow params
 * @arg countMin
 * @text Count Min (override)
 * @type number
 * @default 0
 * @arg countMax
 * @text Count Max (override)
 * @type number
 * @default 0
 *
 * @command addContract
 * @text Add Contract (manual)
 * @desc Add a single contract (custom fields).
 * @arg id @type string @default C001
 * @arg name @type string @default Hunt Wolves
 * @arg type @type select @option hunt @option recovery @option cleanup @default hunt
 * @arg tagOrTarget @type string @default Wolves
 * @arg goal @type number @default 3
 * @arg cleanupScope @type select @option faction @option location @default faction
 * @arg rewardGold @type number @default 100
 * @arg rewardRep @type struct<RepDelta>[] @default []
 * @arg rewardWantedClear @type boolean @default false
 * @arg rewardWantedTarget @type string @default
 * @arg rewardWantedScope @type select @option faction @option location @default faction
 * @arg rewardWantedDelta @type number @default 0
 * @arg rewardCommonEvent @type common_event @default 0
 * @arg gateMinRepEntity @type string @default
 * @arg gateMinRepType @type string @default default
 * @arg gateMinRepValue @type number @default 0
 * @arg gateMaxWantedEntity @type string @default
 * @arg gateMaxWantedScope @type select @option faction @option location @default faction
 * @arg gateMaxWantedValue @type number @default 9999
 * @arg gateDepositGold @type number @default 0
 * @arg expiryMin @type number @default 0
 * @arg cooldownMin @type number @default 0
 *
 * @command spawnFromTemplate
 * @text Spawn From Template
 * @desc Spawn a single contract from a Template ID.
 * @arg templateId @type string @default C_WOLVES
 * @arg mode @type select @option append @option replace @default append
 *
 * @command openBoardTemplate
 * @text Open Board (Template)
 * @desc Spawn a single contract from a Template ID, then open the board.
 * @arg templateId @type string @default C_WOLVES
 * @arg mode @type select @option append @option replace @default append
 */
/*~struct~RepDelta:
 * @param entityId @type string
 * @param delta @type number @default 0
 * @param repType @type string @default default
 */
/*~struct~OwnerBoost:
 * @param ownerId @type string
 * @param ownerScope @type select @option faction @option location @default faction
 * @param templateId @type string
 * @param weightBoost @type number @default 1
 */
/*~struct~Template:
 * @param templateId @type string
 * @param name @type string
 * @param type @type select @option hunt @option recovery @option cleanup @default hunt
 * @param tagOrTarget @type string
 * @param goal @type number @default 1
 * @param weight @type number @default 1
 * @param ownerId @type string
 * @param ownerScope @type select @option faction @option location @default faction
 * @param rewardGold @type number @default 0
 * @param rewardRep @type struct<RepDelta>[] @default []
 * @param rewardWantedClear @type boolean @default false
 * @param rewardWantedTarget @type string @default
 * @param rewardWantedScope @type select @option faction @option location @default faction
 * @param rewardWantedDelta @type number @default 0
 * @param rewardCommonEvent @type common_event @default 0
 * @param gateMinRepEntity @type string @default
 * @param gateMinRepType @type string @default default
 * @param gateMinRepValue @type number @default 0
 * @param gateMaxWantedEntity @type string @default
 * @param gateMaxWantedScope @type select @option faction @option location @default faction
 * @param gateMaxWantedValue @type number @default 9999
 * @param gateDepositGold @type number @default 0
 * @param expiryMin @type number @default 0
 * @param cooldownMin @type number @default 0
 */

(() => {
  "use strict";
  const PN = "Gemini_BountyBoard";
  const P  = PluginManager.parameters(PN);

  // ----------------------- Helpers -----------------------
  const s=x=>String(x??"").trim();
  const n=x=>Number(x??0);
  const b=x=>String(x??"false")==="true";
  const j=raw=>{ try{return JSON.parse(raw||'[]');}catch(_){return[];} };
  const jmap=raw=>j(raw).map(x=>{try{return JSON.parse(x);}catch(_){return null;}}).filter(Boolean);
  const nowMs = ()=>Date.now();
  const minToMs = m => Math.max(0, Math.floor(m||0))*60*1000;

  function decodeArrayMaybe(raw){
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string'){
      try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) return parsed; } catch(_){}
      return [];
    }
    return [];
  }
  function normalizeRepArray(raw){
    const arr = decodeArrayMaybe(raw);
    const out = [];
    for (const elem of arr){
      if (!elem) continue;
      if (typeof elem === 'string'){
        try {
          const o = JSON.parse(elem);
          if (o && o.entityId != null) out.push({entityId:s(o.entityId), delta:n(o.delta||0), repType:s(o.repType||'default')});
        } catch(_){}
      } else if (typeof elem === 'object'){
        out.push({entityId:s(elem.entityId), delta:n(elem.delta||0), repType:s(elem.repType||'default')});
      }
    }
    return out;
  }

  // ----------------------- Params ------------------------
  const BOARD_TITLE        = s(P.boardTitle||"Bounty Board");
  const USE_SHOWN_NAMES    = b(P.useShownNames||"true");
  const LIST_FS            = n(P.listFontSize||20);
  const HELP_LINES         = n(P.helpLines||3);
  const TOAST_ON_TURNIN    = b(P.toastOnTurnIn||"true");
  const SHOW_GATE_HINTS    = b(P.showGateHints||"true");
  const SHOW_PROGRESS_BAR  = b(P.showProgressBar||"true");
  const PBAR_H             = n(P.progressBarHeight||10);
  const AUTO_KILLS         = b(P.autoTrackKills||"true");
  const AUTO_INV           = b(P.autoTrackInventory||"true");
  const ENABLE_FILTERS     = b(P.enableFilters||"true");

  const ENABLE_ROT         = b(P.enableRotation||"true");
  const ROT_FREQ           = s(P.rotationFreq||"daily"); // daily|weekly|manual
  const ROT_HOUR           = n(P.rotationHour||9);
  const ROT_MIN            = n(P.rotationMinute||0);
  const ROT_MODE           = s(P.rotationMode||"replace"); // replace|append
  const ROT_CNT_MIN        = n(P.rotationCountMin||2);
  const ROT_CNT_MAX        = n(P.rotationCountMax||4);
  const OWNER_AWARE        = b(P.ownerAware||"true");
  const OWNER_BOOSTS       = jmap(P.ownerTemplateBoosts);
  const TEMPLATES          = jmap(P.templates);

  const ENABLE_EXP         = b(P.enableExpiry||"true");
  const DEF_EXP_MIN        = n(P.defaultExpiryMin||240);

  const ENABLE_CD          = b(P.enableCooldown||"true");
  const DEF_CD_MIN         = n(P.defaultCooldownMin||180);
  const BL_ABANDON         = b(P.blacklistAbandoned||"false");

  const ENABLE_SCALING     = b(P.enableScaling||"false");
  const GOLD_F             = s(P.goldFormula||"base + level * 2");
  const REP_F              = s(P.repFormula||"base");

  // -------------------- Integration hooks ----------------
  const nice = id => (USE_SHOWN_NAMES && typeof TR_getDisplayName === 'function') ? TR_getDisplayName(id) : String(id||"");
  const getRepSafe = (entityId, repType) => (typeof getRep === 'function' ? getRep(entityId, repType||'default') : 0);
  const addRepSafe = (entityId, delta, repType) => {
    try {
      if (typeof addRepEx === 'function') addRepEx(entityId, delta, repType||'default', {origin:'BountyBoard'});
      else if (typeof addRep === 'function') addRep(entityId, delta, repType||'default');
    } catch(_){}
  };
  const hasBW = () => (typeof $gameSystem?.getWanted === 'function');
  const getWantedSafe = (entityId, scope) => (hasBW() ? $gameSystem.getWanted(entityId, scope||'faction') : 0);
  const setWantedSafe = (entityId, scope, val) => { if (hasBW()) $gameSystem.setWanted(entityId, scope||'faction', Math.max(0, Math.floor(val||0))); };

  function toast(txt){
    try{
      if (TOAST_ON_TURNIN && $gameSystem && typeof $gameSystem._pushToast === 'function') $gameSystem._pushToast(txt);
      else if (SceneManager._scene && typeof Scene_Map.prototype.addRepToast === 'function') SceneManager._scene.addRepToast(txt);
    }catch(_){}
  }

  // ---------------------- Game_System --------------------
  const _GS_init = Game_System.prototype.initialize;
  Game_System.prototype.initialize = function(){
    _GS_init.call(this);
    this._bbContracts = this._bbContracts || [];     // active contracts
    this._bbKill = this._bbKill || {};               // tag -> kills
    this._bbLastOwnerKey = this._bbLastOwnerKey || "";
    this._bbLastRotation = this._bbLastRotation || 0;// ms
    this._bbBlacklist = this._bbBlacklist || {};     // id -> untilMs
  };

  // --------------------- Owner detection -----------------
  function getMapOwner(){
    const note = $dataMap && $dataMap.note ? $dataMap.note : '';
    let m = note.match(/<board\s+owner:\s*([^>]+?)(?:\s+scope:(faction|location))?\s*>/i);
    if (!m) m = note.match(/<territory\s+owner:\s*([^>]+?)(?:\s+scope:(faction|location))?\s*>/i);
    if (m) return { id: s(m[1]), scope: s(m[2]||'faction') };
    try{
      if (typeof TC_getTerritoryOwner === 'function'){
        const o = TC_getTerritoryOwner($gameMap.mapId());
        if (!o) return null;
        if (typeof o === 'string') return { id: s(o), scope: 'faction' };
        if (o.id) return { id: s(o.id), scope: s(o.scope||'faction') };
      }
    }catch(_){}
    return null;
  }

  // --------------------- Templates & rotation ------------
  function templateMatchesOwner(t, owner){
    if (!OWNER_AWARE || !owner) return true;
    const tid = s(t.ownerId||''); const ts = s(t.ownerScope||'faction');
    if (!tid) return true; // template not restricted
    return (tid===owner.id && ts===owner.scope);
  }
  function weightForTemplate(t, owner){
    let w = Math.max(0, n(t.weight||1));
    if (owner){
      OWNER_BOOSTS.forEach(b=>{
        if (s(b.ownerId)===owner.id && s(b.ownerScope||'faction')===owner.scope && s(b.templateId)===s(t.templateId)) {
          w += n(b.weightBoost||0);
        }
      });
    }
    return w;
  }
  function rotationDue(){
    if (!ENABLE_ROT || ROT_FREQ==='manual') return false;
    const last = $gameSystem._bbLastRotation || 0;
    const now = new Date();
    if (!last) return true; // never rotated — do one
    if (ROT_FREQ==='daily'){
      // rotate if we've crossed today’s cut or 24h have elapsed since last
      const cutToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), ROT_HOUR, ROT_MIN, 0, 0).getTime();
      if (nowMs() >= cutToday && last < cutToday) return true;
      return (nowMs() - last) >= 24*60*60*1000;
    } else if (ROT_FREQ==='weekly'){
      return (nowMs() - last) >= 7*24*60*60*1000;
    }
    return false;
  }
  function markRotated(){
    $gameSystem._bbLastRotation = nowMs();
  }

  // contract core
  function findContract(id){ return $gameSystem._bbContracts.find(c=>c.id===s(id))||null; }
  function removeContract(id){ $gameSystem._bbContracts = $gameSystem._bbContracts.filter(c=>c.id!==s(id)); }
  function clearContracts(){ $gameSystem._bbContracts = []; }

  function scaleValue(base, formula){
    if (!ENABLE_SCALING) return base;
    try{
      const level = $gameParty ? $gameParty.highestLevel() : 1;
      // eslint-disable-next-line no-new-func
      const fn = new Function("base","level",`return (${formula});`);
      const v = fn(Number(base||0), Number(level||1));
      return Math.max(0, Math.floor(v));
    }catch(_){ return base; }
  }

  function addContractRaw(obj){
    // normalize reward reps
    const repList =
      obj.rewardRep != null ? normalizeRepArray(obj.rewardRep)
      : (obj.reward && obj.reward.rep != null ? normalizeRepArray(obj.reward.rep) : []);

    // scaling
    const baseGold = n(obj.rewardGold||obj.reward?.gold||0);
    const gold = scaleValue(baseGold, GOLD_F);
    const repScaled = repList.map(r => ({ entityId: r.entityId, repType: r.repType, delta: scaleValue(n(r.delta), REP_F) }));

    const c = {
      id: s(obj.id),
      name: s(obj.name||obj.id),
      type: s(obj.type||'hunt'),
      tagOrTarget: s(obj.tagOrTarget||''),
      goal: Math.max(1, n(obj.goal||1)),
      cleanupScope: s(obj.cleanupScope||'faction'),
      reward: {
        gold,
        rep: repScaled,
        wantedClear: b(obj.rewardWantedClear||String(obj.reward?.wantedClear||'false')),
        wantedTarget: s(obj.rewardWantedTarget||obj.reward?.wantedTarget||''),
        wantedScope: s(obj.rewardWantedScope||obj.reward?.wantedScope||'faction'),
        wantedDelta: n(obj.rewardWantedDelta||obj.reward?.wantedDelta||0),
        commonEventId: n(obj.rewardCommonEvent||obj.reward?.commonEventId||0)
      },
      gate: {
        minRepEntity: s(obj.gateMinRepEntity||obj.gate?.minRepEntity||''),
        minRepType: s(obj.gateMinRepType||obj.gate?.minRepType||'default'),
        minRepValue: n(obj.gateMinRepValue||obj.gate?.minRepValue||0),
        maxWantedEntity: s(obj.gateMaxWantedEntity||obj.gate?.maxWantedEntity||''),
        maxWantedScope: s(obj.gateMaxWantedScope||obj.gate?.maxWantedScope||'faction'),
        maxWantedValue: n(obj.gateMaxWantedValue||obj.gate?.maxWantedValue||9999),
        depositGold: n(obj.gateDepositGold||obj.gate?.depositGold||0)
      },
      status: 'available',
      acceptedAt: 0,
      expireAt: ENABLE_EXP ? (nowMs() + (obj.expiryMin?minToMs(obj.expiryMin):minToMs(DEF_EXP_MIN))) : 0,
      cooldownMin: ENABLE_CD ? (obj.cooldownMin? n(obj.cooldownMin) : DEF_CD_MIN) : 0
    };

    const list = $gameSystem._bbContracts;
    const idx = list.findIndex(x=>x.id===c.id);
    if (idx>=0){
      const prev = list[idx];
      c.status = prev.status;
      c.acceptedAt = prev.acceptedAt;
      c.expireAt = prev.expireAt || c.expireAt;
      list[idx] = { ...prev, ...c };
    } else {
      list.push(c);
    }
  }

  function gateCheck(c){
    if (c.gate.minRepEntity){
      if (getRepSafe(c.gate.minRepEntity, c.gate.minRepType) < c.gate.minRepValue){
        return { ok:false, reason:`Rep ${nice(c.gate.minRepEntity)} ${c.gate.minRepType} ≥ ${c.gate.minRepValue}` };
      }
    }
    if (c.gate.maxWantedEntity){
      if (getWantedSafe(c.gate.maxWantedEntity, c.gate.maxWantedScope) > c.gate.maxWantedValue){
        return { ok:false, reason:`Wanted ${nice(c.gate.maxWantedEntity)} [${c.gate.maxWantedScope}] ≤ ${c.gate.maxWantedValue}` };
      }
    }
    if (c.gate.depositGold > 0){
      if ($gameParty.gold() < c.gate.depositGold){
        return { ok:false, reason:`Need ${c.gate.depositGold}g deposit` };
      }
    }
    return { ok:true };
  }

  function acceptContract(id){
    const c = findContract(id); if (!c) return false;
    if (c.status !== 'available') return false;
    const g = gateCheck(c); if (!g.ok) return false;
    if (c.gate.depositGold>0) $gameParty.loseGold(c.gate.depositGold);
    c.status = 'accepted';
    c.acceptedAt = nowMs();
    return true;
  }
  function abandonContract(id){
    const c = findContract(id); if (!c) return false;
    if (c.status !== 'accepted') return false;
    c.status = 'available';
    c.acceptedAt = 0;
    if (ENABLE_CD && BL_ABANDON){
      $gameSystem._bbBlacklist[c.id] = nowMs() + minToMs(Math.max(1, c.cooldownMin||DEF_CD_MIN));
    }
    return true;
  }
  function turnInContract(id){
    const c = findContract(id); if (!c) return false;
    if (c.status !== 'accepted') return false;
    if (!isComplete(c)) return false;
    const lines = [];
    if (c.reward.gold>0){ $gameParty.gainGold(c.reward.gold); lines.push(`+${c.reward.gold}g`); }
    (c.reward.rep||[]).forEach(r => {
      addRepSafe(r.entityId, n(r.delta), s(r.repType||'default'));
      lines.push(`Rep ${nice(r.entityId)} ${r.repType} ${r.delta>0?'+':''}${r.delta}`);
    });
    if (c.reward.wantedClear && c.reward.wantedTarget){
      setWantedSafe(c.reward.wantedTarget, c.reward.wantedScope, 0);
      lines.push(`Wanted(${nice(c.reward.wantedTarget)}/${c.reward.wantedScope}) cleared`);
    } else if (c.reward.wantedDelta && c.reward.wantedTarget){
      const cur = getWantedSafe(c.reward.wantedTarget, c.reward.wantedScope);
      setWantedSafe(c.reward.wantedTarget, c.reward.wantedScope, Math.max(0, cur + c.reward.wantedDelta));
      lines.push(`Wanted(${nice(c.reward.wantedTarget)}/${c.reward.wantedScope}) ${c.reward.wantedDelta>0?'+':''}${c.reward.wantedDelta}`);
    }
    if (c.reward.commonEventId>0){
      $gameTemp.reserveCommonEvent(c.reward.commonEventId);
      lines.push(`Common Event #${c.reward.commonEventId}`);
    }
    c.status = 'turnedin';
    // blacklist/cooldown
    if (ENABLE_CD) $gameSystem._bbBlacklist[c.id] = nowMs() + minToMs(Math.max(1, c.cooldownMin||DEF_CD_MIN));
    toast(`Completed: ${c.name}`);
    if (SceneManager._scene && SceneManager._scene.showTurnInPopup){
      SceneManager._scene.showTurnInPopup(c.name, lines);
    }
    return true;
  }

  // ---------------------- Progress helpers ---------------
  function killCount(tag){ return Math.max(0, Math.floor($gameSystem._bbKill[s(tag)]||0)); }
  function invCountByTag(tag){
    tag = s(tag);
    let total = 0;
    const scan = db => {
      if (!db) return;
      for (let i=1; i<db.length; i++){
        const it = db[i]; if (!it || !it.note) continue;
        const m = it.note.match(/<contract\s+tag:\s*([^>]+)>/i);
        if ((it.meta && it.meta['contract tag']===tag) || (m && s(m[1])===tag)){
          total += $gameParty.numItems(it);
        }
      }
    };
    scan($dataItems); scan($dataWeapons); scan($dataArmors);
    return total;
  }
  function isComplete(c){
    switch(c.type){
      case 'hunt':     return killCount(c.tagOrTarget) >= c.goal;
      case 'recovery': return invCountByTag(c.tagOrTarget) >= c.goal;
      case 'cleanup':  return getWantedSafe(c.tagOrTarget, c.cleanupScope) <= c.goal;
      default: return false;
    }
  }

  // ---------------------- Rotation engine ----------------
  function purgeExpired(){
    if (!ENABLE_EXP) return;
    const t = nowMs();
    $gameSystem._bbContracts = $gameSystem._bbContracts.filter(c => !c.expireAt || c.expireAt > t || c.status==='accepted');
  }
  function isBlacklisted(id){
    const until = $gameSystem._bbBlacklist[id];
    if (!until) return false;
    if (nowMs() >= until) { delete $gameSystem._bbBlacklist[id]; return false; }
    return true;
  }
  function weightedPick(cands, count){
    const out = [];
    const pool = cands.slice();
    while (out.length < count && pool.length){
      let sum = 0;
      pool.forEach(p => sum += p._w);
      if (sum <= 0) break;
      let r = Math.random() * sum;
      let idx = -1;
      for (let i=0;i<pool.length;i++){
        r -= pool[i]._w;
        if (r <= 0){ idx = i; break; }
      }
      if (idx<0) idx = pool.length-1;
      out.push(pool[idx]);
      pool.splice(idx,1);
    }
    return out;
  }
  function generateFromTemplates(mode, countMin, countMax){
    const owner = OWNER_AWARE ? getMapOwner() : null;
    const existingIds = new Set($gameSystem._bbContracts.map(c=>c.id));
    const cand = [];
    TEMPLATES.forEach(t=>{
      if (!templateMatchesOwner(t, owner)) return;
      const tid = s(t.templateId||'');
      if (!tid) return;
      if (existingIds.has(tid)) return;
      if (isBlacklisted(tid)) return;
      const w = weightForTemplate(t, owner);
      if (w <= 0) return;
      cand.push({ t, _w:w });
    });
    if (!cand.length) return 0;
    const minC = Math.max(0, n(countMin||ROT_CNT_MIN));
    const maxC = Math.max(minC, n(countMax||ROT_CNT_MAX));
    const count = Math.min(maxC, cand.length);
    const picks = weightedPick(cand, count);
    if (mode==='replace') clearContracts();
    picks.forEach(p=>{
      const t = p.t;
      addContractRaw({
        id: s(t.templateId),
        name: s(t.name||t.templateId),
        type: s(t.type||'hunt'),
        tagOrTarget: s(t.tagOrTarget||''),
        goal: n(t.goal||1),
        cleanupScope: s(t.cleanupScope||'faction'),
        rewardGold: n(t.rewardGold||0),
        rewardRep: t.rewardRep,
        rewardWantedClear: t.rewardWantedClear,
        rewardWantedTarget: t.rewardWantedTarget,
        rewardWantedScope: t.rewardWantedScope,
        rewardWantedDelta: t.rewardWantedDelta,
        rewardCommonEvent: t.rewardCommonEvent,
        gateMinRepEntity: t.gateMinRepEntity,
        gateMinRepType: t.gateMinRepType,
        gateMinRepValue: t.gateMinRepValue,
        gateMaxWantedEntity: t.gateMaxWantedEntity,
        gateMaxWantedScope: t.gateMaxWantedScope,
        gateMaxWantedValue: t.gateMaxWantedValue,
        gateDepositGold: t.gateDepositGold,
        expiryMin: t.expiryMin,
        cooldownMin: t.cooldownMin
      });
    });
    return picks.length;
  }
  function maybeRotateOnOpen(){
    purgeExpired();
    if (!ENABLE_ROT) return;
    if (ROT_FREQ==='manual') return;
    if (!rotationDue()) return;
    generateFromTemplates(ROT_MODE, ROT_CNT_MIN, ROT_CNT_MAX);
    markRotated();
  }

  // ---------------------- Commands -----------------------
  function parseRepStructList(raw){
    try { return JSON.parse(raw||'[]').map(s=>JSON.parse(s)); } catch(_){ return []; }
  }
  PluginManager.registerCommand(PN,"openBoard", function(){
    maybeRotateOnOpen();
    SceneManager.push(Scene_BountyBoard);
  });
  PluginManager.registerCommand(PN,"forceRefresh", function(args){
    const modeArg = s(args.mode||'follow params');
    const mode = (modeArg==='replace'||modeArg==='append') ? modeArg : ROT_MODE;
    const cmin = n(args.countMin||0) || ROT_CNT_MIN;
    const cmax = n(args.countMax||0) || ROT_CNT_MAX;
    purgeExpired();
    generateFromTemplates(mode, cmin, cmax);
    $gameSystem._bbLastRotation = nowMs();
  });
  PluginManager.registerCommand(PN,"addContract", args => {
    addContractRaw({
      id: args.id, name: args.name, type: args.type, tagOrTarget: args.tagOrTarget, goal: args.goal,
      cleanupScope: args.cleanupScope,
      rewardGold: args.rewardGold,
      rewardRep: parseRepStructList(args.rewardRep),
      rewardWantedClear: args.rewardWantedClear,
      rewardWantedTarget: args.rewardWantedTarget,
      rewardWantedScope: args.rewardWantedScope,
      rewardWantedDelta: args.rewardWantedDelta,
      rewardCommonEvent: args.rewardCommonEvent,
      gateMinRepEntity: args.gateMinRepEntity,
      gateMinRepType: args.gateMinRepType,
      gateMinRepValue: args.gateMinRepValue,
      gateMaxWantedEntity: args.gateMaxWantedEntity,
      gateMaxWantedScope: args.gateMaxWantedScope,
      gateMaxWantedValue: args.gateMaxWantedValue,
      gateDepositGold: args.gateDepositGold,
      expiryMin: args.expiryMin,
      cooldownMin: args.cooldownMin
    });
  });

  // NEW v0.3.1: Spawn a contract straight from a Template ID
  PluginManager.registerCommand(PN,"spawnFromTemplate", args => {
    const tid = s(args.templateId||'');
    const mode = s(args.mode||'append'); // append|replace
    const t = TEMPLATES.find(tt => s(tt.templateId)===tid);
    if (!t) return;
    if (mode==='replace') clearContracts();
    addContractRaw({
      id: s(t.templateId),
      name: s(t.name||t.templateId),
      type: s(t.type||'hunt'),
      tagOrTarget: s(t.tagOrTarget||''),
      goal: n(t.goal||1),
      cleanupScope: s(t.cleanupScope||'faction'),
      rewardGold: n(t.rewardGold||0),
      rewardRep: t.rewardRep,
      rewardWantedClear: t.rewardWantedClear,
      rewardWantedTarget: t.rewardWantedTarget,
      rewardWantedScope: t.rewardWantedScope,
      rewardWantedDelta: t.rewardWantedDelta,
      rewardCommonEvent: t.rewardCommonEvent,
      gateMinRepEntity: t.gateMinRepEntity,
      gateMinRepType: t.gateMinRepType,
      gateMinRepValue: t.gateMinRepValue,
      gateMaxWantedEntity: t.gateMaxWantedEntity,
      gateMaxWantedScope: t.gateMaxWantedScope,
      gateMaxWantedValue: t.gateMaxWantedValue,
      gateDepositGold: t.gateDepositGold,
      expiryMin: t.expiryMin,
      cooldownMin: t.cooldownMin
    });
  });

  // NEW v0.3.1: Spawn from template, then open the board
  PluginManager.registerCommand(PN,"openBoardTemplate", function(args){
    const tid = s(args.templateId||'');
    const mode = s(args.mode||'append');
    PluginManager.callCommand(this, PN, "spawnFromTemplate", { templateId: tid, mode });
    SceneManager.push(Scene_BountyBoard);
  });

  // ---------------------- Escape codes -------------------
  const _WB_conv = Window_Base.prototype.convertEscapeCharacters;
  Window_Base.prototype.convertEscapeCharacters = function(text){
    let t = _WB_conv.call(this, text);
    t = t.replace(/<showContractsCount>/gi, String($gameSystem._bbContracts.filter(c=>c.status!=='turnedin').length));
    t = t.replace(/<showBoardTitle>/gi, BOARD_TITLE);
    return t;
  };

  // ---------------------- Auto progress ------------------
  if (AUTO_KILLS){
    const _BM_end = BattleManager.endBattle;
    BattleManager.endBattle = function(result){
      try{
        if (result===0){
          for (const ev of $gameTroop.members()){
            const e = ev.enemy();
            if (e && e.note){
              const m = e.note.match(/<bounty\s+tag:\s*([^>]+)>/i);
              if (m && ev.isDead()){
                const tag = s(m[1]);
                $gameSystem._bbKill[tag] = Math.max(0, n($gameSystem._bbKill[tag]||0)) + 1;
              }
            }
          }
        }
      }catch(_){}
      _BM_end.call(this, result);
    };
  }
  if (AUTO_INV){
    const _GP_gainItem = Game_Party.prototype.gainItem;
    Game_Party.prototype.gainItem = function(item, amount, includeEquip){
      _GP_gainItem.call(this, item, amount, includeEquip);
      const sc = SceneManager._scene;
      if (sc && sc instanceof Scene_BountyBoard && sc._list) sc._list.refresh();
    };
  }

  // ---------------------- UI: Tabs + List + Help ---------
  function Window_BountyTabs(){ this.initialize(...arguments); }
  Window_BountyTabs.prototype = Object.create(Window_HorzCommand.prototype);
  Window_BountyTabs.prototype.constructor = Window_BountyTabs;
  Window_BountyTabs.prototype.initialize = function(rect){
    this._cat = 'all';
    Window_HorzCommand.prototype.initialize.call(this, rect);
    this.select(0);
  };
  Window_BountyTabs.prototype.maxCols = function(){ return 6; };
  Window_BountyTabs.prototype.makeCommandList = function(){
    this.addCommand('All','all');
    this.addCommand('Hunt','hunt');
    this.addCommand('Recovery','recovery');
    this.addCommand('Cleanup','cleanup');
    this.addCommand('Accepted','accepted');
    this.addCommand('Done','turnedin');
  };
  Window_BountyTabs.prototype.setCategory = function(cat){
    this._cat = cat;
    this.select(['all','hunt','recovery','cleanup','accepted','turnedin'].indexOf(cat));
    this.callHandler('change');
  };
  Window_BountyTabs.prototype.currentCategory = function(){ return this._cat; };

  function Window_BountyList(){ this.initialize(...arguments); }
  Window_BountyList.prototype = Object.create(Window_Selectable.prototype);
  Window_BountyList.prototype.constructor = Window_BountyList;
  Window_BountyList.prototype.initialize = function(rect){
    Window_Selectable.prototype.initialize.call(this, rect);
    this._filter = 'all';
    this.contents.fontSize = LIST_FS;
    this.refresh(); this.activate(); this.select(0);
  };
  Window_BountyList.prototype.setFilter = function(cat){
    if (this._filter!==cat){ this._filter = cat; this.refresh(); this.select(0); }
  };
  Window_BountyList.prototype.filtered = function(){
    const f = s(this._filter||'all');
    const data = $gameSystem._bbContracts;
    if (f==='all') return data;
    if (f==='accepted' || f==='turnedin') return data.filter(c=>c.status===f);
    return data.filter(c=>c.type===f);
  };
  Window_BountyList.prototype.maxItems = function(){ return this.filtered().length; };
  Window_BountyList.prototype.item = function(){ return this.filtered()[this.index()]||null; };
  Window_BountyList.prototype.lineHeight = function(){
    const base = Window_Base.prototype.lineHeight.call(this);
    return Math.max(base, LIST_FS + 10);
  };
  Window_BountyList.prototype.itemHeight = function(){
    const rows = 2 + (SHOW_PROGRESS_BAR ? 1 : 0) + (SHOW_GATE_HINTS ? 1 : 0);
    const lh = this.lineHeight();
    const extra = SHOW_PROGRESS_BAR ? PBAR_H + 6 : 6;
    return rows * lh + extra;
  };
  Window_BountyList.prototype.drawItem = function(index){
    const c = this.filtered()[index]; if (!c) return;
    const r = this.itemRect(index), lh = this.lineHeight(); let y = r.y;

    // Title + status (expiry marker)
    const status = (c.status==='available')?'[NEW]':(c.status==='accepted')?'[ACCEPTED]':'[DONE]';
    const expTxt = (ENABLE_EXP && c.expireAt) ? ` — expires in ${Math.max(0, Math.ceil((c.expireAt - nowMs())/60000))}m` : '';
    this.changeTextColor(ColorManager.systemColor());
    this.drawText(`${c.name} ${status}${expTxt}`, r.x+this.textPadding(), y, r.width-this.textPadding()*2, 'left');
    this.resetTextColor(); y += lh;

    // Subline
    let targetText = '';
    if (c.type==='hunt') targetText = `Hunt ${c.goal} × ${c.tagOrTarget}`;
    else if (c.type==='recovery') targetText = `Obtain ${c.goal} × ${c.tagOrTarget}`;
    else targetText = `Reduce Wanted (${c.tagOrTarget}/${c.cleanupScope}) ≤ ${c.goal}`;
    this.drawText(targetText, r.x+this.textPadding(), y, r.width, 'left'); y += lh;

    // Progress / Gate
    if (c.status!=='turnedin'){
      let have=0, need=c.goal;
      if (c.type==='hunt') have = killCount(c.tagOrTarget);
      else if (c.type==='recovery') have = invCountByTag(c.tagOrTarget);
      else have = Math.max(0, c.goal - getWantedSafe(c.tagOrTarget, c.cleanupScope));

      if (SHOW_PROGRESS_BAR){
        const x = r.x+this.textPadding(), w = Math.floor(r.width*0.6);
        const pct = Math.max(0, Math.min(1, (c.type==='cleanup')
          ? (1 - Math.max(0, getWantedSafe(c.tagOrTarget, c.cleanupScope) - c.goal)/Math.max(1,c.goal||1))
          : (have/Math.max(1,need))));
        this.contents.fillRect(x, y+3, w, PBAR_H, ColorManager.gaugeBackColor());
        this.contents.gradientFillRect(x, y+3, Math.floor(w*pct), PBAR_H, ColorManager.powerUpColor(), ColorManager.textColor(17));
        const shownHave = (c.type==='cleanup') ? Math.min(c.goal, Math.max(0, c.goal - getWantedSafe(c.tagOrTarget, c.cleanupScope))) : Math.min(have, need);
        this.drawText((c.type==='cleanup') ? `Wanted: ${getWantedSafe(c.tagOrTarget, c.cleanupScope)} → ≤ ${c.goal}`
                                           : `${shownHave}/${need}`,
                      x+w+10, y, r.width-(x+w+10), 'left');
        y += lh;
      } else {
        const shownHave = Math.min(have, need);
        this.drawText((c.type==='cleanup')?`Wanted ≤ ${c.goal} (now ${getWantedSafe(c.tagOrTarget, c.cleanupScope)})`
                                           :`${shownHave}/${need}`,
                      r.x+this.textPadding(), y, r.width, 'left');
        y += lh;
      }

      if (SHOW_GATE_HINTS && c.status==='available'){
        const g = gateCheck(c);
        if (!g.ok){
          this.changeTextColor(ColorManager.crisisColor());
          this.drawText(`Locked: ${g.reason}`, r.x+this.textPadding(), y, r.width, 'left');
          this.resetTextColor();
        }
      }
    }
  };

  function Window_BountyHelp(){ this.initialize(...arguments); }
  Window_BountyHelp.prototype = Object.create(Window_Base.prototype);
  Window_BountyHelp.prototype.constructor = Window_BountyHelp;
  Window_BountyHelp.prototype.initialize = function(rect){ Window_Base.prototype.initialize.call(this, rect); };
  Window_BountyHelp.prototype.setContract = function(c){
    this.contents.clear();
    if (!c){ this.drawText("No contracts.", this.textPadding(), 0, this.contents.width-this.textPadding()*2, 'left'); return; }
    const pad = this.textPadding(); const rw = this.contents.width - pad*2;
    const rwd = c.reward, gate = c.gate;
    this.drawTextEx(`\\c[16]${c.name}\\c[0] — ${c.type.toUpperCase()}`, pad, 0, rw);
    let y = this.lineHeight();
    let goalText = '';
    if (c.type==='hunt') goalText = `Goal: Defeat ${c.goal} × ${c.tagOrTarget}`;
    else if (c.type==='recovery') goalText = `Goal: Obtain ${c.goal} × ${c.tagOrTarget}`;
    else goalText = `Goal: Wanted(${nice(c.tagOrTarget)}/${c.cleanupScope}) ≤ ${c.goal}`;
    this.drawText(goalText, pad, y, rw, 'left'); y += this.lineHeight();

    const rewardBits = [];
    if (rwd.gold>0) rewardBits.push(`${rwd.gold}g`);
    (rwd.rep||[]).forEach(r => rewardBits.push(`Rep ${nice(r.entityId)} ${r.repType} ${r.delta>0?'+':''}${r.delta}`));
    if (hasBW()){
      if (rwd.wantedClear && rwd.wantedTarget) rewardBits.push(`Clear Wanted(${nice(rwd.wantedTarget)}/${rwd.wantedScope})`);
      else if (rwd.wantedDelta && rwd.wantedTarget) rewardBits.push(`Wanted(${nice(rwd.wantedTarget)}/${rwd.wantedScope}) ${rwd.wantedDelta}`);
    }
    if (rwd.commonEventId>0) rewardBits.push(`CommonEvent #${rwd.commonEventId}`);
    this.drawText(`Rewards: ${rewardBits.length?rewardBits.join(' , '):'—'}`, pad, y, rw, 'left'); y += this.lineHeight();

    const gateBits = [];
    if (gate.minRepEntity) gateBits.push(`Rep ${nice(gate.minRepEntity)} ${gate.minRepType} ≥ ${gate.minRepValue}`);
    if (gate.maxWantedEntity) gateBits.push(`Wanted ${nice(gate.maxWantedEntity)} [${gate.maxWantedScope}] ≤ ${gate.maxWantedValue}`);
    if (gate.depositGold>0) gateBits.push(`Deposit ${gate.depositGold}g`);
    if (gateBits.length) this.drawText(`Req: ${gateBits.join(' ; ')}`, pad, y, rw, 'left');
  };

  function Window_TurnInPopup(){ this.initialize(...arguments); }
  Window_TurnInPopup.prototype = Object.create(Window_Selectable.prototype);
  Window_TurnInPopup.prototype.constructor = Window_TurnInPopup;
  Window_TurnInPopup.prototype.initialize = function(rect, title, lines){
    Window_Selectable.prototype.initialize.call(this, rect);
    this._title = String(title||'Completed');
    this._lines = Array.isArray(lines)?lines.slice():[];
    this.openness = 0;
    this.open(); this.activate(); this.select(0);
  };
  Window_TurnInPopup.prototype.maxItems = function(){ return 1; };
  Window_TurnInPopup.prototype.isOkEnabled = function(){ return true; };
  Window_TurnInPopup.prototype.drawItem = function(){
    const pad = this.textPadding(); const w = this.contents.width - pad*2;
    this.changeTextColor(ColorManager.systemColor());
    this.drawText(this._title, pad, 0, w, 'center'); this.resetTextColor();
    let y = this.lineHeight();
    if (!this._lines.length) this._lines = ['No rewards'];
    for (const ln of this._lines){
      this.drawText(ln, pad, y, w, 'left'); y += this.lineHeight();
    }
    this.changeTextColor(ColorManager.textColor(7));
    this.drawText('OK', pad, y+4, w, 'center'); this.resetTextColor();
  };
  Window_TurnInPopup.prototype.refresh = function(){ this.contents.clear(); this.drawItem(); };
  Window_TurnInPopup.prototype.update = function(){
    Window_Selectable.prototype.update.call(this);
    if (this.isOpenAndActive() && (Input.isTriggered('ok')||Input.isTriggered('cancel')||TouchInput.isTriggered())) {
      this.processOk();
    }
  };

  function Scene_BountyBoard(){ this.initialize.apply(this, arguments); }
  Scene_BountyBoard.prototype = Object.create(Scene_MenuBase.prototype);
  Scene_BountyBoard.prototype.constructor = Scene_BountyBoard;
  Scene_BountyBoard.prototype.create = function(){
    Scene_MenuBase.prototype.create.call(this);
    const top = this.mainAreaTop();

    let tabH = 0;
    if (ENABLE_FILTERS){
      tabH = this.calcWindowHeight(1, false);
      this._tabs = new Window_BountyTabs(new Rectangle(0, top, Graphics.boxWidth, tabH));
      this._tabs.setHandler('ok', this.onTabOk?.bind(this));
      this._tabs.setHandler('cancel', this.popScene.bind(this));
      this._tabs.setHandler('change', this.onTabChange.bind(this));
      this.addWindow(this._tabs);
    }

    const helpH = this.calcWindowHeight(Math.max(1, HELP_LINES), false);
    const listY = top + tabH + helpH;
    const listH = Graphics.boxHeight - listY;

    this._help = new Window_BountyHelp(new Rectangle(0, top+tabH, Graphics.boxWidth, helpH));
    this.addWindow(this._help);

    this._list = new Window_BountyList(new Rectangle(0, listY, Graphics.boxWidth, listH));
    this.addWindow(this._list);

    this._list.setHandler('ok', this.onOk.bind(this));
    this._list.setHandler('cancel', this.popScene.bind(this));

    const scene = this;
    const list  = this._list;
    const baseUpdate = Window_Selectable.prototype.update.bind(list);
    list.update = function(){
      baseUpdate();
      if (scene._help && scene._help.setContract) scene._help.setContract(list.item());
    };
  };
  Scene_BountyBoard.prototype.start = function(){
    Scene_MenuBase.prototype.start.call(this);
    maybeRotateOnOpen();
    this._list.refresh(); this._list.select(0); this._list.activate();
    if (this._help) this._help.setContract(this._list.item());
    if (this._tabs) this._tabs.activate();
  };
  Scene_BountyBoard.prototype.onTabChange = function(){
    if (!this._tabs) return;
    const sym = this._tabs.currentSymbol();
    this._list.setFilter(sym);
  };
  Scene_BountyBoard.prototype.onOk = function(){
    const c = this._list.item(); if (!c){ this._list.activate(); return; }
    if (c.status==='available'){
      const g = gateCheck(c);
      if (!g.ok){ SoundManager.playBuzzer(); this._list.activate(); return; }
      if (acceptContract(c.id)){ SoundManager.playOk(); this._list.refresh(); if (this._help) this._help.setContract(this._list.item()); }
      this._list.activate();
    } else if (c.status==='accepted'){
      if (isComplete(c)){
        if (turnInContract(c.id)){ SoundManager.playOk(); this._list.refresh(); if (this._help) this._help.setContract(this._list.item()); }
      } else {
        SoundManager.playCursor();
        const yes = window.confirm ? window.confirm("Abandon this contract?") : true;
        if (yes){ abandonContract(c.id); this._list.refresh(); if (this._help) this._help.setContract(this._list.item()); }
      }
      this._list.activate();
    } else {
      SoundManager.playBuzzer(); this._list.activate();
    }
  };
  Scene_BountyBoard.prototype.showTurnInPopup = function(title, lines){
    const w = Math.min(520, Math.floor(Graphics.boxWidth*0.8));
    const rows = Math.max(3, 2 + (lines?lines.length:0));
    const h = this.calcWindowHeight(rows, false);
    const x = Math.floor((Graphics.boxWidth - w)/2);
    const y = Math.floor((Graphics.boxHeight - h)/2);
    this._popup = new Window_TurnInPopup(new Rectangle(x, y, w, h), `Rewards — ${title}`, lines);
    this._popup.setHandler('ok', this.closeTurnInPopup.bind(this));
    this._popup.setHandler('cancel', this.closeTurnInPopup.bind(this));
    this.addWindow(this._popup);
    this._list.deactivate();
    this._popup.refresh();
  };
  Scene_BountyBoard.prototype.closeTurnInPopup = function(){
    if (this._popup){
      this._popup.close();
      this.removeChild(this._popup);
      this._popup = null;
    }
    this._list.activate();
  };

  // Export (debug)
  if (typeof window !== 'undefined'){
    window.Scene_BountyBoard = Scene_BountyBoard;
    window.BB_accept = acceptContract;
    window.BB_turnIn = turnInContract;
    window.BB_abandon = abandonContract;
  }

  // ---------------------- Metadata helpers ---------------
  const _DM_extract = DataManager.extractMetadata;
  DataManager.extractMetadata = function(data){
    _DM_extract.call(this, data);
    if (!data || !data.note) return;
    const m1 = data.note.match(/<bounty\s+tag:\s*([^>]+)>/i);
    if (m1) data.meta['bounty tag'] = m1[1].trim();
    const m2 = data.note.match(/<contract\s+tag:\s*([^>]+)>/i);
    if (m2) data.meta['contract tag'] = m2[1].trim();
  };

})();
