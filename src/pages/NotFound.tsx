import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Compass, Home } from "lucide-react";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="relative flex min-h-screen items-center justify-center px-4"
    >
      <div
        aria-hidden
        className="clay-blob fixed -top-24 left-1/4 size-72 bg-clay-blush/40"
      />
      <div className="clay relative w-full max-w-md p-8 text-center">
        <span className="clay-sm mx-auto flex size-14 items-center justify-center text-primary">
          <Compass className="size-6" />
        </span>
        <h1 className="font-display mt-4 text-4xl font-extrabold">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This reel isn't in the clay vault — the page may have been renamed or
          unpublished.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/home">
            <Button className="clay-press w-full rounded-full font-bold sm:w-auto">
              <Home className="mr-2 size-4" />
              Back to streaming
            </Button>
          </Link>
          <Link to="/">
            <Button
              variant="secondary"
              className="clay-sm w-full rounded-full font-bold sm:w-auto"
            >
              Landing page
            </Button>
          </Link>
        </div>
      </div>
    </motion.main>
  );
}
