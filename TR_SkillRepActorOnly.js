/*:
 * @target MZ
 * @plugindesc Make <rep skill: ...> apply only when an ACTOR uses the skill.
 */
(() => {
  const rx = /<rep\s+skill:\s*([^>]+?)\s+([+\-]?\d+)(?:\s+type:(\w+))?\s*>/gi;
  function parseSkillNotes(skill){
    const out=[]; if(!skill||!skill.note) return out;
    let m; while((m=rx.exec(skill.note))){ out.push({entity:m[1].trim(), delta:Number(m[2]), type:(m[3]||'default')}); }
    return out;
  }
  const _useItem = Game_Battler.prototype.useItem;
  Game_Battler.prototype.useItem = function(item){
    _useItem.call(this,item);
    if (this.isActor() && item && DataManager.isSkill(item)) {
      parseSkillNotes(item).forEach(t => {
        if (typeof addRepEx === 'function') addRepEx(t.entity, t.delta, t.type, {origin:'skill'});
      });
    }
  };
})();
