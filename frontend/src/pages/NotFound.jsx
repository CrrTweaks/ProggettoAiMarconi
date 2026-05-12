import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="mx-auto grid size-20 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-glow">
          <Sparkles className="size-10 text-white" />
        </div>
        <div className="mt-6 text-7xl font-extrabold tracking-tight text-gradient">
          404
        </div>
        <h1 className="mt-2 text-2xl font-bold">Pagina non trovata</h1>
        <p className="mt-2 text-sm text-muted-fg">
          La pagina che stai cercando non esiste o è stata spostata.
        </p>
        <Button asChild variant="gradient" className="mt-6">
          <Link to="/">
            <ArrowLeft className="size-4" /> Torna alla dashboard
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}
