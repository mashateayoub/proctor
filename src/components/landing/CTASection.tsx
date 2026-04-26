'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { scaleIn } from '@/lib/motion';

export function CTASection() {
  return (
    <section className="py-32 px-8 bg-white">
      <motion.div 
        variants={scaleIn}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        className="max-w-[1440px] mx-auto bg-[var(--color-ink)] rounded-[40px] p-12 md:p-24 text-center relative overflow-hidden"
      >
        {/* Ambient Glow */}
        <div className="absolute top-[-50%] left-[-20%] w-[80%] h-[150%] bg-[var(--color-rausch)]/10 rounded-full blur-[120px]" />
        
        <div className="relative z-10 max-w-[800px] mx-auto flex flex-col items-center gap-8">
          <h2 className="text-[48px] md:text-[64px] font-display font-bold text-white leading-[1.1]">
            Ready to secure your <br />
            next assessment?
          </h2>
          <p className="text-[18px] md:text-[22px] text-white/60 font-medium leading-relaxed max-w-[600px]">
            Join 1,200+ institutions using AiProctor to deliver high-stakes exams with absolute confidence.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <Button variant="primary" className="h-[64px] px-10 text-[20px] w-full sm:w-auto">Create Free Account</Button>
            <Button className="h-[64px] px-10 text-[20px] bg-white/10 text-white hover:bg-white/20 border-white/10 w-full sm:w-auto">Contact Sales</Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
