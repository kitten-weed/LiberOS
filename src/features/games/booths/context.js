// Shared booth context — built once by games.js and passed to every booth
// module. Single ownership: booths receive tools, they never reach back.

(function () {
function makeBoothContext(tools) {
  return {
    app: tools.app,
    stage: tools.stage,
    promptSave: tools.promptSave,
    saveToDesktopAndJournal: tools.saveToDesktopAndJournal,
    thumb: tools.thumb,
    esc: tools.esc,
    thunk: tools.thunk,
    setView: tools.setView
  };
}
window.LiberBooths = window.LiberBooths || {};
window.LiberBooths.makeBoothContext = makeBoothContext;
})();
