// rooms.data.js — which room of the house each traveller's page stands in.
//
// Liber is a house. The main menu keeps the house's own room (the room behind
// the CRT, src/features/crt-room/). Every other page stands in the traveller's
// own room instead of an empty void — the same building, a different room.
//
// This file is the register of that: the room's name, who built it, what it is
// made of, and where its light comes from. The finish itself is declared in
// the room's own stylesheet (src/features/<id>/house.css); this is the written
// record scripts/verify-house.mjs checks the stylesheet against, so the prose
// and the paint cannot drift apart.
//
// `props` are the furniture slots src/house.js renders as .house-prop[data-prop],
// painted by the room's own stylesheet. `floor` names which of them stand on
// the boards below the machine; the rest hang in the band, the wall above the
// desk tube. Those two slots are the only parts of the room that are visible at
// every window shape, so a prop that is not in one of them is not built — see
// the composition note in styles/house.css, and COVENANT § the room wins the
// foreground.
//
// `memory` names which of the machine's hooks (liberdev/room-hooks.md) this
// room re-makes in its own material:
//   lamp  — the session light, burning down with state.sessionStart
//   shelf — one volume per journal keep, on this room's shelf
//   pool  — the water table, where the room keeps one (state.sea, .graveyard)
//   board — one pinned card per relation (state.relations)
//
// `tells` are the room's own labels — the things a traveller would notice and
// no interface would say. They are prose for the register: the stylesheet must
// be traceable to them, and the gate fails if a tell names furniture the room
// does not build.

