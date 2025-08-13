//=============================================================================
// Gemini_LootChoiceMenu.js — v1.8.1
//  - Shows more items without scrolling (configurable rows/width/row-scale)
//  - Rep preview lines (optional) + <rep loot: ...> one-shot integration
//=============================================================================
/*:
 * @target MZ
 * @plugindesc v1.8.1 Loot menu with adjustable rows/width; optional rep preview; applies <rep loot: ...> once on selection (TownReputation)
 * @author Gemini
 *
 * @command showLootChoice
 * @text Show Loot Choice Menu
 * @arg promptText @type string @default Choose your reward:
 * @arg lootList   @type struct<LootItem>[] @default []
 *
 * @param showRepPreview
 * @text Show Rep Preview Lines
 * @type boolean
 * @default true
 *
 * @param lootMaxRows
 * @text Max Visible Rows
 * @type number
 * @min 1
 * @max 20
 * @default 8
 *
 * @param lootPreviewRowScale
 * @text Row Height Scale (when preview on)
 * @type number
 * @decimals 2
 * @min 1.00
 * @max 2.00
 * @default 1.50
 *
 * @param lootListWidthPercent
 * @text List Width (% of screen)
 * @type number
 * @min 30
 * @max 100
 * @default 60
 */
/*~struct~LootItem:
 * @param itemType @type select @option Item @value item @option Weapon @value weapon @option Armor @value armor @default item
 * @param itemId   @type item   @default 0
 * @param weaponId @type weapon @default 0
 * @param armorId  @type armor  @default 0
 */

