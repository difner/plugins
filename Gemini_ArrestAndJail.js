/*:
 * @target MZ
 * @plugindesc v0.9.0 Arrest, Jail, Bail & Wanted integration with optional TownReputation hooks. (Gemini_ArrestAndJail)
 * @author Gemini
 *
 * @help
 * === Gemini_ArrestAndJail v0.9.0 ===
 * Drop-in system to handle guard arrests, fines, jail teleport, bail, bribes,
 * and work-task credits. Designed to integrate with your Wanted variable and
 * (optionally) TownReputation plugin.
 *
 * -------------------------
 * QUICK START (Guard Event)
 * -------------------------
 * 1) Set a Wanted value somewhere (ex: Add +25 when player steals).
 * 2) On your Guard's event page when catching player, run plugin command:
 *      ArrestPlayer
 *    This shows the arrest dialog automatically, offering:
 *      - Pay Fine (if Wanted <= FineThreshold)
 *      - Go To Jail
 *      - Bribe Guard
 *      - Fight / Escape (you decide via your event after command returns)
 *
 * 3) Make a Jail map. Either set its Map Note to <jail> OR set parameters below.
 * 4) Place a "Bail Clerk" event that runs plugin command "PayBail".
 * 5) (Optional) Add a "Work Task" NPC that runs "AddJailCredit 50" etc.
 * 6) When bail/credit >= bail due, call "ReleaseFromJail" (or let PayBail do it).
 *
 * -------------------------
 * OPTIONAL REPUTATION HOOK
 * -------------------------
 * If your TownReputation plugin exposes:
 *   window.Gemini && Gemini.TownReputation && Gemini.TownReputation.changeFactionRep(name, amount)
 * Then set parameters "RepPenaltyOnArrest" and "RepPenaltyFaction".
 * On Arrest/Jail/Bribe the penalty is applied automatically.
 *
 * -------------------------
 * DATA PERSISTENCE
 * -------------------------
 * Player return location (pre-arrest), accumulated Jail Credit, and last
 * calculated Bail Due persist in save files.
 *
 * -------------------------
 * TERMS
 * -------------------------
 * Free for commercial and non-commercial use. Credit "Gemini".
 *
 * ============================================================================
 * @param WantedVariableId
 * @text Wanted Variable ID
 * @type variable
 * @desc The variable that stores the player's Wanted level.
 * @default 0
 *
 * @param FineThreshold
 * @text Fine Threshold (Wanted)
 * @type number
 * @min 0
 * @desc If Wanted <= this value, Pay Fine option appears instead of Jail.
 * @default 20
 *
 * @param FinePerWanted
 * @text Fine per Wanted Point
 * @type number
 * @min 0
 * @desc Gold cost per Wanted point when paying a fine.
 * @default 10
 *
 * @param BailBase
 * @text Bail Base
 * @type number
 * @min 0
 * @desc Base gold required for bail even at Wanted = 0 (usually small).
 * @default 0
 *
 * @param BailPerWanted
 * @text Bail per Wanted Point
 * @type number
 * @min 0
 * @desc Gold added to bail per Wanted point.
 * @default 50
 *
 * @param BribeMultiplier
 * @text Bribe Cost Multiplier
 * @type number
 * @decimals 2
 * @min 0
 * @desc Bribe cost = BailDue * this multiplier.
 * @default 0.5
 *
 * @param BribeSuccessRate
 * @text Bribe Success Rate (%)
 * @type number
 * @min 0
 * @max 100
 * @desc Chance that a bribe succeeds and clears arrest on the spot.
 * @default 55
 *
 * @param JailMapId
 * @text Jail Map ID (fallback)
 * @type number
 * @min 1
 * @desc If your Jail map doesn't have <jail> in its map note, use this map ID.
 * @default 1
 *
 * @param JailX
 * @text Jail X
 * @type number
 * @min 0
 * @default 10
 *
 * @param JailY
 * @text Jail Y
 * @type number
 * @min 0
 * @default 10
 *
 * @param InJailSwitchId
 * @text In Jail Switch ID
 * @type switch
 * @desc Turned ON while the player is jailed.
 * @default 0
 *
 * @param ArrestCommonEventId
 * @text Arrest Common Event (optional)
 * @type common_event
 * @desc Runs right after an arrest completes (useful for cutscenes).
 * @default 0
 *
 * @param ReleaseCommonEventId
 * @text Release Common Event (optional)
 * @type common_event
 * @desc Runs after the player is released from jail.
 * @default 0
 *
 * @param RepPenaltyOnArrest
 * @text Reputation Penalty on Arrest
 * @type number
 * @desc Negative amount applied to the configured faction on Jail/Arrest.
 * @default -5
 *
 * @param RepPenaltyFaction
 * @text Reputation Faction (optional)
 * @type string
 * @desc Faction name to penalize, if your TownReputation supports it.
 * @default
 *
 * @command ArrestPlayer
 * @text Arrest Player (Show Dialog)
 * @desc Evaluates Wanted, then shows dialog to Pay Fine / Go To Jail / Bribe / Fight-Escape.
 *
 * @command SetWanted
 * @text Set Wanted
 * @arg value
 * @type number
 * @min 0
 * @default 0
 *
 * @command AddWanted
 * @text Add Wanted
 * @arg delta
 * @type number
 * @default 0
 *
 * @command PayFine
 * @text Pay Fine (If Eligible)
 * @desc Attempts to pay fine. Only works when Wanted <= FineThreshold.
 *
 * @command TeleportToJail
 * @text Teleport To Jail
 * @desc Forces teleport to Jail and sets InJail switch.
 *
 * @command PayBail
 * @text Pay Bail
 * @desc If gold >= Bail Due minus Jail Credit, pays and releases from jail.
 *
 * @command AddJailCredit
 * @text Add Jail Credit
 * @arg amount
 * @type number
 * @min 0
 * @default 10
 * @desc Adds work-task credit toward the current Bail Due.
 *
 * @command ReleaseFromJail
 * @text Release From Jail
 * @desc Teleports player back to pre-arrest position and clears Wanted.
 *
 * @command SetJailReturnHere
 * @text Set Return Location Here
 * @desc Manually store current map/x/y as the post-release return point.
 */
