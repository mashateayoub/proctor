'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { scaleIn } from '@/lib/motion';

export function CTASection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-[1440px] mx-auto px-8">
        <motion.div 
          variants={scaleIn}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="bg-[var(--color-ink)] rounded-[40px] p-10 md:p-16 text-center relative overflow-hidden"
        >
        {/* Ambient Glow */}
        <div className="absolute top-[-50%] left-[-20%] w-[80%] h-[150%] bg-[var(--color-rausch)]/10 rounded-full blur-[120px]" />
        
        <div className="relative z-10 max-w-[800px] mx-auto flex flex-col items-center gap-6">
          <h2 className="text-[40px] md:text-[60px] font-display font-bold text-white leading-[1.1]">
            Ready to secure your <br />
            next assessment?
          </h2>
          <p className="text-[16px] md:text-[20px] text-white/60 font-medium leading-relaxed max-w-[600px]">
            Join 1,200+ institutions using AiProctor to deliver high-stakes exams with absolute confidence.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <Button variant="primary" className="w-full sm:w-auto px-10">Create Free Account</Button>
            <Button className="w-full sm:w-auto px-10 bg-white/10 text-white hover:bg-white/20 border-white/10">Contact Sales</Button>
          </div>
        </div>
        </motion.div>
      </div>
    </section>
  );
}
