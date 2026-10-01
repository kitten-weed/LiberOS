// three-shared.js — small shared plumbing for every three.js room.
//
// The rooms ran their render loops unconditionally: on a hidden or occluded
// window some browsers keep firing rAF, so an unseen scene burned frames for
// nothing — and any room that only clocked elapsed time when visible woke to
// a t-jump on return. requestVisibleFrame skips dead frames outright: no
// work while hidden, no jump on return. The dt-clamped loops (lab, home)
// were already safe, but one door for every room costs less than explaining
// why two rooms differ.
//
// safeRenderer wraps WebGLRenderer construction so a machine without WebGL
// degrades to null — the DOM fallbacks each room already keeps — instead of
// unwinding the whole page script.
import * as THREE from '../vendor/three.module.js';

export function requestVisibleFrame(callback) {
  requestAnimationFrame(function (now) {
    if (!document.hidden) callback(now);
    else requestVisibleFrame(callback);
  });
}

export function safeRenderer(options) {
  try {
    return new THREE.WebGLRenderer(options);
  } catch (e) {
    return null;
  }
}