(() => {
  const pluginName = "Gemini_LootChoiceMenu";
  const PM = PluginManager.parameters(pluginName);

  const showRepPreview       = PM.showRepPreview === 'true';
  const lootMaxRows          = Math.max(1, Number(PM.lootMaxRows || 8));
  const lootPreviewRowScale  = Math.max(1, Math.min(2, Number(PM.lootPreviewRowScale || 1.5)));
  const lootListWidthPercent = Math.max(30, Math.min(100, Number(PM.lootListWidthPercent || 60)));

  // ── UI compat shim (avoid textPadding errors)
  if (typeof Window_Base.prototype.textPadding !== 'function') {
    Window_Base.prototype.textPadding = function() {
      if (typeof this.itemPadding === 'function') return this.itemPadding();
      return 6;
    };
  }

  // ── Lazy TownReputation lookup (order-agnostic)
  function TR_lookupVarId(entityId, repType="default"){
    try{
      const p = PluginManager.parameters("TownReputation");
      if(!p) return 0;
      const parseList = s=>JSON.parse(s||"[]").map(x=>{try{return JSON.parse(x)}catch(_){return null}}).filter(Boolean);
      const all = parseList(p.locationMappings).concat(parseList(p.factionMappings));
      let m = all.find(m => m.id===entityId && m.repType===repType);
      if(!m) m = all.find(m => m.id===entityId);
      return m ? Number(m.variableId||0) : 0;
    }catch(_){return 0;}
  }
  function TR_addRep(entityId, delta, repType="default"){
    const vId = TR_lookupVarId(entityId, repType);
    if(!vId) return;
    const prev = $gameVariables.value(vId)||0;
    const d = Math.floor(Number(delta)||0);
    if(!d) return;
    $gameVariables.setValue(vId, prev + d);
    try{
      const p = PluginManager.parameters("TownReputation")||{};
      const max = Number(p.historyLogMax||50);
      const sys = $gameSystem;
      if(sys){
        sys._repHistory = sys._repHistory||[];
        sys._repHistory.unshift({ time:new Date().toLocaleTimeString(), entityId:String(entityId), repType:String(repType||'default'), delta:d });
        while(sys._repHistory.length>max) sys._repHistory.pop();
      }
    }catch(_){}
  }
  function parseRep(obj, key){
    if(!obj||!obj.note) return [];
    const rx = new RegExp(`<rep\\s+${key}:\\s*([^>]+?)\\s+([+\\-]?\\d+)(?:\\s+type:(\\w+))?\\s*>`,'gi');
    let m, out=[]; while((m=rx.exec(obj.note))!==null) out.push({entity:(m[1]||'').trim(), delta:Number(m[2]||0), type:(m[3]||'default').trim()});
    return out;
  }

  // ── System lock
  const _GS_init = Game_System.prototype.initialize;
  Game_System.prototype.initialize = function(){ _GS_init.call(this); this._lootChoiceActive=false; };

  const _GP_canMove = Game_Player.prototype.canMove;
  Game_Player.prototype.canMove = function(){ if($gameSystem._lootChoiceActive) return false; return _GP_canMove.call(this); };

  // ── Command
  PluginManager.registerCommand(pluginName, "showLootChoice", function(args){
    const lootListStruct = JSON.parse(args.lootList || "[]");
    const lootItems = lootListStruct.map(s=>{
      const it = JSON.parse(s); let obj=null;
      if(it.itemType==='item')   obj=$dataItems[Number(it.itemId)];
      if(it.itemType==='weapon') obj=$dataWeapons[Number(it.weaponId)];
      if(it.itemType==='armor')  obj=$dataArmors[Number(it.armorId)];
      return obj;
    }).filter(o=>o&&o.id>0);
    if(lootItems.length>0){
      $gameSystem._lootChoiceActive = true;
      SceneManager._scene.startLootChoice(args.promptText, lootItems);
      this.setWaitMode('lootChoice');
    }
  });

  const _GI_updateWaitMode = Game_Interpreter.prototype.updateWaitMode;
  Game_Interpreter.prototype.updateWaitMode = function(){
    if(this._waitMode==='lootChoice'){
      const sc = SceneManager._scene;
      if(sc._lootListWindow && sc._lootListWindow.openness>0) return true;
      this._waitMode=""; return false;
    }
    return _GI_updateWaitMode.call(this);
  };

  // ── Scene
  Scene_Map.prototype.startLootChoice = function(promptText, lootItems){
    // width & prompt
    const listWidth = Math.floor(Graphics.boxWidth * (lootListWidthPercent/100));
    const promptHeight = this.calcWindowHeight(2, false);

    // Create windows first (temporary size); we'll resize after we know itemHeight
    const startX = (Graphics.boxWidth - listWidth)/2;
    const startY = Math.floor(Graphics.boxHeight * 0.15); // a bit higher to fit more rows

    const promptRect = new Rectangle(startX, startY, listWidth, promptHeight);
    this._lootPromptWindow = new Window_LootPrompt(promptRect);

    const tempListRect = new Rectangle(startX, startY + promptHeight, listWidth, 200);
    this._lootListWindow = new Window_LootList(tempListRect);

    this._lootListWindow.setHandler('ok',     this.onLootChoiceOk.bind(this));
    this._lootListWindow.setHandler('cancel', this.onLootChoiceCancel.bind(this));

    this.addWindow(this._lootPromptWindow);
    this.addWindow(this._lootListWindow);

    this._lootPromptWindow.showText(promptText);
    this._lootListWindow.setItems(lootItems);

    // Now size the list to show more rows without scrolling
    const ih = this._lootListWindow.itemHeight();                         // actual row height (accounts for preview scale)
    const margin = 24;                                                    // breathing room
    const maxByScreen = Math.max(1, Math.floor((Graphics.boxHeight - startY - promptHeight - margin) / ih));
    const rows = Math.min(lootItems.length, Math.min(lootMaxRows, maxByScreen));
    const listHeight = this.calcWindowHeight(rows, true);

    // Resize & reposition
    this._lootListWindow.move(startX, startY + promptHeight, listWidth, listHeight);
    this._lootListWindow.refresh();
    this._lootListWindow.select(0);
    this._lootListWindow.activate();
    this._lootListWindow.open();
  };

  Scene_Map.prototype.onLootChoiceOk = function(){
    const item = this._lootListWindow.item();
    if(item){
      // one-shot loot rep
      parseRep(item, 'loot').forEach(t => TR_addRep(t.entity, t.delta, t.type));
      // grant item
      $gameParty.gainItem(item, 1);
    }
    this.terminateLootChoice();
  };
  Scene_Map.prototype.onLootChoiceCancel = function(){ this.terminateLootChoice(); };
  Scene_Map.prototype.terminateLootChoice = function(){
    $gameSystem._lootChoiceActive=false;
    if(this._lootPromptWindow) this._lootPromptWindow.close();
    if(this._lootListWindow)   this._lootListWindow.close();
  };

  // ── Windows
  function Window_LootPrompt(){ this.initialize(...arguments); }
  Window_LootPrompt.prototype = Object.create(Window_Base.prototype);
  Window_LootPrompt.prototype.constructor = Window_LootPrompt;
  Window_LootPrompt.prototype.initialize = function(rect){ Window_Base.prototype.initialize.call(this, rect); this.openness=0; };
  Window_LootPrompt.prototype.showText = function(text){ this.contents.clear(); this.drawTextEx(String(text||''), this.textPadding(), 0, this.contents.width - this.textPadding()*2); this.open(); };

  function Window_LootList(){ this.initialize(...arguments); }
  Window_LootList.prototype = Object.create(Window_Selectable.prototype);
  Window_LootList.prototype.constructor = Window_LootList;
  Window_LootList.prototype.initialize = function(rect){ Window_Selectable.prototype.initialize.call(this, rect); this._items=[]; this.openness=0; };
  Window_LootList.prototype.setItems = function(items){ this._items=items||[]; this.refresh(); this.select(0); /* activate later after resize */ this.open(); };
  Window_LootList.prototype.maxItems = function(){ return this._items?this._items.length:0; };
  Window_LootList.prototype.item = function(){ return this.index()>=0 ? this._items[this.index()] : null; };
  Window_LootList.prototype.itemHeight = function(){
    const base = this.lineHeight();
    return showRepPreview ? Math.floor(base * lootPreviewRowScale) : base;
  };
  Window_LootList.prototype.drawItem = function(index){
    const item = this._items[index]; if(!item) return;
    const rect = this.itemLineRect(index);
    this.drawItemName(item, rect.x, rect.y, rect.width);

    if(showRepPreview){
      const bits=[];
      const loot = parseRep(item,'loot')[0];
      const have = parseRep(item,'have')[0];
      if(loot) bits.push(`Loot: ${loot.entity} ${loot.delta>0?'+':''}${loot.delta}${loot.type!=='default'?` [${loot.type}]`:''}`);
      if(have) bits.push(`Have: ${have.entity} ${have.delta>0?'+':''}${have.delta}${have.type!=='default'?` [${have.type}]`:''}`);

      if(bits.length){
        const pad = this.textPadding ? this.textPadding() : 6;
        const y = rect.y + this.lineHeight() - 2;
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(bits.join('   '), rect.x + pad, y, rect.width - pad*2);
        this.resetTextColor();
      }
    }
  };
})();
