//=============================================================================
// Gemini_PatronageBoons.js  v1.0.0
//  - Faction "boon" shop: unlock perks when your rep hits a threshold.
//  - Each boon can run a Common Event and/or set a Switch when unlocked.
//  - Optional gold cost.
//=============================================================================
/*:
 * @target MZ
 * @plugindesc v1.0.0 Patronage & Boons (rep-gated perks) for TownReputation
 * @author Gemini + ChatGPT
 *
 * @help
 * Requires TownReputation v8.1.4+.
 *
 * Use Plugin Command "Open Patronage" to open a list of boons for a faction.
 * A boon is unlockable if your reputation with that entity >= requiredRep and you have enough gold.
 * On unlock: Common Event runs (optional) and Switch toggles ON (optional).
 *
 * @param factions
 * @text Faction Boon Lists
 * @type struct<FactionBoons>[]
 * @default []
 *
 * @command openPatronage
 * @text Open Patronage
 * @arg entityId
 * @type string
 */

/*~struct~FactionBoons:
 * @param entityId @type string
 * @param repType @type string @default default
 * @param boons @type struct<Boon>[] 
 */

/*~struct~Boon:
 * @param key @type string
 * @param name @type string
 * @param icon @type icon @default 0
 * @param description @type note
 * @param requiredRep @type number @default 0
 * @param goldCost @type number @default 0
 * @param unlockSwitchId @type switch @default 0
 * @param unlockCE @type common_event @default 0
 */

