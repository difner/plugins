/*:
 * @target MZ
 * @plugindesc v0.1.0 Load external JSON datapacks for Reputation Suite (towns, factions, tiers, etc.) and allow reload at runtime.
 * @author Gemini
 *
 * @param ReputationFile
 * @text Reputation JSON
 * @type file
 * @dir data/
 * @default data/rep/reputation.json
 *
 * @param AutoloadOnBoot
 * @text Autoload on Boot
 * @type boolean
 * @on Yes
 * @off No
 * @default true
 *
 * @command ReloadDataPacks
 * @text Reload Data Packs
 * @desc Reload external JSON files (e.g., reputation.json) without restarting the game.
 *
 * @command DumpToConsole
 * @text Dump to Console
 * @desc Log parsed datapacks to the developer console for inspection.
 *
 * @help
 * Place your JSON here (create folders if needed):
 *   data/rep/reputation.json
 *
 * Minimal reputation.json example:
 * {
 *   "tiers": [
 *     { "name": "Hated",     "min": -100, "max": -60 },
 *     { "name": "Unfriendly","min": -59,  "max": -21 },
 *     { "name": "Neutral",   "min": -20,  "max": 19 },
 *     { "name": "Friendly",  "min": 20,   "max": 59 },
 *     { "name": "Allied",    "min": 60,   "max": 100 }
 *   ],
 *   "towns":    ["Millbrook","Rivershire"],
 *   "factions": ["GoblinClan","RangerGuild"]
 * }
 *
 * This plugin doesn’t change gameplay by itself. Other plugins (TownReputation,
 * Guilds, BountyBoard, etc.) can read TR.Data.reputation to seed defaults or UI.
 */
(() => {
  const PLUGIN_NAME = "TR_DataPackLoader";
  const params = PluginManager.parameters(PLUGIN_NAME);
  const REPUTATION_FILE = String(params["ReputationFile"] || "data/rep/reputation.json");
  const AUTOLOAD = params["AutoloadOnBoot"] === "true";

  window.TR = window.TR || {};
  TR.Data = TR.Data || {};
  TR.Data._loaded = false;
  TR.Data.reputation = TR.Data.reputation || null;

  function fsReadJsonSync(path) {
    try {
      const fs = require("fs");
      if (fs.existsSync(path)) {
        const text = fs.readFileSync(path, "utf8");
        return JSON.parse(text);
      }
    } catch (e) {
      console.warn(`${PLUGIN_NAME}: fsReadJsonSync failed for ${path}`, e);
    }
    return null;
  }

  async function fetchJson(path) {
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.json();
    } catch (e) {
      console.warn(`${PLUGIN_NAME}: fetchJson failed for ${path}`, e);
      return null;
    }
  }

  async function loadReputation() {
    let data = null;
    if (Utils.isNwjs()) {
      data = fsReadJsonSync(REPUTATION_FILE);
    }
    if (!data) data = await fetchJson(REPUTATION_FILE);
    if (data) {
      TR.Data.reputation = data;
      TR.Data._loaded = true;
      console.info(`${PLUGIN_NAME}: loaded ${REPUTATION_FILE}`, data);
    } else {
      // Safe default so other plugins don’t crash
      TR.Data.reputation = {
        tiers: [
          { name: "Hated", min: -100, max: -60 },
          { name: "Unfriendly", min: -59, max: -21 },
          { name: "Neutral", min: -20, max: 19 },
          { name: "Friendly", min: 20, max: 59 },
          { name: "Allied", min: 60, max: 100 }
        ],
        towns: [],
        factions: []
      };
      TR.Data._loaded = true;
      console.warn(`${PLUGIN_NAME}: using fallback reputation data`);
    }
  }

  // Delay boot until our async load completes (if autoload is on)
  if (AUTOLOAD) {
    const _Scene_Boot_isReady = Scene_Boot.prototype.isReady;
    Scene_Boot.prototype.isReady = function() {
      const ready = _Scene_Boot_isReady.call(this);
      if (!TR.Data._loaded) return false;
      return ready;
    };
    // Kick off load early
    loadReputation();
  }

  PluginManager.registerCommand(PLUGIN_NAME, "ReloadDataPacks", async () => {
    TR.Data._loaded = false;
    await loadReputation();
    // Optional: Tell other modules something changed
    if (window.Triggers && Triggers.emit) Triggers.emit("TR:DataReloaded");
  });

  PluginManager.registerCommand(PLUGIN_NAME, "DumpToConsole", () => {
    console.log("TR.Data.reputation", TR.Data.reputation);
  });
})();
