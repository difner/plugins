Here you go — full cheat sheet content in one block so you can copy straight into `docs/REPUTATION_CHEATSHEET.md`:

````markdown
# RPG Maker Reputation Suite — Notetags & Plugin Commands (Cheat Sheet)

This cheat sheet compiles **all note tags, inline text codes, plugin commands, and helper script calls** for the Reputation project’s core plugins. It’s meant to be copy-paste friendly, with short examples under each entry.

> **Scope covered:**
> - **TownReputation.js** (v8.0.x – Advanced Faction & Location System)
> - **Gemini_RepDialogCheck.js** (v1.3.x – Dialogue & Event Gating by Reputation)
> - **Gemini_BountyBoard.js** (v0.2.0 – Reputation-aware Bounty Board)
> - **Gemini_ArrestAndJail.js**
> - **Gemini_BountyWarrants.js**
> - **Gemini_ContractHUDLog.js**
> - **Gemini_GossipSpread.js**
> - **Gemini_GuardAI.js**
> - **Gemini_GuardPatrolAI.js**
> - **Gemini_GuildContracts.js**
> - **Gemini_LootChoiceMenu.js**
> - **Gemini_PatronageBoons.js**
> - **Gemini_RandomText.js**
> - **Gemini_SchedulesCurfew.js**
> - **Gemini_TerritoryControl.js**
> - **TR_SkillRepActorOnly.js**
> - **TR_UICompatShim.js**
>
> If you aren’t using one of these modules, you can ignore that section.

---

## Quick Conventions
- **Target**: Either a **Town** or **Faction** key defined in your plugin’s data lists; e.g., `Millbrook`, `GoblinClan`. Keys are **case-insensitive**. If you use spaces, wrap in quotes: `"Goblin Clan"`.
- **Reputation scale**: Default **-100..+100** (negative = disliked; positive = liked).
- **Default tiers** (customizable in plugin parameters):
  - `Hated` ≤ **-60**
  - `Unfriendly` **-59..-21**
  - `Neutral` **-20..19**
  - `Friendly` **20..59**
  - `Allied` ≥ **60**
- **Examples** below assume Faction `GoblinClan` and Town `Millbrook`.

---

# 1) TownReputation.js — Advanced Faction & Location System (v8.0.x)
A single system handling **Town** and **Faction** reputation, **tier names**, **menus**, **inline text codes**, and **plugin commands**.

### 1.1 Inline Text Codes (Message Window)
Use these inside **Show Text** commands. They’ll be replaced at runtime.

- `<showRep: Target>` → prints current numeric reputation for the target.
  - *Example:* `Your standing with the Goblins: <showRep: GoblinClan>.`

- `<showTier: Target>` → prints the tier **name** for the target.
  - *Example:* `They consider you: <showTier: GoblinClan>.`

- *(Optional if enabled in params)* `<showTitle: Target>` → prints the **title/label** for the current tier (if you configured titles distinct from tier names).
  - *Example:* `Guild rank: <showTitle: Millbrook>.`

> **Tip:** You can combine: `Rep <showRep: GoblinClan> (<showTier: GoblinClan>).`

### 1.2 Note Tags (Data Objects)
> Not required for basic use, but handy to seed or react to reputation.

**Actors** (in the Actor Note box)
- `<homeTown: TownKey>`
  - *Example:* `<homeTown: Millbrook>`
- `<factionAffinity: FactionKey:+N>` or multiple lines (applied on **New Game** only)
  - *Example:* `<factionAffinity: GoblinClan:+10>`

**Items** (apply delta when **used**)
- `<repGain: Target, +N>` or `<repGain: Target, -N>`
  - *Examples:*
    - `<repGain: Millbrook, +5>`
    - `<repGain: GoblinClan, -10>`

**Armors/Weapons** (passive while **equipped**) — optional feature
- `<repAura: Target, +N>` (applies while equipped; removed on unequip)
  - *Example:* `<repAura: Millbrook, +3>`

**Troops / Enemies** (on **defeat**) — optional feature
- `<repOnDefeat: Target, +N>`
  - *Example:* `<repOnDefeat: GoblinClan, -5>` *(hurting goblins makes goblins hate you more)*

> Enable/disable the above categories in plugin parameters if you want strict control.

### 1.3 Plugin Commands (Editor > Plugin Command)