(() => {
  "use strict";
  const PN = "Gemini_PatronageBoons";
  const P = PluginManager.parameters(PN);
  const factionsRaw = JSON.parse(P.factions||"[]").map(s=>{try{return JSON.parse(s);}catch(_){return null;}}).filter(Boolean);

  // Build data
  const FACTIONS = {};
  factionsRaw.forEach(f=>{
    const id = (f.entityId||"").trim(); if (!id) return;
    const repType = (f.repType||"default").trim();
    const boons = JSON.parse(f.boons||"[]").map(s=>{try{return JSON.parse(s);}catch(_){return null;}}).filter(Boolean).map(b=>({
      key:(b.key||"").trim(),
      name:b.name||"",
      icon:Number(b.icon||0),
      desc:String(b.description||"").replace(/^"|"$/g,""),
      req:Number(b.requiredRep||0),
      cost:Number(b.goldCost||0),
      sw:Number(b.unlockSwitchId||0),
      ce:Number(b.unlockCE||0)
    })).filter(b=>b.key);
    FACTIONS[id] = { repType, boons };
  });

  // System storage
  const _GS_init = Game_System.prototype.initialize;
  Game_System.prototype.initialize = function(){
    _GS_init.call(this);
    this._patronageUnlocked = this._patronageUnlocked || {}; // entity -> {key:true}
  };
  function isUnlocked(entity,key){
    return !!($gameSystem._patronageUnlocked[entity] && $gameSystem._patronageUnlocked[entity][key]);
  }
  function setUnlocked(entity,key){
    $gameSystem._patronageUnlocked[entity] = $gameSystem._patronageUnlocked[entity] || {};
    $gameSystem._patronageUnlocked[entity][key] = true;
  }

  function getRepSafe(entity, type){
    try { return (typeof getRep === 'function') ? getRep(entity, type||'default') : 0; } catch(_) { return 0; }
  }

  // Command
  PluginManager.registerCommand(PN, "openPatronage", args=>{
    const entity = (args.entityId||"").trim();
    if (!FACTIONS[entity]) { console.warn(`[Patronage] No boon list for ${entity}`); return; }
    SceneManager._scene && SceneManager._scene.startPatronage(entity);
  });

  // Scene & Window
  Scene_Map.prototype.startPatronage = function(entity){
    const data = FACTIONS[entity]; if (!data) return;
    this._patronageEntity = entity;
    const w = Math.floor(Graphics.boxWidth*0.8);
    const h = Math.floor(Graphics.boxHeight*0.7);
    const x = Math.floor((Graphics.boxWidth - w)/2);
    const y = Math.floor((Graphics.boxHeight - h)/2);
    const rect = new Rectangle(x,y,w,h);

    this._boonWin = new Window_Boons(rect, entity, data.repType, data.boons);
    this._boonWin.setHandler("ok", this.onBoonOk.bind(this));
    this._boonWin.setHandler("cancel", this.onBoonCancel.bind(this));
    this.addWindow(this._boonWin);
    this._boonWin.activate(); this._boonWin.select(0);
  };

  Scene_Map.prototype.onBoonOk = function(){
    const w = this._boonWin;
    const boon = w.current();
    if (!boon) return;
    const entity = this._patronageEntity;
    const rep = getRepSafe(entity, w._repType);
    if (isUnlocked(entity, boon.key)) { this.onBoonCancel(); return; }
    if (rep < boon.req) { SoundManager.playBuzzer(); return; }
    if ($gameParty.gold() < boon.cost) { SoundManager.playBuzzer(); return; }
    // Pay, set, run CE
    if (boon.cost>0) $gameParty.loseGold(boon.cost);
    if (boon.sw>0) $gameSwitches.setValue(boon.sw, true);
    if (boon.ce>0) $gameTemp.reserveCommonEvent(boon.ce);
    setUnlocked(entity, boon.key);
    if (this.addRepToast) this.addRepToast(`Boon unlocked: ${boon.name}`);
    this.onBoonCancel();
  };

  Scene_Map.prototype.onBoonCancel = function(){
    if (this._boonWin) { this._boonWin.close(); this.removeChild(this._boonWin); this._boonWin = null; }
    this._patronageEntity = null;
  };

  function Window_Boons(){ this.initialize(...arguments); }
  Window_Boons.prototype = Object.create(Window_Selectable.prototype);
  Window_Boons.prototype.constructor = Window_Boons;
  Window_Boons.prototype.initialize = function(rect, entityId, repType, boons){
    Window_Selectable.prototype.initialize.call(this, rect);
    this._entity = entityId;
    this._repType = repType||'default';
    this._data = boons||[];
    this.openness=0; this.open();
    this.refresh();
  };
  Window_Boons.prototype.maxItems = function(){ return this._data.length; };
  Window_Boons.prototype.itemHeight = function(){ return this.lineHeight()*3; };
  Window_Boons.prototype.current = function(){ return this._data[this.index()]||null; };
  Window_Boons.prototype.topPadding = function(){ return this.lineHeight(); };
  Window_Boons.prototype.drawAllItems = function(){
    const title = `Patronage — ${this._entity}`;
    this.changeTextColor(ColorManager.systemColor());
    this.drawText(title, 0, 0, this.innerWidth, 'center');
    this.resetTextColor();
    for (let i=0;i<this.maxItems();i++) this.drawItem(i);
  };
  Window_Boons.prototype.drawItem = function(i){
    const b = this._data[i]; if (!b) return;
    const r = this.itemRect(i); let y = r.y;
    const rep = getRepSafe(this._entity, this._repType);
    const ok = rep >= b.req && $gameParty.gold() >= b.cost && !isUnlocked(this._entity, b.key);
    if (b.icon>0) this.drawIcon(b.icon, r.x, y);
    const nameX = b.icon>0 ? r.x+36 : r.x;
    this.drawText(`${b.name} ${isUnlocked(this._entity,b.key)?"[OWNED]": ok?"[UNLOCK]":"[LOCKED]"}`, nameX, y, r.width); y += this.lineHeight();
    const reqTxt = `Req: ${this._entity} >= ${b.req}${this._repType!=='default'?` [${this._repType}]`:''}   Cost: ${b.cost}G`;
    this.changeTextColor(ColorManager.systemColor());
    this.drawText(reqTxt, r.x, y, r.width); y += this.lineHeight();
    this.resetTextColor();
    this.drawTextEx(String(b.desc||""), r.x, y, r.width);
  };
})();