(() => {
  const PLUGIN_NAME = "Gemini_ArrestAndJail";
  const P = PluginManager.parameters(PLUGIN_NAME);

  const cfg = {
    wantedVarId: Number(P["WantedVariableId"] || 0),
    fineThreshold: Number(P["FineThreshold"] || 20),
    finePerWanted: Number(P["FinePerWanted"] || 10),
    bailBase: Number(P["BailBase"] || 0),
    bailPerWanted: Number(P["BailPerWanted"] || 50),
    bribeMult: Number(P["BribeMultiplier"] || 0.5),
    bribeSuccess: Number(P["BribeSuccessRate"] || 55),
    jailMapId: Number(P["JailMapId"] || 1),
    jailX: Number(P["JailX"] || 10),
    jailY: Number(P["JailY"] || 10),
    inJailSwitchId: Number(P["InJailSwitchId"] || 0),
    arrestCE: Number(P["ArrestCommonEventId"] || 0),
    releaseCE: Number(P["ReleaseCommonEventId"] || 0),
    repPenalty: Number(P["RepPenaltyOnArrest"] || -5),
    repFaction: String(P["RepPenaltyFaction"] || "").trim()
  };

  // --------------------------
  // Save persistent jail data
  // --------------------------
  const _DataManager_makeSaveContents = DataManager.makeSaveContents;
  DataManager.makeSaveContents = function() {
    const contents = _DataManager_makeSaveContents.call(this);
    contents._gemJail = $gameSystem._gemJail || {};
    return contents;
  };

  const _DataManager_extractSaveContents = DataManager.extractSaveContents;
  DataManager.extractSaveContents = function(contents) {
    _DataManager_extractSaveContents.call(this, contents);
    $gameSystem._gemJail = contents._gemJail || {};
  };

  function jailState() {
    if (!$gameSystem._gemJail) $gameSystem._gemJail = {};
    const j = $gameSystem._gemJail;
    j.returnPoint = j.returnPoint || null; // {mapId,x,y,d}
    j.jailCredit  = j.jailCredit  || 0;
    j.bailDue     = j.bailDue     || 0;
    return j;
  }

  // --------------------------
  // Utility: Wanted accessors
  // --------------------------
  function getWanted() {
    return cfg.wantedVarId > 0 ? $gameVariables.value(cfg.wantedVarId) : 0;
  }
  function setWanted(v) {
    if (cfg.wantedVarId > 0) $gameVariables.setValue(cfg.wantedVarId, Math.max(0, Math.floor(v)));
  }
  function addWanted(d) {
    setWanted(getWanted() + Number(d || 0));
  }

  // --------------------------
  // Reputation soft hook
  // --------------------------
  function applyRepPenalty() {
    if (!cfg.repFaction || !cfg.repPenalty) return;
    const hook = window.Gemini && Gemini.TownReputation && Gemini.TownReputation.changeFactionRep;
    if (typeof hook === "function") {
      try { hook(cfg.repFaction, cfg.repPenalty); } catch(e){ console.warn(PLUGIN_NAME, "Rep hook failed:", e); }
    }
  }

  // --------------------------
  // Jail location helpers
  // --------------------------
  function findJailNoteMap() {
    // Scan current map first, then fallback to param.
    // Note: RPG Maker doesn't provide global map notes at runtime; we use fallback.
    return { mapId: cfg.jailMapId, x: cfg.jailX, y: cfg.jailY };
  }

  function storeReturnPointHere() {
    const rp = { mapId: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y, d: $gamePlayer.direction() };
    jailState().returnPoint = rp;
  }

  function teleportToJail() {
    const dest = findJailNoteMap();
    if (cfg.inJailSwitchId > 0) $gameSwitches.setValue(cfg.inJailSwitchId, true);
    $gamePlayer.reserveTransfer(dest.mapId, dest.x, dest.y, 2, 0);
  }

  function releaseFromJail() {
    const j = jailState();
    const rp = j.returnPoint;
    setWanted(0);
    j.jailCredit = 0;
    j.bailDue = 0;
    if (cfg.inJailSwitchId > 0) $gameSwitches.setValue(cfg.inJailSwitchId, false);
    if (rp) {
      $gamePlayer.reserveTransfer(rp.mapId, rp.x, rp.y, rp.d || 2, 0);
    }
    if (cfg.releaseCE > 0) $gameTemp.reserveCommonEvent(cfg.releaseCE);
  }

  // --------------------------
  // Money & Bail calculations
  // --------------------------
  function currentFine() {
    return Math.max(0, Math.floor(getWanted() * cfg.finePerWanted));
  }

  function computeBail() {
    return Math.max(0, Math.floor(cfg.bailBase + (getWanted() * cfg.bailPerWanted)));
  }

  function ensureBailCached() {
    const j = jailState();
    const due = computeBail();
    j.bailDue = due;
    return due;
  }

  function tryPayFine() {
    const w = getWanted();
    if (w > cfg.fineThreshold) return { ok:false, reason:"overThreshold" };
    const fine = currentFine();
    if ($gameParty.gold() < fine) return { ok:false, reason:"noGold" };
    $gameParty.loseGold(fine);
    setWanted(0);
    applyRepPenalty();
    return { ok:true, paid:fine };
  }

  function tryBribe() {
    const bail = ensureBailCached();
    const cost = Math.floor(bail * cfg.bribeMult);
    if ($gameParty.gold() < cost) return { ok:false, reason:"noGold", cost };
    $gameParty.loseGold(cost);
    const roll = Math.random() * 100;
    if (roll <= cfg.bribeSuccess) {
      setWanted(0);
      applyRepPenalty();
      return { ok:true, success:true, cost };
    } else {
      // Bribe failed: increase wanted slightly
      addWanted(5);
      return { ok:true, success:false, cost };
    }
  }

  function addJailCredit(amount) {
    const j = jailState();
    j.jailCredit = Math.max(0, Math.floor(j.jailCredit + Number(amount || 0)));
    return j.jailCredit;
  }

  function tryPayBail() {
    const j = jailState();
    const bail = ensureBailCached();
    const due = Math.max(0, bail - (j.jailCredit || 0));
    if (due <= 0) { releaseFromJail(); return { ok:true, paid:0, credit:j.jailCredit }; }
    if ($gameParty.gold() < due) return { ok:false, reason:"noGold", due, credit:j.jailCredit };
    $gameParty.loseGold(due);
    releaseFromJail();
    applyRepPenalty();
    return { ok:true, paid:due, credit:j.jailCredit };
  }

  // --------------------------
  // Arrest Dialog (message/choices)
  // --------------------------
  function showArrestDialog() {
    // Cache return point BEFORE moving
    storeReturnPointHere();

    const w = getWanted();
    const bail = ensureBailCached();
    const fine = currentFine();
    const canFine = w <= cfg.fineThreshold;

    const choices = [];
    if (canFine) choices.push("Pay Fine");
    choices.push("Go To Jail", "Bribe Guard", "Fight / Escape");
    const cancelType = -1;

    const text = canFine
      ? `Guard: "Halt! Your wanted level is ${w}. Pay a fine of ${fine} gold or face jail."`
      : `Guard: "Halt! Your wanted level is ${w}. Bail is currently ${bail} gold. Choose."`;

    $gameMessage.add(text);
    $gameMessage.setChoices(choices, -1, cancelType);
    $gameMessage.setChoiceCallback(index => {
      let offset = 0;
      if (canFine) {
        if (index === 0) {
          const res = tryPayFine();
          if (!res.ok) {
            if (res.reason === "noGold") $gameMessage.add("You don't have enough gold to pay the fine.");
            if (res.reason === "overThreshold") $gameMessage.add("Your crimes are too severe for a simple fine.");
            return;
          }
          $gameMessage.add(`Fine paid: ${res.paid} gold. You're free to go.`);
          return;
        }
        offset = 1;
      }
      // Go To Jail
      if (index === 0 + offset) {
        applyRepPenalty();
        teleportToJail();
        if (cfg.arrestCE > 0) $gameTemp.reserveCommonEvent(cfg.arrestCE);
        return;
      }
      // Bribe
      if (index === 1 + offset) {
        const r = tryBribe();
        if (!r.ok && r.reason === "noGold") {
          $gameMessage.add("You don't have enough gold to attempt a bribe.");
          return;
        }
        if (r.success) {
          $gameMessage.add(`Bribe paid (${r.cost}g). The guard looks the other way. You're free to go... for now.`);
        } else {
          $gameMessage.add(`Bribe failed (${r.cost}g lost). The guard glares: "Now you're in real trouble!" (Wanted +5)`);
        }
        return;
      }
      // Fight / Escape
      if (index === 2 + offset) {
        // Do nothing here; let your event continue to start battle or cutscene.
        // We place a flag you can check if you want.
        $gameTemp._gemArrestFightChosen = true;
        $gameMessage.add("You prepare to fight or make a run for it!");
      }
    });
  }

  // --------------------------
  // Plugin Commands
  // --------------------------
  PluginManager.registerCommand(PLUGIN_NAME, "ArrestPlayer", () => {
    showArrestDialog();
  });

  PluginManager.registerCommand(PLUGIN_NAME, "SetWanted", args => {
    setWanted(Number(args.value || 0));
  });

  PluginManager.registerCommand(PLUGIN_NAME, "AddWanted", args => {
    addWanted(Number(args.delta || 0));
  });

  PluginManager.registerCommand(PLUGIN_NAME, "PayFine", () => {
    const res = tryPayFine();
    if (!res.ok) {
      if (res.reason === "overThreshold") $gameMessage.add("Your Wanted is too high to pay a fine.");
      if (res.reason === "noGold") $gameMessage.add("You don't have enough gold for the fine.");
    } else {
      $gameMessage.add(`Fine paid: ${res.paid} gold. Wanted cleared.`);
    }
  });

  PluginManager.registerCommand(PLUGIN_NAME, "TeleportToJail", () => {
    storeReturnPointHere();
    applyRepPenalty();
    teleportToJail();
    if (cfg.arrestCE > 0) $gameTemp.reserveCommonEvent(cfg.arrestCE);
  });

  PluginManager.registerCommand(PLUGIN_NAME, "PayBail", () => {
    const r = tryPayBail();
    if (!r.ok) {
      if (r.reason === "noGold") {
        $gameMessage.add(`You need ${r.due} gold (after ${r.credit} credit) to pay bail.`);
      }
    } else {
      $gameMessage.add(`Bail paid: ${r.paid} gold. You're released.`);
    }
  });

  PluginManager.registerCommand(PLUGIN_NAME, "AddJailCredit", args => {
    const amt = Number(args.amount || 0);
    const total = addJailCredit(amt);
    $gameMessage.add(`You earned ${amt} credit toward bail. Total credit: ${total}.`);
  });

  PluginManager.registerCommand(PLUGIN_NAME, "ReleaseFromJail", () => {
    releaseFromJail();
    $gameMessage.add("You're released. Keep your nose clean.");
  });

  PluginManager.registerCommand(PLUGIN_NAME, "SetJailReturnHere", () => {
    storeReturnPointHere();
    $gameMessage.add("Return location stored.");
  });

})();
