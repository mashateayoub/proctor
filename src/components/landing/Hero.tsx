'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { fadeUp, staggerContainer, staggerItem } from '@/lib/motion';

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-8 overflow-hidden bg-[var(--color-canvas)]">
      {/* Abstract Background Element */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[var(--color-soft-cloud)] rounded-full blur-[100px] -z-10 opacity-60" />
      
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <motion.div 
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="flex flex-col gap-8"
        >
          <motion.div variants={staggerItem} className="inline-flex items-center gap-2 bg-[var(--color-soft-cloud)] px-3 py-1 rounded-full w-fit border border-[var(--color-hairline)]">
            <span className="w-2 h-2 rounded-full bg-[var(--color-rausch)] animate-pulse" />
            <span className="text-[12px] font-bold text-[var(--color-ink)] uppercase tracking-widest">Next-Gen Proctoring</span>
          </motion.div>

          <motion.h1 
            variants={staggerItem}
            className="text-display-hero text-[var(--color-ink)] max-w-[600px]"
          >
            Academic integrity, <br />
            <span className="text-[var(--color-rausch)]">perfected by AI.</span>
          </motion.h1>

          <motion.p 
            variants={staggerItem}
            className="text-body-standard text-[var(--color-ash)] max-w-[500px] leading-relaxed"
          >
            A high-fidelity monitoring engine designed for the modern classroom. 
            Automated anomaly detection, seamless integration, and clean by default.
          </motion.p>

          <motion.div variants={staggerItem} className="flex items-center gap-4 pt-4">
            <Button variant="primary" className="h-[56px] px-8 text-[18px]">Launch Platform</Button>
            <Button variant="pill" className="h-[56px] px-8 text-[18px]">See Live Demo</Button>
          </motion.div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
          className="relative hidden lg:block"
        >
          <div className="relative z-10 rounded-[24px] overflow-hidden border border-[var(--color-hairline)] shadow-2xl bg-white p-4">
             {/* Mock UI Frame */}
             <div className="aspect-[4/3] bg-[var(--color-soft-cloud)] rounded-[16px] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-transparent" />
                <div className="absolute top-4 left-4 flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                </div>
                <div className="flex items-center justify-center h-full">
                   <div className="w-48 h-48 rounded-full border-[10px] border-[var(--color-rausch)]/20 flex items-center justify-center relative">
                      <div className="w-32 h-32 rounded-full border-[2px] border-[var(--color-rausch)] animate-[ping_3s_infinite]" />
                      <div className="absolute inset-0 flex items-center justify-center">
                         <div className="w-2 h-2 rounded-full bg-[var(--color-rausch)]" />
                      </div>
                   </div>
                </div>
                <div className="absolute bottom-6 left-6 right-6 h-12 bg-white rounded-[12px] border border-[var(--color-hairline)] flex items-center justify-between px-4">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-[11px] font-bold text-[var(--color-ink)] uppercase">System Secure</span>
                   </div>
                   <span className="text-[11px] font-mono text-[var(--color-ash)]">00:42:19</span>
                </div>
             </div>
          </div>
          {/* Decorative floating elements */}
          <motion.div 
            animate={{ y: [0, -20, 0] }} 
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-30px] right-[-20px] w-24 h-24 bg-[var(--color-rausch)]/5 rounded-full border border-[var(--color-rausch)]/10" 
          />
          <motion.div 
            animate={{ y: [0, 20, 0] }} 
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-[-40px] left-[-30px] w-32 h-32 bg-[var(--color-plus-magenta)]/5 rounded-full border border-[var(--color-plus-magenta)]/10" 
          />
        </motion.div>
      </div>
    </section>
  );
}