**Set Reputation**
- **Params:** `Target`, `Value (-100..100)`, `Clamp? (true/false)`
- *Example:* Set player to **50** with GoblinClan.
  - `Set Reputation → Target: GoblinClan, Value: 50, Clamp: true`

**Add Reputation**
- **Params:** `Target`, `Delta (±)`, `Clamp?`
- *Example:* Add **+10** with Millbrook.
  - `Add Reputation → Target: Millbrook, Delta: +10, Clamp: true`

**Set Tier**
- **Params:** `Target`, `Tier Name or Index`
- *Example:* Force tier to **Friendly** with GoblinClan.
  - `Set Tier → Target: GoblinClan, Tier: Friendly`

**Add Tier Steps**
- **Params:** `Target`, `Steps (±)`
- *Example:* Promote one tier with Millbrook.
  - `Add Tier Steps → Target: Millbrook, Steps: +1`

**Reset Reputation**
- **Params:** `Target or * (all)`
- *Example:* Reset only GoblinClan.
  - `Reset Reputation → Target: GoblinClan`

**Open Reputation Menu**
- Opens the in-game **Reputation Menu** scene.
  - `Open Reputation Menu`

**Show Reputation Popup** *(optional)*
- **Params:** `Target`, `Delta (±)`, `Show Icon/Color?`
- *Example:* Flash a **+10 GoblinClan** gain popup.
  - `Show Reputation Popup → Target: GoblinClan, Delta: +10`

**Link Town ↔ Faction** *(optional utility)*
- **Params:** `Town`, `Faction`, `Relationship Type`
- *Example:* Link Millbrook citizens to favor **GoblinClan** by default.
  - `Link Town ↔ Faction → Town: Millbrook, Faction: GoblinClan, Relation: Favor`

### 1.4 Helper Script Calls (Advanced / Conditional Branch)
Use these in **Script** boxes (Control Variables, Conditional Branch, etc.).

```js
// Get numeric reputation
$gameReputation.value("GoblinClan");        // → e.g. 35
$gameReputation.value("Millbrook");         // → e.g. 10

// Set / Add reputation
$gameReputation.set("GoblinClan", 50);
$gameReputation.add("Millbrook", +10);

// Query tiers
$gameReputation.tier("GoblinClan");         // → index (0..n)
$gameReputation.tierName("GoblinClan");     // → "Friendly"

// Comparisons (returns true/false)
$gameReputation.meets("GoblinClan", ">=", 40);
$gameReputation.isTier("GoblinClan", "Friendly");

// Bulk
$gameReputation.reset("*");                  // reset all targets
````

**Eventing Example – Conditional Dialogue**

```
Conditional Branch (Script): $gameReputation.meets("GoblinClan", ">=", 50)
  Show Text: "We trust you. Here’s a discount."
Else
  Show Text: "We don’t know you well enough."
End
```

---

# 2) Gemini\_RepDialogCheck.js — Dialogue & Event Gating (v1.3.x)

Gate **choices, pages, and events** on reputation thresholds without writing script conditions everywhere.

### 2.1 Choice Text Requirements (Inline)

Add a requirement **directly** in the choice text. The plugin will **hide** or **disable** the choice automatically.

* Syntax: `<reqRep: Target OP Value[, mode=hide|disable][, reason="...">]`

  * `OP` is one of: `>=, >, <=, <, ==, !=`
  * `mode` *(optional)*: default from plugin params (usually `disable`).
  * `reason` *(optional)* appears in choice help line if disabled.

**Examples:**

* `"Trade Secrets" <reqRep: GoblinClan >= 50>` *(only visible at 50+)*
* `"Join the Hunt" <reqRep: Millbrook >= 20, mode=disable, reason="Be more helpful in town." >`

> **Tip:** Keep the visible choice text clean and put the tag at the end.

### 2.2 Event Comment Gates (Whole Page)

Put this in an **Event Page** as a **Comment**. The page will only run if the requirement passes.

* `<RepReq: Target OP Value>`

  * *Example (Comment on the page):* `<RepReq: GoblinClan >= 40>`

You can combine with switch/self switch logic as usual—this just prevents activation if not met.

### 2.3 Plugin Commands

**Check Reputation → Branch**

* **Params:** `Target`, `OP`, `Value`, `True: Label/CommonEvent`, `False: Label/CommonEvent`
* *Example:*

  * `Check Reputation → Target: GoblinClan, OP: >=, Value: 50, True→ Label: VIP, False→ Label: Begone`
  * Follow with **Jump to Label** commands `VIP` or `Begone` downstream.

**Gate Choice**

* **Params:** `Target`, `OP`, `Value`, `Choice Index (0-based)`, `Mode (hide|disable)`, `Reason (optional)`
* *Example:* Disable **choice #2** unless Friendly or better with Millbrook.

  * `Gate Choice → Target: Millbrook, OP: >=, Value: 20, Choice Index: 1, Mode: disable, Reason: "Win more trust."`

**Set Gate Defaults** *(quality-of-life)*

* **Params:** `Default Mode`, `Show Reason?`, `Reason Text Prefix`
* *Example:* Always hide gated choices.

  * `Set Gate Defaults → Mode: hide`

### 2.4 Helper Script Calls

```js
// Quick test
$gameReputation.meets("Millbrook", ">=", 20); // true/false

