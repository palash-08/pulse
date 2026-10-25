import { type Transition } from "framer-motion";

export const motionTransitions = {
  springSnappy: {
    type: "spring",
    stiffness: 400,
    damping: 30,
  } as Transition,
  springSmooth: {
    type: "spring",
    stiffness: 260,
    damping: 20,
  } as Transition,
  springBouncy: {
    type: "spring",
    stiffness: 400,
    damping: 10,
  } as Transition,
  easeInOut: {
    duration: 0.2,
    ease: [0.4, 0, 0.2, 1],
  } as Transition,
};
