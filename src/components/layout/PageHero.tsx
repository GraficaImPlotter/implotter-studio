import { motion } from "framer-motion";

interface PageHeroProps {
  title: string;
  badge?: string;
  className?: string;
  children?: React.ReactNode;
}

const PageHero = ({ title, badge, className = "", children }: PageHeroProps) => {
  return (
    <section className={`relative py-24 bg-surface-dark overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-hero opacity-90" />
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl mx-auto text-center"
        >
          {badge && (
            <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest uppercase bg-highlight/20 text-highlight border-gradient-premium rounded-full">
              {badge}
            </span>
          )}
          <h1 className="font-display text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight-dramatic leading-dramatic">
            {title}
          </h1>
          <div className="w-20 h-1.5 bg-highlight mx-auto rounded-full mb-8" />
          {children}
        </motion.div>
      </div>
    </section>
  );
};

export default PageHero;
