// patachat.data.js — corrected prose register for the shared patachat.
// Keep triggers explicit and bounded. The engine owns weighting, crisis
// precedence, persistence, and placeholder rendering; this file owns copy.
// Source: liber-prose-corrections.md, reviewed Sweep 3 additions.
window.LIBER_PATACHAT = window.LIBER_PATACHAT || {};
window.LIBER_PATACHAT.regex = {
  buddy: [
    { re: /^tell me something about your day\??$/i, say: ['Tell me something about your day.'] },
    { re: /^what are you afraid to tell others\??$/i, say: ['What are you afraid to tell others?'] },
    { re: /^what is on your mind(?: right now| this exact moment)\??$/i, say: ['What is on your mind this exact moment?'] },
    { re: /^what is the shape\??$/i, say: ['What is the shape?'] },
    { re: /^what is calling to you right now\??$/i, say: ['An artifact represents a frozen narrative. What is calling to you right now?'] },
    { re: /^what did you need from others/i, say: ['What did you need from others that you can take for yourself?'] },
    { re: /^working can destroy your soul/i, say: ['Working can destroy your soul, what goes unfed when you are working?'] },
    { re: /^if you speak i will reflect/i, say: ['If you speak I will reflect what you say. You can draw your buddy, save artifacts, and bind them together.'] }
  ],
  vanir: [
    { re: /^share with me what burdens you/i, say: ['Share with me what burdens you, the water will take its shape.'] },
    { re: /^what does your work admit\??$/i, say: ['What does your work admit?'] },
    { re: /^answer why/i, say: ['Answer why, let me probe and sharpen.'] },
    { re: /^what is yours and what did you absorb from others\??$/i, say: ['What is yours and what did you absorb from others?'] },
    { re: /^why did you have to hide to be loved\??$/i, say: ['Why did you have to hide to be loved?'] },
    { re: /^you need shallow water/i, say: ['You need shallow water and sun, but you also need the deep.'] },
    { re: /^your name is just a thing about you/i, say: ['Your name is just a thing about you, what lays deeper?'] }
  ]
};