window.LiberRooms = {

  dreams: {
    id: 'dreams',
    place: 'the sleeping nook',
    traveller: 'insightful inquiry',
    substrate: 'damp plaster, wool, alkaline paper',
    light: 'one lamp on a cord, low, warm; the moon through the window, cold',
    tells: [
      'the foil question mark taped over the damp patch, because the plaster asks',
      'the wool runner, gone thin where the feet go',
      'a mug gone cold, stood down on the boards'
    ],
    props: ['bedend', 'rug', 'mug', 'curtain', 'crack', 'mark'],
    floor: ['bedend', 'rug', 'mug'],
    memory: ['lamp', 'shelf'],
    weather: true
  },

  // RETIRED — Pip's room lives in archive/toybox/ now; the record stays
  // because the bathroom may be re-inhabited someday.
  toybox: {
    id: 'toybox',
    place: 'the bathroom',
    traveller: 'pip',
    substrate: 'glazed tile, chipped enamel, wet grout, brass',
    light: 'one bare bulb on a cord, warm; a frosted fanlight, cold',
    tells: [
      'powder swept as far as the drain and no further',
      'the towel still on its rail, gone stiff at the fold',
      'a run of tile gone, and the grout gone with it'
    ],
    props: ['towel', 'crack', 'mop', 'spill'],
    floor: ['spill'],
    memory: ['lamp', 'shelf'],
    weather: true
  },

  journal: {
    id: 'journal',
    place: 'the study',
    traveller: 'riason',
    substrate: 'indexed vellum, brass clasps, oak, ink',
    light: 'one green-glass banker\u2019s lamp, warm; the window dark behind its curtain',
    tells: [
      'a card pulled out of the file and not put back',
      'the drawer unit, one card still proud of the drawer',
      'papers left on the boards where they fell'
    ],
    props: ['bookcase', 'curtain', 'cabinet', 'card', 'papers'],
    floor: ['cabinet', 'card', 'papers'],
    memory: ['lamp', 'shelf', 'board'],
    weather: true
  },

  sea: {
    id: 'sea',
    place: 'the basement',
    traveller: 'vanir',
    substrate: 'wet slate, mortar, iron pipe, salt bloom',
    light: 'one caged bulb on a cord, cold yellow; no daylight, only the sump',
    tells: [
      'chalk tide marks on the stone, none of them level',
      'a brass valve turned the way a hand last left it',
      'the sump, and the bucket that lives in it'
    ],
    props: ['pipe', 'valve', 'chalkmarks', 'cobweb', 'bucket'],
    floor: ['bucket'],
    memory: ['lamp', 'pool', 'shelf'],
    weather: true
  },

  divination: {
    id: 'divination',
    place: 'the observatory',
    traveller: 'arcana',
    substrate: 'plaster, chalk, felt, brass, night air',
    light: 'one red darkroom lamp, low, warm; the dome slit open on the cold',
    tells: [
      'the meridian chalked on the plaster, redrawn rather than rubbed out',
      'a star chart with one star too many',
      'the chair turned to face the slit, not the table'
    ],
    props: ['chalkline', 'drape', 'chair'],
    floor: ['chair'],
    memory: ['lamp', 'shelf', 'board'],
    weather: true
  },

  games: {
    id: 'games',
    place: 'the play room',
    traveller: 'whimsy wow',
    substrate: 'painted floorboards, cream wallpaper, tin, festoon bulbs',
    light: 'a run of festoon bulbs along the wall, warm; daylight through the pane',
    tells: [
      'hopscotch chalked on the boards and never washed off',
      'a shelf of booth prizes, one of every prize, none of them taken home',
      'the hobby horse, paint worn to bare wood at the grip'
    ],
    props: ['bulbs', 'prizes', 'hopscotch', 'balls', 'horse'],
    floor: ['hopscotch', 'balls', 'horse'],
    memory: ['lamp', 'shelf', 'board'],
    weather: true
  },

  learn: {
    id: 'learn',
    place: 'the stacks',
    traveller: 'riason',
    substrate: 'oak rod, sepia card, brass drawer-pull, red stamp ink',
    light: 'one clerk\u2019s lamp over the catalogue, warm; the aisle dark behind the rods',
    tells: [
      'the drawer left open on the row that was in use',
      'a card standing proud of the rest, drawn and never refiled',
      'the stamp pad gone dry at the edges and wet in the middle'
    ],
    props: ['drawer', 'cards', 'stamp', 'catalogue', 'trolley'],
    floor: ['catalogue', 'trolley'],
    memory: ['lamp', 'shelf', 'board'],
    weather: true
  },

  // AWAITING THE AUTHOR'S APPROVAL — every field below was written by an agent,
  // not by the author, and is the only record in this file that was. Sigil had
  // no record at all, which is why the hub of the whole app showed no room
  // behind the machine. The material follows the author's own register for
  // Physius (stone, chisel, vein, dust tray, warm lamp at the bench); the
  // tells follow the house rule that a tell must name furniture the room
  // actually builds. Replace the prose freely — the shape is what the gate
  // needs, and the shape will survive any rewording.
  sigil: {
    id: 'sigil',
    place: 'the workshop',
    traveller: 'physius',
    substrate: 'grey stone, copper, oak, slip and dust',
    light: 'one lamp pulled down low to the bench, warm; the rest of the room left dark',
    tells: [
      'the dust tray pulled out and not emptied, because the next cut is coming',
      'a chisel left lying on the work instead of back on the rack',
      'the bench corner gone, and never planed flat again'
    ],
    props: ['bench', 'chisel', 'tray', 'rack', 'offcut'],
    floor: ['tray', 'offcut'],
    memory: ['lamp', 'shelf'],
    weather: true
  },

  // AWAITING THE AUTHOR'S APPROVAL — agent-written, like the sigil record.
  // Material follows the sandplay register: damp sand in a bound tray, a box
  // of figures, one warm lamp low over the bench, three frames on the wall.
  memory: {
    id: 'memory',
    place: 'the therapy annex',
    traveller: 'the sand',
    substrate: 'damp sand, bound tray wood, warm lamp, bare plaster',
    light: 'one lamp pulled low over the tray, warm; the wall behind it bare',
    tells: [
      'the rake and the stick crossed on the bench, still sifted with sand',
      'a spill of sand crossed the boards on its way back to the tray',
      'three frames hung level, and the middle one not quite'
    ],
    props: ['bench', 'stick', 'spill', 'frames'],
    floor: ['spill'],
    memory: ['lamp', 'shelf'],
    weather: false
  },

  // AWAITING THE AUTHOR'S APPROVAL — agent-written, like the sigil record.
  // Material follows the author's register for Ruby: glasshouse, condensation
  // you can wipe, roots under glass, a tree in a pot.
  garden: {
    id: 'garden',
    place: 'the glasshouse',
    traveller: 'ruby',
    substrate: 'glass, terracotta, wet grit, iron',
    light: 'daylight through dirty glass, cold; one paraffin lamp for the frosts, warm',
    tells: [
      'the wipe someone started in the condensation and did not finish',
      'the roots gone round the pot and out through the bottom',
      'one bloom kept on a plant that is otherwise all leaf'
    ],
    props: ['cloche', 'pot', 'roots', 'bloom', 'can'],
    floor: ['pot', 'roots', 'can'],
    memory: ['lamp', 'pool'],
    weather: true
  },

  // AWAITING THE AUTHOR'S APPROVAL — agent-written. Material follows the
  // author's register for Pete: a rubble garden, graves that grow things,
  // weathering over visits.
  trash: {
    id: 'trash',
    place: 'the rubble garden',
    traveller: 'pete',
    substrate: 'broken brick, tin, sacking, sour earth',
    light: 'no fixture; whatever comes over the wall, and it is always late',
    tells: [
      'the marker leaning, and what came up beside it anyway',
      'a can bent flat by hand and kept rather than thrown',
      'the heap gone softer at the edges, a visit at a time'
    ],
    props: ['heap', 'marker', 'shoot', 'tin', 'sacking'],
    floor: ['heap', 'tin', 'sacking'],
    memory: ['shelf'],
    weather: true
  }

};
