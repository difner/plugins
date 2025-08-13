/*:
 * @target MZ
 * @plugindesc v1.0 UI compat shim: adds Window_Base.textPadding() if missing (for loot/shop preview).
 * @author ChatGPT
 */
(() => {
  const WB = Window_Base.prototype;
  if (typeof WB.textPadding !== 'function') {
    WB.textPadding = function() {
      if (typeof this.itemPadding === 'function') return this.itemPadding();
      return 6; // sensible default
    };
  }
})();
