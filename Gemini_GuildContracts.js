//=============================================================================
// Gemini_GuildContracts.js  v1.0.0
//  - Simple contracts board: show list, accept, instant-complete or track active.
//  - Rewards can include Rep (via TownReputation), Gold, and one Item.
//  - 'Complete Contract' command to pay out non-instant jobs later.
//=============================================================================
/*:
 * @target MZ
 * @plugindesc v1.0.0 Contracts Board (quests with Rep rewards) for TownReputation
 * @author Gemini + ChatGPT
 *
 * @help
 * Requires TownReputation v8.1.4+.
 *
 * Workflow
 *  - Define one or more Boards and Contracts in parameters.
 *  - Use Plugin Command: Show Board (boardId) to open a list in-map.
 *  - Selecting a contract:
 *      - If "Instant Complete" = ON → pays out immediately and closes.
 *      - Else → marks active. Later, call Plugin Command: Complete Contract (boardId, key).
 *
 * Notes
 *  - Rep uses TownReputation's addRepEx if present.
 *  - Item reward: supports Item/Weapon/Armor (single type per contract).
 *  - Optional Common Events on Accept / on Complete.
 *  - Simple, safe UI. No player movement during board.
 *
 * @param boards
 * @text Boards
 * @type struct<Board>[]
 * @default []
 *
 * @command showBoard
 * @text Show Contracts Board
 * @arg boardId
 * @type string
 *
 * @command completeContract
 * @text Complete Contract
 * @arg boardId
 * @type string
 * @arg key
 * @type string
 */

/*~struct~Board:
 * @param boardId @type string
 * @param title @type string @default Guild Board
 * @param sourceFaction @type string @default
 * @param contracts @type struct<Contract>[]
 */

/*~struct~Contract:
 * @param key @type string
 * @param title @type string
 * @param description @type note
 * @param instantComplete @type boolean @default true
 *
 * @param repEntity @type string @default
 * @param repDelta @type number @default 0
 * @param repType @type string @default default
 *
 * @param gold @type number @default 0
 *
 * @param rewardType @type select @option None @value none @option Item @value item @option Weapon @value weapon @option Armor @value armor @default none
 * @param rewardId @type number @default 0
 * @param rewardAmount @type number @default 1
 *
 * @param acceptCE @type common_event @default 0
 * @param completeCE @type common_event @default 0
 */

