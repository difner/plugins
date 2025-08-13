//=============================================================================
// Gemini_GossipSpread.js  v1.0.0
//  - Gradually propagates reputation deltas from one entity to linked entities.
//  - Wraps TownReputation.addRepEx safely; won't loop (marks origin: 'gossip').
//  - Applies in small whole-number ticks on a timer (no spam).
//=============================================================================
/*:
 * @target MZ
 * @plugindesc v1.0.0 Gossip/Rumor spread for TownReputation (gradual rep propagation)
 * @author Gemini + ChatGPT
 *
 * @help
 * Requires TownReputation v8.1.4+.
 *
 * How it works
 *  - When any rep change happens (addRepEx), we enqueue "rumors" to linked targets.
 *  - Every tick, we apply whole-number parts of the queued values to targets.
 *  - We mark origin:'gossip' so gossip does NOT re-propagate (no loops).
 *
 * Parameters:
 *  - Enable: master ON/OFF
 *  - Tick Interval (sec): how often we apply queued changes
 *  - Links: connections between entities with multipliers (0..1, or >1 if you want amplification)
 *  - Min Abs Delta to Enqueue: ignore tiny source deltas (e.g., 1)
 *
 * @param enable
 * @text Enable
 * @type boolean
 * @default true
 *
 * @param tickIntervalSec
 * @text Tick Interval (seconds)
 * @type number
 * @min 0.1
 * @decimals 2
 * @default 2
 *
 * @param minAbsDelta
 * @text Min Abs Delta to Enqueue
 * @type number
 * @min 1
 * @default 1
 *
 * @param links
 * @text Gossip Links
 * @type struct<GossipLink>[]
 * @default []
 */
/*~struct~GossipLink:
 * @param from
 * @text From Entity
 * @type string
 *
 * @param to
 * @text To Entity
 * @type string
 *
 * @param multiplier
 * @text Multiplier
 * @type number
 * @decimals 2
 * @default 0.5
 *
 * @param repType
 * @text Rep Type (optional)
 * @type string
 * @default
 */
(() => {
  "use strict";
  const PN = "Gemini_GossipSpread";
  const P = PluginManager.parameters(PN);
  const ENABLE = String(P.enable||"true")==="true";
  const TICK_SEC = Math.max(0.05, Number(P.tickIntervalSec||2));
  const MIN_ABS = Math.max(0, Number(P.minAbsDelta||1));
  const LINKS = JSON.parse(P.links||"[]").map(s => { try { return JSON.parse(s);}catch(_){return null;} }).filter(Boolean);

  if (!ENABLE) return;

  // Ensure TR exists
  if (typeof addRepEx !== "function") {
    console.warn("[GossipSpread] TownReputation.addRepEx not found — plugin will be idle.");
    return;
  }

  // Compile link map: from -> [{to, mult, type?}, ...]
  const linkMap = {};
  LINKS.forEach(l => {
    const k = (l.from||"").trim();
    if (!k || !l.to) return;
    linkMap[k] = linkMap[k] || [];
    linkMap[k].push({ to: (l.to||"").trim(), mult: Number(l.multiplier||0.5), type: (l.repType||"").trim() });
  });

  // Queue floats, flush integers on ticks
  const sysQueueKey = "_gossipQueue";
  const tickFrames = Math.max(1, Math.floor((Number(TICK_SEC)||2) * 60));

  const _GS_init = Game_System.prototype.initialize;
  Game_System.prototype.initialize = function(){
    _GS_init.call(this);
    this[sysQueueKey] = {};   // key "entity||type" -> float accumulator
    this._gossipTickAcc = 0;
  };

  function qKey(entity, type){ return `${entity}||${type||"default"}`; }
  function qAdd(entity, type, amount){
    const k = qKey(entity, type||"default");
    $gameSystem[sysQueueKey][k] = ($gameSystem[sysQueueKey][k]||0) + amount;
  }

  // Wrap addRepEx once
  if (!window._GS_saved_addRepEx) {
    window._GS_saved_addRepEx = addRepEx;
    window.addRepEx = function(entityId, delta, type="default", opts={}){
      // Call original
      window._GS_saved_addRepEx(entityId, delta, type, opts);
      // Skip if originated from gossip or delta too small
      if (opts && opts.origin === "gossip") return;
      if (!delta || Math.abs(delta) < MIN_ABS) return;
      // Enqueue to linked targets
      (linkMap[entityId]||[]).forEach(link => {
        const destType = (link.type||type||"default");
        const add = delta * Number(link.mult||0);
        if (!add) return;
        qAdd(link.to, destType, add);
      });
    };
  }

  // Ticker
  const _SM_update = Scene_Map.prototype.update;
  Scene_Map.prototype.update = function(){
    _SM_update.call(this);
    const sys = $gameSystem;
    if (!sys) return;
    sys._gossipTickAcc = (sys._gossipTickAcc||0) + 1;
    if (sys._gossipTickAcc >= tickFrames) {
      sys._gossipTickAcc = 0;
      const q = sys[sysQueueKey]||{};
      for (const k of Object.keys(q)) {
        const val = q[k];
        const whole = (val>0) ? Math.floor(val) : Math.ceil(val);
        if (whole !== 0) {
          const [entity, type] = k.split("||");
          window._GS_saved_addRepEx(entity, whole, type||"default", {origin:"gossip"});
          q[k] = val - whole;
        }
      }
    }
  };
})();
