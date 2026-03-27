// Shared Framer Motion animation variants

export const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export const pageTransition = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1, scale: 1,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
  exit: {
    opacity: 0, scale: 0.98,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

export const cardHover = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2, ease: 'easeOut' } },
};

export const shakeError = {
  shake: {
    x: [0, -8, 8, -5, 5, 0],
    transition: { duration: 0.4 },
  },
};

export const slideInFromTop = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

export const slideInFromRight = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, x: 40, transition: { duration: 0.2 } },
};

export const flipCard = {
  front: { rotateY: 0 },
  back: { rotateY: 180 },
};