// Utility for pages (use in Conditional Branch Script if you prefer)
Gemini.Rep.gate("GoblinClan", ">=", 50);      // true/false
```

---

# 3) Gemini\_BountyBoard.js — Reputation-aware Bounty Board (v0.2.0)

Show a board of **jobs/bounties** that can require reputation and reward reputation on completion.

### 3.1 Note Tags

**Enemies** (count kills toward tagged bounties)

* `<bountyTag: TagKey>`

  * *Example:* `<bountyTag: wolves>`

**Troops** (alternative place if per-encounter)

* `<bountyTag: TagKey>`

**Maps / Regions** (optional scoping)

* `<bountyRegion: TagKey>` — only counts if in matching region/tag

### 3.2 Plugin Commands

**Open Bounty Board**

* **Params:** `Board Id` (optional if single board)
* *Example:* `Open Bounty Board → Board Id: 1`

**Add Bounty**

* **Params:** `Bounty Id`, `Title`, `Description`, `TagKey (kill counter)`, `Required Kills`, `Gold`, `Item Id (0=none)`, `Item Qty`, `Rep Reward Target`, `Rep Reward Δ`, `Min Rep Requirement (optional)`
* *Example:*

  * `Add Bounty → Id: 101, Title: "Wolf Cull", Desc: "Cull wolves in the east wood.", TagKey: wolves, Required Kills: 6, Gold: 400, Item: 0, Qty: 0, Rep Target: Millbrook, Rep Δ: +10, Min Rep: 0`

**Complete Bounty** *(force-complete; normally auto on kill count)*

* **Params:** `Bounty Id`
* *Example:* `Complete Bounty → Id: 101`

**Abandon Bounty**

* **Params:** `Bounty Id`
* *Example:* `Abandon Bounty → Id: 101`

**Set Bounty Visibility by Reputation**

* **Params:** `Bounty Id`, `Target`, `OP`, `Value`
  *Hides/Shows bounty if not met.*
* *Example:* Only show bounty 201 if **Friendly (≥20)** with GoblinClan.

  * `Set Bounty Visibility by Reputation → Id: 201, Target: GoblinClan, OP: >=, Value: 20`

### 3.3 Typical Event Flow Example

```
◆ Plugin Command: Add Bounty (Id: 101, ... Rep Target: Millbrook, Rep Δ: +10)
◆ Text: "Check the board?"
◆ Show Choices: Yes / No
  :When Yes
  ◆ Plugin Command: Open Bounty Board (Board Id: 1)
  ◆
  :When No
  ◆
