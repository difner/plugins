/*:
 * @target MZ
 * @plugindesc v0.1.0 Tiny on-map HUD to watch reputation, tier, wanted level, and curfew in real time. Great for testing.
 * author Gemini
 *
 * @param StartVisible
 * @type boolean
 * @on Yes
 * @off No
 * @default false
 *
 * @command Show
 * @text Show HUD
 *
 * @command Hide
 * @text Hide HUD
 *
 * @command Toggle
 * @text Toggle HUD
 *
 * @command AddTarget
 * @text Add Target (Town/Faction)
 * @arg key
 * @type string
 * @default Millbrook
 *
 * @command ClearTargets
 * @text Clear Targets
 *
 * @help
 * Add targets you want to watch (e.g., Millbrook, GoblinClan).
 * Requires TownReputation.js (for $gameReputation) and (optional) BountyWarrants/Curfew.
 */
(() => {
  const PLUGIN = "Gemini_DebugHUD";
  const params = PluginManager.parameters(PLUGIN);
  const START_VISIBLE = params["StartVisible"] === "true";

  const State = {
    visible: START_VISIBLE,
    targets: ["Millbrook", "GoblinClan"]
  };

  PluginManager.registerCommand(PLUGIN, "Show", () => (State.visible = true));
  PluginManager.registerCommand(PLUGIN, "Hide", () => (State.visible = false));
  PluginManager.registerCommand(PLUGIN, "Toggle", () => (State.visible = !State.visible));
  PluginManager.registerCommand(PLUGIN, "AddTarget", args => {
    const k = String(args.key || "").trim();
    if (k && !State.targets.includes(k)) State.targets.push(k);
  });
  PluginManager.registerCommand(PLUGIN, "ClearTargets", () => (State.targets = []));

  function Window_RepDebug(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this.opacity = 192;
    this.refresh();
  }
  Window_RepDebug.prototype = Object.create(Window_Base.prototype);
  Window_RepDebug.prototype.constructor = Window_RepDebug;

  Window_RepDebug.prototype.refresh = function() {
    this.contents.clear();
    let y = 0;
    const lineH = this.lineHeight();

    const draw = (label, value) => {
      this.drawText(label + ": " + String(value), 0, y, this.contents.width);
      y += lineH;
    };

    draw("Debug HUD", "");
    draw("Visible", State.visible ? "Yes" : "No");

    if (State.targets.length) {
      draw("— Reputation —", "");
      for (const key of State.targets) {
        const val = window.$gameReputation?.value ? $gameReputation.value(key) : "?";
        const tier = window.$gameReputation?.tierName ? $gameReputation.tierName(key) : "?";
        draw(`${key}`, `${val} (${tier})`);
      }
    }

    if (window.$gameWarrants?.level) {
      draw("— Wanted —", "");
      for (const key of State.targets) {
        draw(`${key}`, $gameWarrants.level(key));
      }
    }

    if (window.$curfew?.isActive) {
      draw("— Curfew —", "");
      for (const key of State.targets) {
        draw(`${key}`, $curfew.isActive(key) ? "Active" : "Off");
      }
    }
  };

  const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
  Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows.call(this);
    const w = 360;
    const h = 240;
    const rect = new Rectangle(10, 10, w, h);
    this._repDebugWindow = new Window_RepDebug(rect);
    this.addWindow(this._repDebugWindow);
    this._repDebugWindow.visible = State.visible;
  };

  const _Scene_Map_update = Scene_Map.prototype.update;
  Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);
    if (this._repDebugWindow) {
      this._repDebugWindow.visible = State.visible;
      if (Graphics.frameCount % 15 === 0) {
        this._repDebugWindow.refresh();
      }
    }
  };
})();
