// dreams.data.js — insightful inquiry's reading room (runtime data, file://-safe, no fetch).
// Two banks:
//   symbols  — literal word matches with a named cultural association and citation.
//              The optional reader uses only match, name, part, and cite; longer
//              legacy notes are not rendered as claims about the dreamer.
//   teaching — the two folios: stalking synchronicity, and the geography of the
//              unconscious. Body is HTML with <button class="dreams-fn" data-cite="...">†</button>
//              footnote triggers, same grammar the learn workbook uses.
// Sources of record are cited inline. These are historical frameworks, not
// universal meanings or clinical findings.
window.LIBER_DATA = window.LIBER_DATA || {};
window.LIBER_DATA.dreams = {
  symbols: [
    {
      id: 'water',
      name: 'water',
      match: ['water','ocean','sea','flood','drowning','drown','river','rain','swim','swimming','wave','waves','lake','tide','underwater'],
      part: 'the unconscious itself',
      essence: 'water is the oldest picture of the unconscious — spirit taking fluid form. to enter water in a dream is to enter what carries you without your steering: mood, memory, instinct. clear water and muddy water are not the same report; a flood means the defences of the day have been overrun.',
      amplify: 'baptism, the flood epics, the deep as the mother of life — wherever the psyche speaks at large, it speaks of water.',
      questions: [
        'what in your waking life has been rising slowly, the way water rises before anyone calls it a flood?',
        'in the dream, were you swimming, standing, or being carried? the difference is the diagnosis.'
      ],
      cite: 'jung-cw9i'
    },
    {
      id: 'house',
      name: 'the house',
      match: ['house','home','room','rooms','attic','basement','cellar','upstairs','downstairs','hallway','stairs','floor','floors'],
      part: 'the structure of the psyche',
      essence: 'the house is a floor plan of the self. attics and upper rooms: consciousness and its interests. the ground floor: the day\'s traffic. the cellar: the personal unconscious, its instincts and its stored heat. an unexplored room is a part of the personality not yet lived in — the dream is offering the tour.',
      amplify: 'von Franz read the dreamer\'s house the way an architect reads a building: by what is occupied, what is locked, and what the stairways connect.',
      questions: [
        'which room of your own house would you rather not open? what is stored there?',
        'was the house larger than your waking life, or smaller? both are findings.'
      ],
      cite: 'von-franz-1964'
    },
    {
      id: 'snake',
      name: 'the serpent',
      match: ['snake','snakes','serpent','serpents','cobra','python','viper','ouroboros'],
      part: 'the chthonic Self',
      essence: 'the serpent is ambivalence itself: healing on the physician\'s staff, danger in the grass, renewal when it sheds its skin. Jung read it as cold-blooded psychic energy — instinctive life that does not need your permission to move. it is not read as evil by default. it is read as ancient, and as yours.',
      amplify: 'the ouroboros, the tail-eater: beginning and end in one circle. Asclepius healed with a serpent coiled on his staff.',
      questions: [
        'what instinct in you has been coiled and waiting while you decided whether to call it danger or medicine?',
        'the serpent sheds its skin. what are you overdue to shed?'
      ],
      cite: 'jung-cw9ii'
    },
    {
      id: 'pursuer',
      name: 'the pursuing figure',
      match: ['chasing','chased','chase','pursued','pursuer','following me','stalker','dark figure','shadowy figure','figure in the dark','intruder','someone behind','shadow figure'],
      part: 'the shadow',
      essence: 'the one who follows is almost always the one the dreamer refuses to be. von Franz: the shadow is first met outside — projected onto strangers, enemies, the thing in the dark — and the pursuit ends not by outrunning it but by turning and asking what it wants. the dream keeps the appointment until you keep it.',
      amplify: 'in the old tales the pursuer becomes a guide once faced. the shape in the doorway is a role, not a face.',
      questions: [
        'if you stopped running and asked it — what would it want from you?',
        'whose face did you hope it would not wear? start there.'
      ],
      cite: 'jung-cw9ii'
    },
    {
      id: 'falling',
      name: 'falling',
      match: ['falling','fell','fall','plummet','dropped'],
      part: 'the ego\'s hold',
      essence: 'a falling dream is the deflation of an attitude grown too high — the grip of the ego loosening on an idea of itself. Jung did not read it as a prophecy of ruin; he read it as a re-settling, gravity\'s correction of an inflation. the body already knows how to land.',
      amplify: 'the fall of Icarus is the same report told as myth: the wax was never the issue; the height was.',
      questions: [
        'what have you been holding onto that is now holding you?',
        'where in your life did you stop being the one who decides the height?'
      ],
      cite: 'jung-cw9i'
    },
    {
      id: 'flying',
      name: 'flying',
      match: ['flying','flew','float','floating','levitating','levitation','hover','hovering'],
      part: 'spirit, and the danger of inflation',
      essence: 'flying is release from the weight of things — spirit unfastened from the daily. but Jung kept a caution folded into every flight: flown too high it becomes the dream of inflation, the one Icarus had. the reading turns on one point — whether the flight carries meaning, or only escapes it.',
      amplify: 'the shaman\'s flight and the ascetic\'s levitation are the same archetype with different receipts.',
      questions: [
        'what would you be able to see from up there that you cannot see from the ground — and is it true?',
        'did the flying feel earned, or stolen? the psyche keeps ledgers.'
      ],
      cite: 'jung-cw9i'
    },
    {
      id: 'teeth',
      name: 'the teeth',
      match: ['teeth','tooth','dentist','molars'],
      part: 'power, and its loss',
      essence: 'teeth coming loose is among the oldest dream reports on record — Artemidorus wrote of it, and Freud collected it again. it marks a loss of force: the power of the word, the bite, the boundary. the body\'s structure loosening where the day has been too polite.',
      amplify: 'in the classical catalogues it attended words spoken too late or power surrendered without a fight.',
      questions: [
        'what did you not say, in the day the dream is answering?',
        'where does your force go when you are not looking at it?'
      ],
      cite: 'freud-1900'
    },
    {
      id: 'death',
      name: 'death and the corpse',
      match: ['death','died','dying','dead','corpse','funeral','grave','coffin','buried','bury'],
      part: 'transformation',
      essence: 'in the old reading, death dreams almost never predict death; they announce the end of an attitude, a season of the psyche closing. the alchemists called the first stage of the work the nigredo — the blackening — and insisted it came before the colour returned. the dream speaks in the language of the body and of myth, not of the newspaper.',
      amplify: 'funerals in dreams gather witnesses: who attends your ending says who expects to meet what comes next.',
      questions: [
        'what has already ended in your waking life, that you are still hosting?',
        'if this is a season closing rather than a life — what season?'
      ],
      cite: 'von-franz-1980',
      numinous: true
    },
    {
      id: 'child',
      name: 'the child',
      match: ['baby','babies','birth','born','child','children','infant','newborn','toddler'],
      part: 'the divine child',
      essence: 'the child in the dream is a new potential — fragile, whole, and older than its size. Jung\'s child archetype is the beginning that carries its own wholeness: something in you arriving that will need guardianship, and that does not need to be explained to be real.',
      amplify: 'the golden child of the alchemists, the winter-born king of the tales: small, and not weak.',
      questions: [
        'what have you begun that you are measuring by the wrong age?',
        'who is assigned to guard it — and is that person you?'
      ],
      cite: 'jung-cw9i',
      numinous: true
    },
    {
      id: 'anima',
      name: 'the unknown figure of the other',
      match: ['lover','bride','bridegroom','husband','wife','mysterious woman','mysterious man','stranger woman','stranger man','kiss','embrace'],
      part: 'the contra-sexual other',
      essence: 'the unknown woman or man who appears, guides, argues or seduces is what Jung called the anima or animus — the inner figure of the other in you. in men\'s dreams she carries relatedness and the life of feeling; in women\'s dreams he carries spirit, meaning, and often arrives as a crowd of opinions. they are first met in projection, dressed as someone else.',
      amplify: 'the bride won in the fairy tale and the stranger who gives the sword are the same figure with the mask on and off.',
      questions: [
        'what quality does this figure have that your days do not make room for?',
        'who did you first mistake them for? the projection is the address.'
      ],
      cite: 'jung-cw9ii'
    },
    {
      id: 'wise',
      name: 'the wise old figure',
      match: ['teacher','grandfather','grandmother','guide','doctor','guru','master','sage','professor','priest','monk','therapist'],
      part: 'the archetype of meaning',
      essence: 'the one who knows arrives when the dreamer\'s own knowledge is not enough: the teacher, the grandfather, the doctor in the white coat. Jung read this figure as spirit wearing a face you would obey. his counsel in the dream is worth writing down exactly. his authority is worth questioning exactly as much.',
      amplify: 'Merlin, Chiron, the hermit of every deck of cards: the figure of meaning who cannot do the work for you.',
      questions: [
        'what did the figure say, word for word? write it without paraphrase.',
        'where in your waking life are you asking others to know what only you can know?'
      ],
      cite: 'jung-cw9i',
      numinous: true
    },
    {
      id: 'mirror',
      name: 'the mirror',
      match: ['mirror','mirrors','reflection','looking glass'],
      part: 'self-confrontation',
      essence: 'what the mirror shows is never the persona\'s face — the social face is exactly what mirrors refuse. Narcissus drowned mistaking a reflection for a world; the dream mirror asks less. it stages the meeting of the seen and the seeing: the one who looks, and the one who is looked at, in the same frame.',
      amplify: 'in the tales, the mirror that lies and the mirror that tells too much are usually the same mirror, carried by different hands.',
      questions: [
        'in the dream, did you look? not looking is also a finding.',
        'who were you before the reflection arranged itself?'
      ],
      cite: 'jung-cw9i'
    },
    {
      id: 'naked',
      name: 'nakedness',
      match: ['naked','nude','undressed','no clothes','clothesless','exposed'],
      part: 'the persona stripped',
      essence: 'the social mask left in another room. the shame in the dream is the persona defending itself, and it is not the point. Jung read the exposure as the truth the role was covering: the dream stages what remains when the uniform is off — and it is usually less frightening than the fear of it.',
      amplify: 'the emperor\'s new clothes is the persona dream told as a joke with casualties.',
      questions: [
        'which role were you wearing when it was taken?',
        'who was watching, and whose opinion were they carrying?'
      ],
      cite: 'jung-cw9i'
    },
    {
      id: 'fire',
      name: 'fire',
      match: ['fire','flame','flames','burning','burn','burned','smoke','ash','ashes','ember'],
      part: 'transformation',
      essence: 'the alchemists\' first operation — calcinatio — was burning, and they insisted the fire separates rather than destroys: what burns was never the material. fire in a dream is passion and purification in one report. what is ash was already finished; the heat itself is the reading.',
      amplify: 'the phoenix is the fire dream told with an exit; the salamander, told with residence.',
      questions: [
        'what was burned — and what, when you look again, was left untouched in the ashes?',
        'is this fire the kind you light, or the kind you are walked through?'
      ],
      cite: 'von-franz-1980'
    },
    {
      id: 'forest',
      name: 'the forest',
      match: ['forest','forests','woods','tree','trees','jungle','grove','thicket'],
      part: 'the unmapped unconscious',
      essence: 'wandering among trees is wandering off the ego\'s map. in the tales the forest is precisely where the transformation happens: children are abandoned there, knights are lost there, and what is sought is only ever found there. the density of the trees measures how far from the known you have agreed to go.',
      amplify: 'Dante opens in a dark wood because the lost always do, in the grammar of the psyche.',
      questions: [
        'did you enter the forest on purpose? that changes the genre of the story.',
        'what did you go in looking for, in the waking life the dream answers?'
      ],
      cite: 'von-franz-1974'
    },
    {
      id: 'mountain',
      name: 'the mountain',
      match: ['mountain','mountains','climbing','climb','climbed','summit','peak','hill','ascent'],
      part: 'ascent, and the goal',
      essence: 'the climb is toward consciousness and the long view; the summit, in Jung\'s reading, is the Self\'s goal — the height from which the whole shape of a life is momentarily visible. the effort of the ascent is part of the symbol: the view is priced in breath.',
      amplify: 'every tradition that holy places sit on mountains says the same thing in the same direction.',
      questions: [
        'were you climbing toward something, or away from something? the same slope, different dreams.',
        'how far up were you when the dream ended?'
      ],
      cite: 'jung-cw9i',
      numinous: true
    },
    {
      id: 'door',
      name: 'the door and the key',
      match: ['door','doors','threshold','key','keys','locked','lock','gate','doorway','doorbell'],
      part: 'the liminal',
      essence: 'a door is a decision with hinges. a locked door: what the ego is not yet ready to open — the dream is honest about readiness without being cruel. a key: the intentional act that unlocks, and the dream gives you the hand that holds it. thresholds in general are where the psyche does its negotiating.',
      amplify: 'Janus, the two-faced doorkeeper, looked outward and inward at once — that is the whole job description.',
      questions: [
        'which door in the dream did you not open? describe what you think is behind it.',
        'where did the key come from? whoever gave it to you matters.'
      ],
      cite: 'von-franz-1964'
    },
    {
      id: 'bridge',
      name: 'the bridge',
      match: ['bridge','bridges','crossing','crossed','crossroads'],
      part: 'the crossing',
      essence: 'the bridge joins two banks that the water insists on separating: conscious and unconscious, who you were and who is being made. the state of the bridge is the report — sturdy, swaying, unfinished, half-built. crossings in dreams are read as crossings in the life.',
      amplify: 'the rainbow bridge of the old mythologies: passage granted, but one way at a time.',
      questions: [
        'which two banks is this bridge joining — name each side in one word.',
        'were you crossing, standing on it, or watching it from the shore?'
      ],
      cite: 'von-franz-1964'
    },
    {
      id: 'vehicle',
      name: 'the vehicle out of control',
      match: ['car','cars','driving','drove','train','bus','brakes','steering','wheel','truck','motorcycle','crash','crashed'],
      part: 'energy, and who holds it',
      essence: 'von Franz\'s classic reading: the car is the ego\'s drive through a life. brakes failing, no one at the wheel, the road bending out of sight — the drive is being driven. the question the dream asks is not whether you are moving; you are. it is who, precisely, is steering.',
      amplify: 'the runaway horses of Plato\'s chariot are the same dream told as philosophy with a harness.',
      questions: [
        'in the dream, where were you sitting — driver\'s seat, passenger, or the back?',
        'what in your waking life has momentum that your hands have quietly left?'
      ],
      cite: 'von-franz-1964'
    },
    {
      id: 'exam',
      name: 'the unprepared exam',
      match: ['exam','exams','test','school','classroom','unprepared','homework','assignment','final'],
      part: 'the Self\'s evaluation',
      essence: 'the desk you arrive at without having studied is the psyche\'s own audit. it is not about the school. it asks: where in the waking life are you acting without your own knowledge, presenting what you have not learned. the exam is set by the part of you that knows the syllabus.',
      amplify: 'the orphan who cannot answer the three questions is a figure older than classrooms.',
      questions: [
        'which subject was the exam in? the psyche is rarely subtle.',
        'who else was in the room? fellow examinees are fellow claims on honesty.'
      ],
      cite: 'von-franz-1964'
    },
    {
      id: 'bird',
      name: 'the bird',
      match: ['bird','birds','raven','crow','dove','eagle','owl','sparrow','flock','wings','feathers'],
      part: 'spirit, and thought in flight',
      essence: 'the bird carries spirit and intuition — thought that has left the weight of the sentence. in the alchemical shelves the raven is the shadow\'s own messenger, arriving first at the dark work; the dove arrives at reconciliations. the species is the reading; the flock is the mood of the whole sky.',
      amplify: 'the dove of the flood and the ravens of Odin divide the same air between them.',
      questions: [
        'which bird was it, exactly? write the species before the feeling.',
        'did it come to you, or did you follow it?'
      ],
      cite: 'jung-alchemy-1968'
    },
    {
      id: 'fish',
      name: 'the fish',
      match: ['fish','fishing','aquarium','whale','dolphin','shark'],
      part: 'contents of the deep',
      essence: 'fish live where the dreamer cannot breathe, and surface anyway: contents of the unconscious arriving on their own schedule. to catch one is to make conscious what was swimming below; to watch one is to concede it knows these waters better than you do. the size of the fish is the size of what surfaced.',
      amplify: 'in the early centuries the fish was the secret name of the inner Christ — the deepest thing, swimming in everyone.',
      questions: [
        'did the fish come out of the water, or did you go in after it?',
        'what has been surfacing lately that you keep returning to the water?'
      ],
      cite: 'jung-cw9ii'
    },
    {
      id: 'gold',
      name: 'the treasure',
      match: ['gold','treasure','coins','jewels','diamond','jewelry','pearl','emerald'],
      part: 'the Self',
      essence: 'the treasure hard to attain is the Self hidden in the raw material of a life — the alchemists\' gold, which they insisted was not common gold, buried in the base earth of the ordinary. dreams of finding treasure report that something of real value has been located in what the waking life calls dirt.',
      amplify: 'the kingdom buried in the field, the pearl in the mud, the philosopher\'s stone in the dung heap: the same map at every scale.',
      questions: [
        'where exactly was the treasure found? the undignified location is the teaching.',
        'what did you do with it in the dream — keep it, share it, doubt it?'
      ],
      cite: 'von-franz-1980',
      numinous: true
    },
    {
      id: 'ring',
      name: 'the ring and the wedding',
      match: ['ring','rings','wedding','marriage','marry','engaged','engagement','vows'],
      part: 'the union of opposites',
      essence: 'the alchemists\' coniunctio — the wedding of opposites that could not previously hold each other: duty and desire, the mask and the face. a ring is a bond drawn without endpoints. the dream stages which opposites in you are being asked, finally, to hold together.',
      amplify: 'the alchemical wedding, the sacred marriage of every mythology: the opposites do not merge; they hold.',
      questions: [
        'which two things in you does this wedding join? name them plainly.',
        'in the dream, did you consent? reluctance is data.'
      ],
      cite: 'jung-alchemy-1968',
      numinous: true
    },
    {
      id: 'clock',
      name: 'the clock',
      match: ['clock','clocks','time','late','watch','hourglass','ticking','deadline','midnight'],
      part: 'kairos — the right time',
      essence: 'the ticking asks what season this is. the dream\'s time is not the train\'s time; it is kairos, the ripe moment, as the stalker\'s essays put it — the moment that cannot be summoned, only attended. a dream of being late is the psyche\'s schedule objecting to the waking one.',
      amplify: 'the Greek keeper of seasons had two words for time: the counted one, and the ripe one. dreams only use the second.',
      questions: [
        'late for what, exactly? the destination is the real appointment.',
        'what in your life is ripening while you count hours instead?'
      ],
      cite: 'insinq-2021-stalking'
    },
    {
      id: 'labyrinth',
      name: 'the labyrinth',
      match: ['labyrinth','labyrinths','maze','mazes','lost','corridor','endless','cant find','can\'t find'],
      part: 'circling the centre',
      essence: 'the labyrinth looks like punishment and functions as a method: the winding path that still has a middle. Jung read the walk to the centre — any centre, a room, a person, the Self — as the individuation way, and getting lost as part of the map rather than a failure of it. the maze dreams of being lost are tours.',
      amplify: 'Theseus brought a thread; the thread was not courage, it was method — the dream provides its own if you look.',
      questions: [
        'were you looking for the centre, or for the exit? they are different pilgrimages.',
        'what in the dream kept repeating? the repeat is the thread.'
      ],
      cite: 'jung-alchemy-1968',
      numinous: true
    },
    {
      id: 'moon',
      name: 'the moon',
      match: ['moon','moonlight','lunar','full moon','stars','night sky','eclipse'],
      part: 'the night-side',
      essence: 'the moon\'s light is the sun\'s, remembered — consciousness by reflection rather than by force. it governs the night-side of the psyche: the tide, the feminine, the slow gold of what can only be seen when you stop shining at it. a dream moon asks for vision by borrowed light, which is another name for reflection.',
      amplify: 'the virgin in the white city, the hare in the face: the moon collects projections the way water collects the sky.',
      questions: [
        'was the moon full, new, or in between? the phase is the reading.',
        'what can you only see now, by reflection, that daylight would have drowned out?'
      ],
      cite: 'jung-cw9i',
      numinous: true
    },
    {
      id: 'stairs',
      name: 'the stairs',
      match: ['stairs','staircase','escalator','ladder','ramp','spiral stairs'],
      part: 'the vertical way',
      essence: 'stairs are the psyche\'s vertical grammar: ascent toward integration and the higher view, descent toward the shadow and the prima materia. endless or broken stairs report on the inner structure itself — whether the way up holds, and whether the way down can be borne.',
      amplify: 'jacob\'s ladder, dante\'s mountain: every ascent is priced in breath, every descent in courage.',
      questions: [
        'were you climbing or descending? the direction is the diagnosis.',
        'what broke underfoot, if anything — and where in the waking life does the structure feel the same?'
      ],
      cite: 'von-franz-1964'
    },
    {
      id: 'tunnel',
      name: 'the tunnel',
      match: ['tunnel','tunnels','subway','underpass','light at the end'],
      part: 'compression, and the way through',
      essence: 'a tunnel is the via regia under compression: grief, depression, deep introversion — the psyche moving forward while the walls stay close. a light at the end is hope with a shape; no light means the work is still in the black earth.',
      amplify: 'plato\'s cave, the rabbit hole: the way out is through, and the walls remember every step.',
      questions: [
        'was there light at the end? describe it exactly — colour, distance, steadiness.',
        'what tunnel in the waking life are you inside, and what would the exit require you to leave behind?'
      ],
      cite: 'jung-cw8'
    },
    {
      id: 'wall',
      name: 'the wall',
      match: ['wall','walls','fence','rampart','hedge','barrier'],
      part: 'the boundary',
      essence: 'a wall is the ego\'s boundary drawn large: protection or prison, often both. stone walls are old rigid defences; climbing is courage, breaking is force, finding the gate is the legitimate passage the dream is pointing to.',
      amplify: 'jericho\'s walls, hadrian\'s: every standing boundary stands for a reason worth naming.',
      questions: [
        'did you climb it, break it, or look for the gate? the method is the message.',
        'what was the wall made of — and who built it first?'
      ],
      cite: 'von-franz-1974'
    },
    {
      id: 'crossroads',
      name: 'the crossroads',
      match: ['crossroads','intersection','junction','fork','signpost'],
      part: 'the point of choice',
      essence: 'where the paths converge the psyche must choose which aspect to develop. four ways is the quaternity asking for orientation; hesitation is data, not failure. the signpost, if any, is worth copying down word for word.',
      amplify: 'hecate keeps the crossroads: every choice there is witnessed, and every witness remembers.',
      questions: [
        'which way did you take — and which ways did you refuse?',
        'what literal crossroads in the waking life does this one stand for?'
      ],
      cite: 'jung-alchemy-1968'
    },
    {
      id: 'border',
      name: 'the border',
      match: ['border','frontier','edge','cliff','shoreline','boundary'],
      part: 'the edge of the known',
      essence: 'the border is where the mapped psyche ends: what you leave behind, what you carry across. cliffs and shorelines are the same report told in different weather — the unknown on one side, the last chance on the other.',
      amplify: 'the styx was a border before it was a river: every crossing pays its coin.',
      questions: [
        'what did you carry across — and what did you have to leave at the line?',
        'was the far side inviting or forbidden? both are findings.'
      ],
      cite: 'von-franz-1964'
    },
    {
      id: 'mandala',
      name: 'the mandala',
      match: ['mandala','circle','wheel','spiral','cosmic egg','globe','symmetry'],
      part: 'the Self, drawn',
      essence: 'the circle that holds its centre is the oldest picture of the whole: the Self as totality, the ego resting rather than ruling. complete and steady means integration gathering; broken or spinning means the centre is sought but not yet held.',
      amplify: 'the philosopher\'s stone was drawn round because wholeness has no corners.',
      questions: [
        'was the circle complete? what sat at its exact centre?',
        'what in the waking life is asking to be held together rather than solved?'
      ],
      cite: 'jung-cw9i',
      numinous: true
    },
    {
      id: 'king',
      name: 'the king',
      match: ['king','queen','emperor','monarch','sovereign','throne'],
      part: 'the ruling principle',
      essence: 'the crowned figure is the psyche\'s government: wise rule means a good relation to inner authority; tyranny means the ego or the superego has taken the throne by force. an aging or dying king announces that a stage of rule is ending.',
      amplify: 'arthur, solomon, the fisher king: the wound of the ruler is the wound of the realm.',
      questions: [
        'did the ruler govern justly or tyrannically? the realm answers in the same tone.',
        'whose authority in the waking life wears this crown?'
      ],
      cite: 'jung-cw9ii'
    },
    {
      id: 'star',
      name: 'the star',
      match: ['star','stars','sun','planet','comet','aurora','constellation'],
      part: 'the guiding light',
      essence: 'what shines at a distance guides: the sun for the active day, the star for the distant promise, the comet for what arrives unannounced. an eclipse is orientation briefly lost — the light is not gone, only covered.',
      amplify: 'the star of bethlehem, venus at dawn: every tradition sets its hope where the hands cannot reach.',
      questions: [
        'which light was it — sun, star, or comet? each keeps different hours.',
        'what wish did you first hang on it? the psyche keeps receipts.'
      ],
      cite: 'jung-cw9i',
      numinous: true
    },
    {
      id: 'tree',
      name: 'the tree',
      match: ['tree','trees','oak','ash','yew','bonsai','roots','branches'],
      part: 'the axis',
      essence: 'roots in the underworld, crown in the sky: the tree joins what the ego keeps apart. roots are the unconscious foundations, the trunk the bearing ego, the branches the higher reach. fruit, season, and whether it stands or is felled — all of it is report.',
      amplify: 'yggdrasil, the bodhi tree: every axis has stood where you stand.',
      questions: [
        'were you at the roots, the trunk, or the branches? the station is the state.',
        'what season was the tree in — and what season are you in?'
      ],
      cite: 'von-franz-1974'
    },
    {
      id: 'garden',
      name: 'the garden',
      match: ['garden','orchard','paradise','greenhouse','harvest','planted'],
      part: 'the cultivated psyche',
      essence: 'what grows here is tended or neglected by your own hand: planted rows are intentions kept, overgrowth is what was left to seed itself, fallow ground is rest rather than failure. the gardener, if any appears, is worth questioning.',
      amplify: 'eden, the hanging gardens, the philosophers\' garden: paradise was always a kept place.',
      questions: [
        'what was planted, what was harvested, and what lay fallow?',
        'who tends this garden when you are not looking?'
      ],
      cite: 'von-franz-1980'
    },
    {
      id: 'monster',
      name: 'the monster',
      match: ['monster','beast','demon','ogre','troll','dragon','werewolf','chimera'],
      part: 'unintegrated instinct',
      essence: 'what frightens in the dream is energy not yet owned: the wolf\'s aggression, the snake\'s cunning, the dragon\'s hoarded power. the shape names the repressed nature; the hunger names what it has been denied.',
      amplify: 'leviathan, the minotaur, the gorgon: every monster is a guardian with the mask on.',
      questions: [
        'what kind of beast was it — and what does that kind hunger for?',
        'what happened when you stopped running? the pursuit ends at the turning.'
      ],
      cite: 'von-franz-1974'
    },
    {
      id: 'darkness',
      name: 'the darkness',
      match: ['darkness','night','blackout','void','abyss','pitch black'],
      part: 'the unknown region',
      essence: 'the dark is the psyche unlit: comfort there means trust in the unconscious, terror means resistance to it. an eclipse or blackout is orientation withdrawn for a season — the map is not wrong, only unreadable by this light.',
      amplify: 'the duat, the night before creation: darkness is the first matter, not the last word.',
      questions: [
        'were you afraid, or at home? the feeling is the finding.',
        'what moved in the dark that the light would have scattered?'
      ],
      cite: 'jung-cw8'
    },
    {
      id: 'wound',
      name: 'the wound',
      match: ['wound','injury','scar','cut','burn','bruise','fracture'],
      part: 'where it still hurts',
      essence: 'the marked place is where earlier weather left its signature: fresh means current suffering, old means healed but tender. the location is the ledger — which function of the psyche took the blow, and which still guards it.',
      amplify: 'the fisher king\'s wound, achilles\' heel: the realm limps where the ruler bleeds.',
      questions: [
        'was the wound fresh or scarred? who dressed it, if anyone?',
        'what story does the scar still tell when it is touched?'
      ],
      cite: 'anna-freud-1936'
    },
    {
      id: 'filth',
      name: 'filth and ruins',
      match: ['filth','waste','excrement','mud','garbage','compost','sludge','ruins'],
      part: 'the abject, composting',
      essence: 'what the ego calls not-me often holds the seed of the next life: compost is decay with a future, ruins are structures whose clearing is overdue. disgust is the persona defending itself; the dream asks what value lies under the refusal.',
      amplify: 'khepri rolled the sun in dung; the phoenix kept its address in the ash.',
      questions: [
        'what did you refuse to touch — and what might it become if tended?',
        'which ruin in the waking life is ready to be cleared?'
      ],
      cite: 'von-franz-1980'
    },
    {
      id: 'corpse',
      name: 'the corpse',
      match: ['corpse','skeleton','remains','mummy','ashes','carcass'],
      part: 'what has died and waits',
      essence: 'the dead body is an ended form awaiting its rites: an old identity, a belief, a bond still carried unburied. found in the house, it is something you still host; mourned properly, it releases its strength back to the living.',
      amplify: 'osiris, dismembered and gathered: what is buried whole rises whole.',
      questions: [
        'whose body was it — and what of them still lives in you?',
        'what burial has been postponed, and what would it cost to hold it?'
      ],
      cite: 'von-franz-1980'
    },
    {
      id: 'seductress',
      name: 'the seducer',
      match: ['seductress','seducer','siren','temptress','temptation','femme fatale'],
      part: 'eros, pulling',
      essence: 'desire with a figure on it: the life-force pulling toward union with what is unknown in you. followed well it leads to integration; followed blindly it leads to inflation. the setting tells which — the chamber or the cliff.',
      amplify: 'the sirens, lilith, the serpent in the garden: every temptation is an invitation with the price in small print.',
      questions: [
        'what exactly tempted you — and what did it promise?',
        'where would following it lead: the chamber, or the cliff?'
      ],
      cite: 'jung-cw9ii'
    },
    {
      id: 'wisewoman',
      name: 'the wise woman',
      match: ['wise woman','crone','healer','witch','sorceress','muse'],
      part: 'sophia, guiding',
      essence: 'she arrives when insight is needed and intellect is not enough: intuitive, earthy, stern or kind according to how you meet your own knowing. her counsel is worth writing down verbatim; her sternness is worth obeying twice.',
      amplify: 'hecate, the sibyl, the oracle: the old woman at the crossroads has seen your road before.',
      questions: [
        'what did she say, word for word? write it without paraphrase.',
        'was she kind or stern — and which do you deserve right now?'
      ],
      cite: 'von-franz-1964',
      numinous: true
    },
    {
      id: 'warrior',
      name: 'the warrior',
      match: ['warrior','soldier','knight','hunter','protector','guardian'],
      part: 'logos, ordering',
      essence: 'the armed figure is the ordering principle: boundaries kept, judgments rendered, work built. upright he is protection and craft; inflated he is tyranny with a straight back. his weapon names his function.',
      amplify: 'marduk, athena: the sword divides so that the field can be sown.',
      questions: [
        'did he guard, judge, or build? each is a different office.',
        'where in the waking life are his boundaries needed — and where are they too high?'
      ],
      cite: 'jung-cw9ii'
    },
    {
      id: 'androgynous',
      name: 'the androgyne',
      match: ['androgynous','hermaphrodite','both genders','genderless','twin'],
      part: 'the union, foreshown',
      essence: 'the figure both and neither is the goal wearing a face: conscious and unconscious, masculine and feminine, held without merging. discomfort reports rigid roles; attraction reports readiness to integrate.',
      amplify: 'the rebis, ardhanarishvara: the end of the work has always had two faces and one heart.',
      questions: [
        'were you drawn or disturbed? the feeling measures the distance.',
        'what two opposites in you does this figure join?'
      ],
      cite: 'jung-alchemy-1968',
      numinous: true
    },
    {
      id: 'mother',
      name: 'the mother',
      match: ['mother','mama','maternal','womb','nurture'],
      part: 'the container',
      essence: 'the mother is the first vessel: source, shelter, and the devouring depth in one figure. nurturing means a good relation to the emotional ground; smothering or absent means the ground itself needs tending. she gives, and she withholds, and both are curriculum.',
      amplify: 'demeter, isis, cybele: the great mother feeds and buries with the same hands.',
      questions: [
        'did she feed or swallow? the difference is the diagnosis.',
        'what did your own mother give that you still live on — and what did she withhold that you still seek?'
      ],
      cite: 'jung-cw9i'
    },
    {
      id: 'father',
      name: 'the father',
      match: ['father','papa','paternal','patriarch'],
      part: 'the ordering law',
      essence: 'the father is the limit-setter and identity-giver: wise means confidence under a just law; tyrannical means guilt under a harsh one; absent means the inner compass is still being built by hand.',
      amplify: 'zeus, odin, the lawgiver: every blessing and every demand descends from the same height.',
      questions: [
        'did he bless or judge? the tone is the teaching.',
        'what law of his do you still obey — and which have you outgrown?'
      ],
      cite: 'jung-cw9i'
    },
    {
      id: 'cave',
      name: 'the cave',
      match: ['cave','cavern','grotto','hollow','crypt'],
      part: 'the matrix',
      essence: 'the enclosed dark is gestation or burial according to how you entered it: sought for shelter it is the womb of renewal; fallen into it is the tomb of what was avoided. what waits inside has been waiting for you specifically.',
      amplify: 'the sibyl\'s cave, demeter\'s hollow: every descent brings back either a child or a name.',
      questions: [
        'did you enter willingly? willingness divides the womb from the tomb.',
        'what gestated in the dark that is ready to be carried out?'
      ],
      cite: 'von-franz-1980'
    },
    {
      id: 'river',
      name: 'the river',
      match: ['stream','brook','canal','current','riverbank'],
      part: 'the flow',
      essence: 'the running water is the psyche in motion: clear means emotional clarity, muddy means stirred depths, fast means rapid change, slow means stagnation. crossing is a life transition; falling in is immersion before you chose it.',
      amplify: 'lethe, styx, jordan, ganges: every river forgets, binds, washes, or feeds.',
      questions: [
        'were you crossing, floating, or pulled under? the posture is the position.',
        'what in the waking life is currently in flood, and what in drought?'
      ],
      cite: 'von-franz-1964'
    },
    {
      id: 'resurrection',
      name: 'the return',
      match: ['resurrection','resurrected','rising from the dead','reborn','phoenix rising','second birth'],
      part: 'renewal after ending',
      essence: 'what returns has passed through death and kept its shape: an integrated part reclaimed, a season reopened at a higher turn. if you rise, you have taken back what was buried; if another rises, you witness a transformation you did not author.',
      amplify: 'the risen god, the phoenix, the hero home: every return pays the grave its due first.',
      questions: [
        'what had to die for this return to be possible?',
        'what of the old form was kept — and what was rightly left below?'
      ],
      cite: 'von-franz-1980',
      numinous: true
    },
    {
      id: 'cocoon',
      name: 'the cocoon',
      match: ['cocoon','chrysalis','pupa','egg','gestation','incubation'],
      part: 'what waits to hatch',
      essence: 'the sealed vessel holds potential on its own schedule: breaking out early harms what is forming, waiting past ripeness rots it. the condition of the shell reports on the environment around your becoming.',
      amplify: 'the cosmic egg, the alchemical egg: everything winged was once wrapped.',
      questions: [
        'was the shell intact, cracking, or broken open too soon?',
        'what in you is gestating — and what does it need while it forms?'
      ],
      cite: 'jung-alchemy-1968'
    },
    {
      id: 'phoenix',
      name: 'the phoenix',
      match: ['phoenix','firebird','rising from ashes','rebirth from fire'],
      part: 'fire that renews',
      essence: 'total renewal through total burning: the dream arrives after devastating loss to report that the fire is purifying rather than merely destroying. what burned was finished; what rises is not the old thing repaired.',
      amplify: 'the egyptian bennu, the chinese fenghuang: the sun itself rehearses this every dawn.',
      questions: [
        'what exactly burned — and what stood untouched in the ash?',
        'are you still in the fire, or already on the wing?'
      ],
      cite: 'von-franz-1980',
      numinous: true
    },
    {
      id: 'trickster',
      name: 'the trickster',
      match: ['trickster','fool','jester','clown','loki','coyote'],
      part: 'the pattern-breaker',
      essence: 'the boundary-crosser arrives when the psyche has grown too rigid or too solemn: mercurius overturning the table so the game can restart. foolishness here is method — absurdity carrying the exact message seriousness refused.',
      amplify: 'hermes, monkey king, the tarot fool at the cliff\'s edge: every order needs its disorder.',
      questions: [
        'what solemn rule did the fool break — and what fresher air came in?',
        'where in the waking life have you mistaken gravity for depth?'
      ],
      cite: 'jung-cw9ii'
    },
    {
      id: 'angel',
      name: 'the angel',
      match: ['angel','archangel','guardian angel','spirit guide','light being'],
      part: 'the numinous messenger',
      essence: 'a figure of light at crisis or crossing carries comfort or direction from the collective floor: transcendent, awesome, never merely informational. its message is symbolic and repayable only by attention, not obedience.',
      amplify: 'the annunciation, the guardian at the gate: messengers arrive when the house cannot send its own.',
      questions: [
        'what was its exact message — and what did its presence feel like in the body?',
        'what crisis in the waking life called for a voice from further off?'
      ],
      cite: 'jung-cw9i',
      numinous: true
    },
    {
      id: 'air',
      name: 'the air',
      match: ['wind','storm','breeze','tornado','hurricane','gale','breath of wind'],
      part: 'spirit in motion',
      essence: 'moving air is thought and spirit made weather: a breeze is inspiration arriving, a storm is mental turmoil, a whirlwind is unconscious forces circling. lifted means insight; scattered means the centre is not holding.',
      amplify: 'pneuma, the breath of god, thor\'s weather: the sky speaks in gusts.',
      questions: [
        'was it breeze or tempest? the force is the feeling.',
        'what did it carry away — and what did it leave behind?'
      ],
      cite: 'jung-cw8'
    },
    {
      id: 'earth',
      name: 'the earth',
      match: ['earth','soil','mud','clay','rock','ground','sand'],
      part: 'the ground',
      essence: 'the solid is the practical and bodily side given its due: fertile soil is capacity, barren is depletion, buried is the call to ground. a quake is the foundation renegotiated without your permission.',
      amplify: 'gaia, the salt of the alchemists: everything built stands on something unbuilt.',
      questions: [
        'was the ground fertile, barren, or breaking? the state is the statement.',
        'where in the waking life do your feet actually stand?'
      ],
      cite: 'von-franz-1980'
    },
    {
      id: 'sky',
      name: 'the sky',
      match: ['sky','heavens','firmament','outer space','open sky'],
      part: 'the high view',
      essence: 'the open above is aspiration and overview: looking up is the wish to see further, flying is liberation rehearsed, cloud is confusion between you and the view. clarity up there reports clarity in here.',
      amplify: 'uranus, the celestial realm: the gods were set high so the eyes would lift.',
      questions: [
        'was it clear or clouded? the weather up there is the weather in here.',
        'what did you want from the height — escape, or perspective?'
      ],
      cite: 'jung-cw9i'
    },
    {
      id: 'wolf',
      name: 'the wolf',
      match: ['wolf','wolves','pack','lone wolf','werewolf'],
      part: 'instinct, bonded',
      essence: 'the pack hunter is loyalty and hunger in one pelt: the lone wolf reports independence or isolation, the pack reports belonging or conformity, the chase reports the shadow asking for its due. howling is the voice the day suppresses.',
      amplify: 'fenrir, the she-wolf of rome: every pack keeps the law of tooth and tongue.',
      questions: [
        'lone or pack? the number is the news.',
        'were you running with them, from them, or watching from the trees?'
      ],
      cite: 'von-franz-1974'
    },
    {
      id: 'horse',
      name: 'the horse',
      match: ['horse','stallion','mare','foal','wild horse','pegasus'],
      part: 'the drive',
      essence: 'the horse is libido with hooves: energy that carries you forward when ridden well and throws you when it is not. white is spirit in harness, dark is shadow under saddle, wild is power not yet bridled.',
      amplify: 'pegasus, sleipnir: the gods never walked when they could ride.',
      questions: [
        'were you riding, thrown, or watching it run? the seat is the state.',
        'what is carrying you right now — and does it know the way?'
      ],
      cite: 'jung-cw9i'
    },
    {
      id: 'cat',
      name: 'the cat',
      match: ['cat','kitten','tomcat','black cat'],
      part: 'the untamed intuitive',
      essence: 'the night-walking independent is intuition that answers to no schedule: approaching means the sensual inner life seeks company; aloof means it is waiting to be deserved. it moves between worlds and charges a toll of attention.',
      amplify: 'bastet, the witch\'s familiar, the cheshire grin: what vanishes leaves its smile as receipt.',
      questions: [
        'did it approach or withdraw? the distance is deliberate.',
        'what does your own night-side know that the day dismisses?'
      ],
      cite: 'von-franz-1974'
    },
    {
      id: 'dog',
      name: 'the dog',
      match: ['dog','puppy','hound','guard dog','stray dog'],
      part: 'the loyal instinct',
      essence: 'the companion at heel is instinct in service: friendly means the drives walk with you, vicious means they turn on the hand, lost means loyalty mislaid. at the gate of the underworld it is cerberus — the guardian who decides what passes.',
      amplify: 'cerberus, the hunter\'s hound: fidelity is a door with teeth.',
      questions: [
        'friend, guard, or stray? each keeps a different post.',
        'what have your instincts been trying to tell you that politeness overruled?'
      ],
      cite: 'von-franz-1974'
    },
    {
      id: 'book',
      name: 'the book',
      match: ['book','diary','letter','scroll','manuscript','library','grimoire'],
      part: 'the written message',
      essence: 'the bound words are counsel from further off: a letter is personal, a library is collective, a sealed book is knowledge not yet earned, a blank page is potential refusing to be rushed. reading in the dream is the work begun.',
      amplify: 'the book of the dead, the book of thoth: everything kept was once only spoken.',
      questions: [
        'was it open, sealed, or blank? the state is the sentence.',
        'what did it say — copy the line exactly, then ask who wrote it.'
      ],
      cite: 'jung-cw8'
    },
    {
      id: 'ouroboros',
      name: 'the ouroboros',
      match: ['ouroboros','serpent eating its tail','endless knot','circular snake'],
      part: 'the return that deepens',
      essence: 'the tail-eater is the work shown whole: beginning and end in one circle, the psyche containing its own origin. each return passes the same ground at greater depth — recurrence is not repetition when the circle is walked awake.',
      amplify: 'the egyptian world-serpent, the norse world-coil: eternity was drawn as hunger satisfied by itself.',
      questions: [
        'what cycle in the waking life keeps returning — and what deepens each time round?',
        'where on the circle do you stand right now: ending, beginning, or the hidden join?'
      ],
      cite: 'jung-alchemy-1968',
      numinous: true
    },
    {
      id: 'phone',
      name: 'the ringing phone',
      match: ['phone','telephone','computer','notification','text message','screen'],
      part: 'the mediated call',
      essence: 'the ringing device is the unconscious using the day\'s own instruments: an urgent call is what insists on being heard, a broken screen is processing failed, endless scrolling is the collective static drowning the signal.',
      amplify: 'the modern angel wears a ringtone: the message matters more than the medium.',
      questions: [
        'who called — and did you answer? unanswered calls keep calling.',
        'what signal in the noise is actually addressed to you?'
      ],
      cite: 'roesler-2020-dreaming'
    },
    {
      id: 'money',
      name: 'the coin',
      match: ['money','coin','wallet','wealth','debt','banknote'],
      part: 'psychic value',
      essence: 'currency is worth made countable: found means resources discovered, lost means self-worth mislaid, owed means an exchange left open. the amount and the metal report on what kind of value is in motion.',
      amplify: 'midas, the money-changers: everything touched turns — the question is into what.',
      questions: [
        'found, lost, or owed? the transaction is the truth.',
        'where in the waking life do you feel rich — and where counterfeit?'
      ],
      cite: 'von-franz-1980'
    }
  ],

  teaching: [
    {
      id: 'stalking-synchronicity',
      title: 'stalking synchronicity',
      body: 'there is an octave of order in nature that sits above what you are able to perceive, and it can be trained for. that is the claim of the discipline this folio teaches — synchronicity hunted on purpose, which its practitioners call stalking psynchronicity<button type="button" class="dreams-fn" data-cite="insinq-2021-stalking" aria-label="citation">†</button>.'
        + '<p class="dreams-lesson-head">the touch of meaning</p>'
        + 'the stalker\'s instrument is the body. frisson — the goosebump — is read as tactile feedback from the world: a signal that something in what you just experienced is not yet understood, and should be followed, not explained away. the touch of meaning arrives on the skin before the mind consents. pay it like a debt.'
        + '<p class="dreams-lesson-head">make less noise</p>'
        + 'the first discipline is quiet. the psyche generates noise — expectations, reactions, the commentary of preference — and the music of reality is quieter than that. mindfulness and the old concentration trainings exist for exactly this: to lower the noise floor until the signal can be heard. and a warning from the same source: do not stare at the phenomenon directly, and do not test it with scorn. the kairotic moment is shy; skepticism aimed at it throws off the rhythm of the whole sequence, and you will get exactly the dead world you demanded — the fairies withdraw from those who come to disprove them<button type="button" class="dreams-fn" data-cite="insinq-2021-stalking" aria-label="citation">†</button>.'
        + '<p class="dreams-lesson-head">the ten rules</p>'
        + '<ol class="dreams-rules">'
        + '<li>everything is a metaphor. the unconscious models the world through inherited prototypes — archetypes — and what arrives through that machinery arrives as metaphor. dream language is metaphorical because metaphor is the language of pre-conscious thought. treat events as metaphors and you will catch the embedded information; treat them longer and it stops feeling like a trick<button type="button" class="dreams-fn" data-cite="insinq-2021-tips" aria-label="citation">†</button>.</li>'
        + '<li>everything is connected. all things share being — that commonality is a connection, whether or not the eye can trace it. look for resonant links between contexts that have no obvious relation, and stop being surprised when they answer.</li>'
        + '<li>always look for the lesson. the signs point to what has not yet been integrated. experiences that repeat are lessons repeating; their signs repeat with them, and the more significant the lesson, the harder the signs insist.</li>'
        + '<li>as above, so below. the order of reality is fractal: the same laws guide the stars and the person. the microcosm mirrors the macrocosm; your emotional weather and the sky\'s are analogues, not puns.</li>'
        + '<li>language is magic is transformation. to name a thing is to take hold of it; to redescribe it is to break the box the first description built. the limits of your language are the limits of your world — and language can be reforged.</li>'
        + '<li>if it doesn\'t ring like a bell for everyone, it\'s not quite right. resonance is the test of an articulation. when a formulation rings true for every soul in the exchange, a crystallisation has occurred; keep those.</li>'
        + '<li>if you want to hear the music, you need to make less noise. the signal-noise problem, stated as etiquette. your reactions are the noise; the practice is turning the psyche down until the octave of order is audible.</li>'
        + '<li>pay attention to the omens — the repeating themes in life. the common tongue of an archetype is the omen: a metaphorical hint at what is coming. you will dismiss some real ones; the psyche remembers which.</li>'
        + '<li>around any resonant dialogue on synchronicity, the signs will precipitate. attention amplifies what it attends. an elevating conversation constellates its own subject — the discussed symbol appears before and after, in supposedly unrelated places. it rains meaning where two people are actually talking.</li>'
        + '<li>all things are possible to one who is willing to believe. the Tinkerbell principle: disbelief dims the phenomenon, belief feeds it. at minimum, suspend judgement the way you do at the cinema — the drama of reality deserves the same courtesy, and it is the precondition of learning anything new.</li>'
        + '</ol>'
        + '<p class="dreams-lesson-head">what it has to do with dreams</p>'
        + 'the dream journal is the stalker\'s log. a dream is a metaphor delivered at night, unguarded by the day\'s defences; recorded, it becomes a sign that can be watched for recurrence. record. attend. look for the lesson. the same octave of order that precipitates around resonant dialogue precipitates around a kept dream — but only for those keeping it. this room\'s castings read the I Ching on the same acausal logic<button type="button" class="dreams-fn" data-cite="jung-cw8" aria-label="citation">†</button>.',
      key: 'synchronicity · frisson · metaphor · omens · kairos · the tinkerbell principle'
    },
    {
      id: 'geography-of-the-unconscious',
      title: 'the geography of the unconscious',
      body: 'one historical map from depth psychology. it can be a useful metaphor for some readers, but it is not a map of every person or every dream.'
        + '<p class="dreams-lesson-head">the floors</p>'
        + 'in this tradition, <b>consciousness</b> and the <b>ego</b> name what a person can notice and direct. Jung also wrote about a <b>personal unconscious</b>, feeling-toned <b>complexes</b>, and a <b>collective unconscious</b><button type="button" class="dreams-fn" data-cite="jung-cw8" aria-label="citation">†</button>. These are concepts within a theory, not measurements of the reader.'
        + '<p class="dreams-lesson-head">the inhabitants</p>'
        + 'Jung used <b>persona</b>, <b>shadow</b>, <b>anima/animus</b>, and <b>Self</b> as symbolic concepts<button type="button" class="dreams-fn" data-cite="jung-cw9ii" aria-label="citation">†</button>. They are vocabulary for reflection; the Dream reader does not decide which, if any, describes you.'
        + '<p class="dreams-lesson-head">symbols, and what tends to carry them</p>'
        + 'These are examples of associations found in Jungian writing, not a universal symbol dictionary. The optional reader names the words it matched and offers a possible lens; the dreamer decides whether it fits<button type="button" class="dreams-fn" data-cite="jung-cw9i" aria-label="citation">†</button>.'
        + '<p class="dreams-lesson-head">how a dream is read — the method</p>'
        + '<ol class="dreams-rules">'
        + '<li><b>Compensation</b> is a Jungian hypothesis about how a dream may relate to waking attention, not a rule that every dream corrects the dreamer<button type="button" class="dreams-fn" data-cite="jung-cw9i" aria-label="citation">†</button>.</li>'
        + '<li><b>Context matters.</b> The same image can mean different things to different people; ask what it means to you before borrowing a historical association.</li>'
        + '<li><b>Amplification</b> compares an image with cultural and mythic parallels. Those parallels are prompts for curiosity, not evidence about your life<button type="button" class="dreams-fn" data-cite="von-franz-1964" aria-label="citation">†</button>.</li>'
        + '<li>Some writers distinguish memorable or “big” dreams, but this room does not classify a dream by keywords. You decide whether it feels significant to you<button type="button" class="dreams-fn" data-cite="von-franz-1964" aria-label="citation">†</button>.</li>'
        + '<li>Writing or imagining a conversation with a dream image can be a creative exercise. It is optional; the image does not speak for you<button type="button" class="dreams-fn" data-cite="jung-transcendent-1957" aria-label="citation">†</button>.</li>'
        + '</ol>'
        + '<p class="dreams-lesson-head">the defences, named</p>'
        + 'Anna Freud described several defence mechanisms; this vocabulary can help name a theory, but it cannot diagnose a person from a dream<button type="button" class="dreams-fn" data-cite="anna-freud-1936" aria-label="citation">†</button>. Contemporary research asks different questions and does not turn any single dream into a clinical finding<button type="button" class="dreams-fn" data-cite="roesler-2020-dreaming" aria-label="citation">†</button>.',
      key: 'ego · personal unconscious · collective unconscious · shadow · anima/animus · self · compensation · amplification · defences'
    }
  ]
};
