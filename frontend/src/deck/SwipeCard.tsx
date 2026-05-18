import {
  motion,
  useAnimation,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { type ReactNode } from "react";

export type SwipeDirection = "yes" | "no" | "agg";

type Props = {
  children: ReactNode;
  onCommit: (direction: SwipeDirection) => void;
  allowHorizontal?: boolean;
};

const COMMIT_OFFSET = 110;
const COMMIT_VELOCITY = 600;
const EXIT_X = 480;
const EXIT_Y = 760;

export function SwipeCard({ children, onCommit, allowHorizontal = true }: Props) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const controls = useAnimation();

  const yesOpacity = useTransform(x, [0, COMMIT_OFFSET], [0, 0.55]);
  const noOpacity = useTransform(x, [-COMMIT_OFFSET, 0], [0.55, 0]);
  const aggOpacity = useTransform(y, [0, COMMIT_OFFSET], [0, 0.5]);
  const rotateRange = allowHorizontal ? [-12, 0, 12] : [0, 0, 0];
  const rotate = useTransform(x, [-200, 0, 200], rotateRange);

  function decideDirection(info: PanInfo): SwipeDirection | null {
    const { offset, velocity } = info;
    if (allowHorizontal) {
      if (offset.x > COMMIT_OFFSET || velocity.x > COMMIT_VELOCITY) return "yes";
      if (offset.x < -COMMIT_OFFSET || velocity.x < -COMMIT_VELOCITY) return "no";
    }
    if (offset.y > COMMIT_OFFSET || velocity.y > COMMIT_VELOCITY) return "agg";
    return null;
  }

  async function handleDragEnd(_: PointerEvent, info: PanInfo) {
    const direction = decideDirection(info);
    if (direction === null) {
      await controls.start({
        x: 0,
        y: 0,
        transition: { type: "spring", stiffness: 400, damping: 30 },
      });
      return;
    }
    if (direction === "yes") {
      await controls.start({ x: EXIT_X, opacity: 0, transition: { duration: 0.25 } });
    } else if (direction === "no") {
      await controls.start({ x: -EXIT_X, opacity: 0, transition: { duration: 0.25 } });
    } else {
      await controls.start({ y: EXIT_Y, opacity: 0, transition: { duration: 0.25 } });
    }
    onCommit(direction);
  }

  return (
    <motion.div
      className="absolute inset-0 select-none touch-none cursor-grab active:cursor-grabbing"
      style={{ x, y, rotate }}
      animate={controls}
      drag={allowHorizontal ? true : "y"}
      dragElastic={0.6}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
    >
      <div className="absolute inset-0 rounded-3xl overflow-hidden">
        {children}
        {allowHorizontal && (
          <>
            <motion.div
              className="absolute inset-0 bg-yes pointer-events-none"
              style={{ opacity: yesOpacity }}
            />
            <motion.div
              className="absolute inset-0 bg-no pointer-events-none"
              style={{ opacity: noOpacity }}
            />
          </>
        )}
        <motion.div
          className="absolute inset-0 bg-sky-500 pointer-events-none"
          style={{ opacity: aggOpacity }}
        />
      </div>
    </motion.div>
  );
}
