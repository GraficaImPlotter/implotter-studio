import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BannerSlide {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  active: boolean;
}

interface HeroCarouselProps {
  banners: BannerSlide[];
}

export default function HeroCarousel({ banners }: HeroCarouselProps) {
  const slides = banners.filter(b => b.active);
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goTo = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrent(index);
    setTimeout(() => setIsTransitioning(false), 600);
  }, [isTransitioning]);

  const next = useCallback(() => goTo((current + 1) % slides.length), [current, slides.length, goTo]);
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, slides.length, goTo]);

  // Autoplay every 5s
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, slides.length]);

  if (slides.length === 0) return null;

  return (
    <section className="relative w-full overflow-hidden" style={{ height: 'clamp(320px, 50vh, 540px)' }}>
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className={cn(
            'absolute inset-0 transition-all duration-700 ease-in-out',
            i === current ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-105 z-0'
          )}
        >
          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${slide.image})` }}
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/85 via-primary/60 to-transparent" />

          {/* Content */}
          <div className="relative z-10 h-full container mx-auto px-4 flex items-center">
            <div className={cn(
              'max-w-xl transition-all duration-700 delay-200',
              i === current ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            )}>
              <h2 className="text-3xl md:text-5xl font-extrabold text-primary-foreground leading-tight mb-3" style={{ fontFamily: 'Montserrat' }}>
                {slide.title}
              </h2>
              <p className="text-base md:text-lg text-primary-foreground/85 mb-6">
                {slide.subtitle}
              </p>
              <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link to={slide.buttonLink}>{slide.buttonText}</Link>
              </Button>
            </div>
          </div>
        </div>
      ))}

      {/* Arrows */}
      {slides.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-primary-foreground/20 hover:bg-primary-foreground/40 text-primary-foreground backdrop-blur-sm transition-colors" aria-label="Anterior">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-primary-foreground/20 hover:bg-primary-foreground/40 text-primary-foreground backdrop-blur-sm transition-colors" aria-label="Próximo">
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={cn(
                'rounded-full transition-all duration-300',
                i === current ? 'w-8 h-2.5 bg-accent' : 'w-2.5 h-2.5 bg-primary-foreground/40 hover:bg-primary-foreground/70'
              )}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