(() => {
  "use strict";
  const PN = "Gemini_GuildContracts";
  const P = PluginManager.parameters(PN);

  const boardsRaw = JSON.parse(P.boards||"[]").map(s=>{try{return JSON.parse(s);}catch(_){return null;}}).filter(Boolean);
  const BOARDS = {};
  boardsRaw.forEach(b=>{
    const id = (b.boardId||"").trim();
    if(!id) return;
    BOARDS[id] = {
      title: b.title||"Guild Board",
      sourceFaction: (b.sourceFaction||"").trim(),
      contracts: (JSON.parse(b.contracts||"[]").map(c=>{try{return JSON.parse(c);}catch(_){return null;}}).filter(Boolean)).map(c=>({
        key:(c.key||"").trim(),
        title:c.title||"",
        description:String(c.description||"").replace(/^"|"$/g,""),
        instant: String(c.instantComplete||"true")==="true",
        repEntity:(c.repEntity||"").trim(),
        repDelta:Number(c.repDelta||0),
        repType:(c.repType||"default").trim(),
        gold:Number(c.gold||0),
        rType:(c.rewardType||"none"),
        rId:Number(c.rewardId||0),
        rAmt:Math.max(0, Number(c.rewardAmount||1)),
        acceptCE:Number(c.acceptCE||0),
        completeCE:Number(c.completeCE||0)
      })).filter(c=>c.key)
    };
  });

  // System storage
  const _GS_init = Game_System.prototype.initialize;
  Game_System.prototype.initialize = function(){
    _GS_init.call(this);
    this._contractsActive = this._contractsActive || {}; // boardId -> { key:true }
  };

  function markActive(boardId, key){
    $gameSystem._contractsActive[boardId] = $gameSystem._contractsActive[boardId] || {};
    $gameSystem._contractsActive[boardId][key] = true;
  }
  function isActive(boardId, key){
    return !!($gameSystem._contractsActive[boardId] && $gameSystem._contractsActive[boardId][key]);
  }
  function clearActive(boardId, key){
    if ($gameSystem._contractsActive[boardId]) delete $gameSystem._contractsActive[boardId][key];
  }

  function applyRep(entity, delta, type){
    if (!entity || !delta) return;
    if (typeof addRepEx === "function") addRepEx(entity, delta, type||"default", {origin:"contracts"});
  }
  function gainReward(c){
    if (c.gold) $gameParty.gainGold(c.gold);
    if (c.rType === "item" && c.rId>0 && c.rAmt>0) $gameParty.gainItem($dataItems[c.rId], c.rAmt);
    if (c.rType === "weapon" && c.rId>0 && c.rAmt>0) $gameParty.gainItem($dataWeapons[c.rId], c.rAmt);
    if (c.rType === "armor" && c.rId>0 && c.rAmt>0) $gameParty.gainItem($dataArmors[c.rId], c.rAmt);
  }
  function runCE(id){
    if (id>0) $gameTemp.reserveCommonEvent(id);
  }

  // Commands
  PluginManager.registerCommand(PN, "showBoard", args=>{
    const boardId = (args.boardId||"").trim();
    if (!BOARDS[boardId]) { console.warn(`[Contracts] Board "${boardId}" not found.`); return; }
    SceneManager._scene && SceneManager._scene.startContractsBoard(boardId);
  });

  PluginManager.registerCommand(PN, "completeContract", args=>{
    const boardId = (args.boardId||"").trim();
    const key = (args.key||"").trim();
    const b = BOARDS[boardId]; if (!b) return;
    const c = b.contracts.find(x=>x.key===key); if (!c) return;
    if (!isActive(boardId, key)) return; // not accepted
    // pay out & finish
    applyRep(c.repEntity, c.repDelta, c.repType);
    gainReward(c);
    runCE(c.completeCE);
    clearActive(boardId, key);
  });

  // Scene & Windows
  Scene_Map.prototype.startContractsBoard = function(boardId){
    const b = BOARDS[boardId];
    if (!b) return;
    this._contractsBoardId = boardId;
    this._contractsList = b.contracts.slice();
    const w = Math.floor(Graphics.boxWidth*0.8);
    const h = Math.floor(Graphics.boxHeight*0.7);
    const x = Math.floor((Graphics.boxWidth - w)/2);
    const y = Math.floor((Graphics.boxHeight - h)/2);

    const rect = new Rectangle(x,y,w,h);
    this._contractsWindow = new Window_Contracts(rect, b.title, b.sourceFaction, this._contractsList, boardId);
    this._contractsWindow.setHandler("ok", this.onContractOk.bind(this));
    this._contractsWindow.setHandler("cancel", this.onContractCancel.bind(this));
    this.addWindow(this._contractsWindow);
    this._contractsWindow.activate(); this._contractsWindow.select(0);
  };

  Scene_Map.prototype.onContractOk = function(){
    const w = this._contractsWindow;
    const c = w.currentContract();
    if (!c) return;
    // Accept CE
    runCE(c.acceptCE);
    if (c.instant) {
      applyRep(c.repEntity, c.repDelta, c.repType);
      gainReward(c);
      runCE(c.completeCE);
      this.removeContractUI();
    } else {
      markActive(this._contractsBoardId, c.key);
      if (SceneManager._scene.addRepToast) SceneManager._scene.addRepToast(`Accepted: ${c.title}`);
      this.removeContractUI();
    }
  };

  Scene_Map.prototype.onContractCancel = function(){
    this.removeContractUI();
  };

  Scene_Map.prototype.removeContractUI = function(){
    if (this._contractsWindow) { this._contractsWindow.close(); this.removeChild(this._contractsWindow); this._contractsWindow=null; }
    this._contractsBoardId = null; this._contractsList=null;
  };

  function Window_Contracts(){ this.initialize(...arguments); }
  Window_Contracts.prototype = Object.create(Window_Selectable.prototype);
  Window_Contracts.prototype.constructor = Window_Contracts;
  Window_Contracts.prototype.initialize = function(rect, title, faction, list, boardId){
    Window_Selectable.prototype.initialize.call(this, rect);
    this._title = title||"Guild Board";
    this._faction = faction||"";
    this._list = list||[];
    this._boardId = boardId;
    this.openness = 0; this.open();
    this.refresh();
  };
  Window_Contracts.prototype.maxItems = function(){ return this._list.length; };
  Window_Contracts.prototype.itemHeight = function(){ return this.lineHeight()*3; };
  Window_Contracts.prototype.currentContract = function(){ return this._list[this.index()]||null; };
  Window_Contracts.prototype.refresh = function(){
    this.contents.clear();
    Window_Selectable.prototype.refresh.call(this);
  };
  Window_Contracts.prototype.drawAllItems = function(){
    this.resetTextColor();
    const t = `${this._title}${this._faction?`  [${this._faction}]`:''}`;
    this.drawText(t, 0, 0, this.innerWidth, 'center');
    for (let i=0;i<this.maxItems();i++) this.drawItem(i);
  };
  Window_Contracts.prototype.topPadding = function(){ return this.lineHeight(); };
  Window_Contracts.prototype.drawItem = function(index){
    const c = this._list[index]; if (!c) return;
    const r = this.itemRect(index);
    let y = r.y + this.lineHeight()*0.2;
    const active = isActive(this._boardId, c.key);
    const tag = active ? "[ACCEPTED]" : (c.instant ? "[INSTANT]" : "[JOB]");
    this.changeTextColor(ColorManager.systemColor());
    this.drawText(`${tag} ${c.title}`, r.x, y, r.width); y += this.lineHeight();
    this.resetTextColor();
    const d = c.description || "";
    this.drawTextEx(d, r.x, y, r.width); y += this.lineHeight();
    const payoff = [];
    if (c.repEntity && c.repDelta) payoff.push(`${c.repEntity} ${c.repDelta>0?'+':''}${c.repDelta}${c.repType!=='default'?` [${c.repType}]`:''}`);
    if (c.gold) payoff.push(`${c.gold}G`);
    if (c.rType!=='none' && c.rId>0 && c.rAmt>0) payoff.push(`${c.rType}#${c.rId} x${c.rAmt}`);
    this.changeTextColor(ColorManager.systemColor());
    this.drawText(payoff.join('   '), r.x, y, r.width);
    this.resetTextColor();
  };
})();
