import {
  o
} from "./chunk-JOQNI6T3.js";
import {
  b
} from "./chunk-M5EP6OWN.js";
import "./chunk-DYIZPHML.js";
import {
  s
} from "./chunk-Q7PV5YUG.js";
import "./chunk-UL2P3LPA.js";

// node_modules/@ionic/core/components/p-Cz5nLPGT.js
var e = (e2, s2, n, a, c) => {
  const i = e2.ownerDocument.defaultView;
  let p = o(e2);
  const m = (t) => p ? -t.deltaX : t.deltaX;
  return s({ el: e2, gestureName: "goback-swipe", gesturePriority: 101, threshold: 10, canStart: (t) => (p = o(e2), ((t2) => {
    const { startX: o2 } = t2;
    return p ? o2 >= i.innerWidth - 50 : o2 <= 50;
  })(t) && s2()), onStart: n, onMove: (t) => {
    const o2 = m(t);
    a(o2 / i.innerWidth);
  }, onEnd: (o2) => {
    const r = m(o2), e3 = i.innerWidth, s3 = r / e3, n2 = ((t) => p ? -t.velocityX : t.velocityX)(o2), a2 = n2 >= 0 && (n2 > 0.2 || r > e3 / 2), f = (a2 ? 1 - s3 : s3) * e3;
    let g = 0;
    if (f > 5) {
      const t = f / Math.abs(n2);
      g = Math.min(t, 540);
    }
    c(a2, s3 <= 0 ? 0.01 : b(0, s3, 0.9999), g);
  } });
};
export {
  e as createSwipeBackGesture
};
//# sourceMappingURL=p-Cz5nLPGT-EV4PMTP3.js.map
