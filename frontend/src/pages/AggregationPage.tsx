import { motion, useAnimation, type PanInfo } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";

const COMMIT_OFFSET = 110;
const COMMIT_VELOCITY = 600;
const EXIT_Y = 900;

export function AggregationPage() {
  const navigate = useNavigate();
  const controls = useAnimation();

  async function handleDragEnd(_: PointerEvent, info: PanInfo) {
    const { offset, velocity } = info;
    if (offset.y < -COMMIT_OFFSET || velocity.y < -COMMIT_VELOCITY) {
      await controls.start({ y: -EXIT_Y, opacity: 0, transition: { duration: 0.2 } });
      navigate("/");
      return;
    }
    await controls.start({
      y: 0,
      transition: { type: "spring", stiffness: 400, damping: 30 },
    });
  }

  return (
    <motion.main
      className="min-h-screen flex flex-col px-6 pt-16 pb-8"
      drag="y"
      dragConstraints={{ top: -200, bottom: 0 }}
      dragElastic={0.6}
      dragMomentum={false}
      animate={controls}
      onDragEnd={handleDragEnd}
    >
      <header className="mb-8">
        <Link to="/" className="text-sm text-slate-300 underline underline-offset-4">
          ← Back to swiping
        </Link>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-bold mb-2">Results</h1>
        <p className="text-slate-400">Aggregation lives here.</p>
        <p className="text-slate-600 text-xs mt-6">
          Coming next: sortable, searchable list of every pet and how everyone voted.
        </p>
      </div>
      <p className="text-slate-600 text-xs text-center pt-4">↑ Swipe up to return to the deck</p>
    </motion.main>
  );
}