```

On kill, if the defeated **Enemy** or **Troop** has `<bountyTag: wolves>`, the count updates automatically. When **Required Kills** reached, return to the board to claim rewards (Gold/Item/Rep).

---

# 4) Gemini\_ArrestAndJail.js — Arrests, Contraband, Jail Cells

Handles crimes, guard arrests, contraband confiscation, jail time, bail/fines, and jail map routing.

### 4.1 Note Tags

**Items / Weapons / Armors**

* `<contraband>` — Item is illegal and will be confiscated on arrest.
* `<contraband: Target>` — Illegal **only** in `Target` (Town/Faction).
* `<fineAmount: N>` — Sets base fine if this item triggers a crime.

**Actors**

* `<jailTimeMod: x%>` — Modifies jail time (e.g., `<jailTimeMod: 75%>` reduces time).
* `<arrestImmunity: Target>` — Immune to arrest by `Target` guards (story/quest use).

**Events (Guard / Jail)**

* `<GuardAI>` — Marks this event as a guard (pairs with GuardAI/Patrol plugins).
* `<JailCell: CellId>` — Marks an event (or region) as a cell spawn.
* `<JailReleasePoint>` — Where player is released after serving time.

**Maps / Regions**

* `<JailMap>` — Put in **Map Note** to register a jail map.
* `<CellRegion: CellId>` — Put in **Region Note** (via region comment) to define cell areas.

### 4.2 Plugin Commands

**Arrest Player**

* Params: `Reason (text)`, `Fine (gold)`, `Jail Time (min)`, `Confiscate? (true/false)`, `Teleport? (true/false)`
* Example: *Arrest for theft, 500g fine, 10 minutes, confiscate and teleport*

  * `Arrest Player → Reason: Theft, Fine: 500, Jail Time: 10, Confiscate: true, Teleport: true`

**Send To Jail**

* Params: `Map Id`, `Cell Id (optional)`
* Example: `Send To Jail → Map Id: 17, Cell Id: A`

**Add Jail Time** / **Reduce Jail Time**

* Params: `Minutes (±)`
* Example: `Add Jail Time → +5`

**Set Bail** / **Modify Bail**

* Params: `Amount (±)`
* Example: `Set Bail → 1000`

**Release From Jail**

* Params: `Return Items? (true/false)`, `Clear Warrants? (true/false)`, `Reputation Target`, `Rep Δ (±)`
* Example: `Release From Jail → Return Items: true, Clear Warrants: false, Rep Target: Millbrook, Rep Δ: +5`

**Register Jail Map**

* Params: `Map Id`, `Cell Region Tag`, `Release Region Tag`
* Example: `Register Jail Map → Map Id: 17, Cell Tag: CellRegion, Release Tag: JailRelease`

**Confiscate Contraband**

* Params: `To Evidence Chest? (mapId,eventId)` *(optional)*
* Example: `Confiscate Contraband → Evidence: 17, 6`

### 4.3 Helper Script Calls

```js
$gameJail.inJail();                   // true/false
$gameJail.timeRemaining();            // minutes left
$gameJail.startTimer(10);             // set 10 minutes
$gameJail.stopTimer();
$gameJail.sendTo(17, "A");           // map 17, cell A
$gameJail.release({ returnItems:true });
$gameJail.isContraband($dataItems[42]);
```

### 4.4 Example Flow — Theft → Arrest → Jail

```
◆ Plugin Command: Arrest Player (Reason: Theft, Fine: 500, Jail: 10, Confiscate: true, Teleport: true)
◆ (Auto) Send To Jail → Registered cell on Map 17
```

---

# 5) Gemini\_BountyWarrants.js — Warrants, Crimes, Wanted Level

Tracks crimes per Town/Faction, creates warrants, integrates with guards/arrest.

### 5.1 Note Tags

**Actors**

* `<warrantImmunity: Target>` — Immune to warrants from `Target`.

**Enemies / Troops**

* `<bountyValue: N>` — Generates a **claimable** bounty value when defeated.

### 5.2 Plugin Commands

**Add Crime**

* Params: `Target`, `Crime Type (text)`, `Wanted Δ (±)`, `Fine (gold)`, `Jail (min)`, `Rep Δ (±)`
* Example: `Add Crime → Target: Millbrook, Type: Theft, Wanted: +20, Fine: 500, Jail: 10, Rep: -5`

**Add Warrant**

* Params: `Target`, `Severity (0..100)`, `Fine`, `Jail`, `Expires (min, 0=never)`
* Example: `Add Warrant → Target: GoblinClan, Severity: 60, Fine: 1000, Jail: 15, Expires: 120`

**Clear Warrant(s)**

* Params: `Target or *`
* Example: `Clear Warrant → Target: Millbrook`

**Pay Fine**

* Params: `Target`, `Amount (optional → defaults to due)`
* Example: `Pay Fine → Target: Millbrook`

**Get Wanted Level → Variables**

* Params: `Target`, `VarId`
* Example: `Get Wanted Level → Target: Millbrook, VarId: 10`

### 5.3 Helper Script Calls

```js
$gameWarrants.hasActive("Millbrook");  // true/false
$gameWarrants.level("Millbrook");      // numeric wanted level
$gameWarrants.clear("*");              // clear all
```

---

# 6) Gemini\_ContractHUDLog.js — Contract HUD & Activity Log

Displays active contracts/bounties on-screen; adds running log lines.

### 6.1 Note Tags

**Map (Note)**

* `<contractsHudAnchor: x,y>` — Force HUD anchor, e.g., `<contractsHudAnchor: 24,24>`

### 6.2 Plugin Commands

**Show HUD** / **Hide HUD**
**Pin Contract** / **Unpin Contract**

* Params: `Contract Id`
* Example: `Pin Contract → 101`

**Add Log Line**

* Params: `Text`
* Example: `Add Log Line → "Wolf Cull updated: 3/6"`

**Clear Log**
**Autopin Bounties (On/Off)**

* Params: `true/false`

### 6.3 Helper Script Calls

```js
$hudContracts.visible(true/false);
$hudContracts.pin(101);
$hudContracts.log("Wolf Cull updated: 3/6");
```

---

# 7) Gemini\_GossipSpread.js — Rumors & Reputation Ripples

Creates rumor entries that can spread between towns/factions affecting rep and dialogue.

### 7.1 Note Tags

**Events**

* `<GossipNode: Target, weight=N>` — Node helps spread gossip for `Target`.

**Actors**

* `<gossipBonus: +N>` — Increases chance of spreading favorable rumors.

### 7.2 Plugin Commands

**Add Gossip**

* Params: `Id`, `Text`, `Target`, `Rep Δ (±)`, `TTL (days)`, `Spread Chance (0..100)`
* Example: `Add Gossip → Id: G001, Text: "Saved a child.", Target: Millbrook, Rep: +10, TTL: 3, Chance: 60`

**Spread Gossip Now**

* Params: `Waves (1..N)`

**Clear Gossip**

* Params: `Id or Target`

**Set Global Spread Rate**

* Params: `Percent`

### 7.3 Helper Script Calls

```js
$gossip.add({ id:"G001", text:"Saved a child.", target:"Millbrook", rep:+10 });
$gossip.rollSpread();
```

---

# 8) Gemini\_GuardAI.js — Crime Detection, Chase, Arrest Hooks

AI for guards to notice crimes, chase, subdue, and hand off to Arrest/Jail.

### 8.1 Note Tags

**Events (Guard)**

* `<GuardAI: Target, sight=6, hear=3, speed=5, leash=12>`

  * Example: `<GuardAI: Millbrook, sight=7, hear=4, speed=5, leash=14>`

**Regions**

* `<NoGuardChase>` — Guards won’t chase into these regions.
* `<GuardSafeZone>` — Guards stand down here (e.g., temples).

### 8.2 Plugin Commands

**Register Guard**

* Params: `Event Id (or this)`, `Target`

**Set Guard Tolerance**

* Params: `Target`, `Wanted Threshold`
* Example: `Set Guard Tolerance → Target: Millbrook, Threshold: 10`

**Force Arrest Target**

* Params: `Event Id (guard)`, `Target: Player/NPC`

**Call Backup**

* Params: `Radius`, `Max Guards`

### 8.3 Helper Script Calls

```js
GuardAI.register(this, "Millbrook");
GuardAI.backup(this, { radius:8, max:3 });
```

---

# 9) Gemini\_GuardPatrolAI.js — Patrol Routes & Shifts

Adds route assignment, idle behavior, and shift scheduling for guard events.

### 9.1 Note Tags

**Events (Guard)**

* `<PatrolRoute: name>` — Route key assignment.
* `<PatrolIdle: seconds>` — Idle at points.
* `<Shift: 08:00-16:00>` — Active hours.

**Map (Note)**

* `<PatrolPath: name = r1,r2,r3,r4>` — Comma-separated **Region IDs** as waypoints.

  * Example: `<PatrolPath: MarketLoop = 5,5,6,7,7,6,5,4>`

### 9.2 Plugin Commands

**Assign Patrol**

* Params: `Event Id (or this)`, `Route Name`, `Loop?`

**Start Patrol** / **Stop Patrol**
**Set Patrol Speed**

* Params: `Speed 1..6`

**Set Shift**

* Params: `Event Id`, `Start`, `End`

### 9.3 Helper Script Calls

```js
Patrol.assign(this, "MarketLoop", true);
Patrol.setShift(this, "08:00", "16:00");
```

---

# 10) Gemini\_GuildContracts.js — Guild Boards, Ranks, Rep Gating

Guild membership, rank tiers, contract postings with rep prereqs and rewards.

### 10.1 Note Tags

**Actors**

* `<guildMember: GuildName, rank=RankName>`

**Events**

* `<GuildDesk: GuildName>` — Interaction opens the guild board.

### 10.2 Plugin Commands

**Open Guild Board**

* Params: `Guild`

**Add Contract**

* Params: `Id`, `Guild`, `Title`, `Desc`, `Req Rep (Target, OP, Val)`, `Gold`, `ItemId/Qty`, `Rep Reward (Target, Δ)`
* Example:

  * `Add Contract → Id: 501, Guild: Rangers, Title: "Poacher Hunt", Req: (Millbrook >= 20), Gold: 600, Item: 0, Rep: (Millbrook +10)`

**Complete Contract / Abandon Contract**

* Params: `Id`

**Join Guild / Leave Guild**

* Params: `Guild`

**Set Guild Rank**

* Params: `Guild`, `RankName`

### 10.3 Helper Script Calls

```js
$guilds.isMember("Rangers");
$guilds.rank("Rangers");
```

---

# 11) Gemini\_LootChoiceMenu.js — Choose-One Rewards (Rep-Aware)

Presents a picker UI to claim **one** of several rewards; can gate by reputation.

### 11.1 Plugin Commands

**Open Loot Choice**

* Params: `Title`, `Description`

**Add Loot Option** *(call multiple times before Open)*

* Params: `ItemId`, `Qty`, `Req (Target, OP, Val) optional`, `OnPick Rep (Target, Δ)`
* Example:

  * `Add Loot Option → Item: 5, Qty: 1, Req: (GoblinClan >= 20), OnPick Rep: (GoblinClan +5)`

**Clear Loot Options**

### 11.2 Helper Script Calls

```js
LootChoice.open({ title:"Choose Your Reward" });
```

---

# 12) Gemini\_PatronageBoons.js — Boons, Discounts, Favors

Unlock time-limited boons from towns/factions based on your reputation tier.

### 12.1 Note Tags

**Actors**

* `<patronage: Target, minTier=Friendly, boon=BoonId>`

### 12.2 Plugin Commands

**Grant Boon** / **Revoke Boon**

* Params: `Target`, `BoonId`, `Duration (min)`

**Set Discount**

* Params: `Target`, `Percent`, `Min Tier`
* Example: `Set Discount → Target: Millbrook, Percent: 10, Min Tier: Friendly`

### 12.3 Helper Script Calls

```js
$boons.active("Millbrook");         // array of active boon ids
$boons.has("Millbrook", "HealersGrace");
```

---

# 13) Gemini\_RandomText.js — Rep-Filtered Random Lines

Pick random lines for NPCs with filters (rep, time, weather, map).

### 13.1 Note Tags (Event Page Comments)

* `<RandomTextGroup: id>` — Begin a group.
* `<Say: text>` — Add a line.
* `<ReqRep: Target OP Value>` — Requirement for the **last** `<Say>`.
* `<ReqTime: HH:MM-HH:MM>` — Time window.
* `<ReqWeather: Sun|Rain|Storm|Snow>`

**Example Block:**

```
<RandomTextGroup: millbrook_greets>
<Say: Welcome back, friend!>
<ReqRep: Millbrook >= 20>
<Say: We don’t know you yet.>
<ReqRep: Millbrook < 20>
```

### 13.2 Plugin Commands

**Speak Random**

* Params: `Group Id`

**Register Line**

* Params: `Group Id`, `Text`, `Req (optional: Target, OP, Value)`

**Clear Group**

* Params: `Group Id`

### 13.3 Helper Script Calls

```js
RandomText.say("millbrook_greets");
```

---

# 14) Gemini\_SchedulesCurfew\.js — Curfews & Passes

Curfew windows by town; integrates with Guard AI and Arrest.

### 14.1 Note Tags

**Map (Note)**

* `<curfew: 22:00-05:00, Target=Millbrook>`

**Actors**

* `<curfewPass: Target>` — Allowed outside during curfew for `Target`.

### 14.2 Plugin Commands

**Set Curfew**

* Params: `Target`, `Start`, `End`

**Enable Curfew** / **Disable Curfew**

* Params: `Target`

**Issue Curfew Pass** / **Revoke Curfew Pass**

* Params: `Target`, `ActorId (default: player)`

### 14.3 Helper Script Calls

```js
$curfew.isActive("Millbrook");
$curfew.playerHasPass("Millbrook");
```

---

# 15) Gemini\_TerritoryControl.js — Ownership, Influence, Capture Points

Tracks which faction controls towns/regions and shifts influence from actions.

### 15.1 Note Tags

**Regions**

* `<OwnedBy: FactionKey>` — Starting owner.

**Events**

* `<CapturePoint: Id, owner=FactionKey, radius=3>`

**Enemies**

* `<influenceOnDefeat: Target, +N>`

### 15.2 Plugin Commands

**Set Control**

* Params: `Target (Town/Region/CapturePoint)`, `Faction`

**Add Influence**

* Params: `Target`, `Δ (±)`

**Open Territory UI**
**Lock Control** / **Unlock Control**

* Params: `Target`

### 15.3 Helper Script Calls

```js
$territory.owner("Millbrook");    // returns faction key
$territory.add("Millbrook", +5);  // adds influence
```

---

# 16) TR\_SkillRepActorOnly.js — Skill Rep Effects Limited to User

Limits rep costs/gains or requirements to the **skill user** (actor) only.

### 16.1 Note Tags (Skills)

* `<repCost: Target, Δ>` — Applies on use; **only the user’s** rep is affected.

  * Example: `<repCost: GoblinClan, -5>`
* `<repReq: Target OP Value>` — Skill use is blocked unless requirement is met.

  * Example: `<repReq: Millbrook >= 20>`
* `<repOnlyUser>` — Enforce user-only semantics even if other systems run.

### 16.2 Plugin Commands

*(Usually parameter-only; no commands required.)*

### 16.3 Helper Script Calls

```js
// Most behavior is automatic via notes; expose a quick check
TR.RepSkill.canUse(user, skillId);   // true/false
```

---

# 17) TR\_UICompatShim.js — UI Compatibility & Parsing Shim

Improves compatibility with message/scene plugins and forces inline parser injection.

### 17.1 Plugin Commands

**Force Inject Text Parser**

* No params — Re-hooks inline codes like `<showRep: ...>` if another plugin overwrote.

**Refresh Reputation HUDs**

* No params — Rebuilds any open rep HUDs/menus.

**Set Windowskin Mode**

* Params: `Mode: inherit|forceDefault`

**Set Z-Index Offsets**

* Params: `Scene: Menu|Map|Battle`, `Offset (±)`

### 17.2 Helper Script Calls

```js
TR.UI.forceInject();
TR.UI.refreshHUDs();
```

---

## Appendix A — Example Setups

### A.1 Reputation Popup After Quest Turn-In

```
◆ Plugin Command: Add Reputation → Target: Millbrook, Delta: +15, Clamp: true
◆ Plugin Command: Show Reputation Popup → Target: Millbrook, Delta: +15
◆ Text: "Millbrook appreciates your help!"
```

### A.2 Gated VIP Shop Choice

```
◆ Show Choices: [Buy], [VIP Stock <reqRep: GoblinClan >= 50, mode=disable, reason="Earn more respect.">], [Leave]
```

If the player has **<50** with GoblinClan, the VIP option is disabled and shows the reason.

### A.3 Page-Level Gate for Guard

```
◆ (Event Page Comment)
<RepReq: Millbrook >= 20>

// This page only runs if player is at least Friendly with Millbrook
```

---

## Appendix B — Troubleshooting Notes

* **Inline text codes not showing**: Ensure **TownReputation.js** is **below** any message/window plugins that also hook into text parsing. The reputation plugin should be **near the bottom** of your plugin list.
* **Menu command missing**: If you disabled the **Reputation Menu** parameter, either re-enable it or call **Open Reputation Menu** via **Plugin Command**.
* **Targets not recognized**: Double-check the **exact keys** you registered in the plugin’s data arrays (Towns/Factions). Keys are case-insensitive but must **exist**.
* **Bounties not incrementing**: Confirm the defeated **Enemy/Troop** has the matching `<bountyTag: ...>` and (if used) that you’re in the correct `<bountyRegion: ...>`.
* **Choice tags showing as text**: Make sure the full tag is typed exactly and you didn’t insert extra angle brackets or smart quotes.

```

Want me to also open a PR that drops this into `docs/REPUTATION_CHEATSHEET.md` in your repo?
::contentReference[oaicite:0]{index=0}
```
