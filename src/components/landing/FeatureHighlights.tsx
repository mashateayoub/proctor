'use client';

import { motion } from 'framer-motion';
import { fadeUp, staggerContainer } from '@/lib/motion';

const features = [
  {
    title: 'Visual Identity Verification',
    description: 'Instant multi-factor biometric checks ensuring the right student is in the right seat.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    color: 'bg-blue-50 text-blue-600'
  },
  {
    title: 'Behavioral AI Analytics',
    description: 'Real-time eye tracking and head pose estimation to detect potential academic dishonesty.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    color: 'bg-rausch/10 text-rausch'
  },
  {
    title: 'Environment Lockdown',
    description: 'Secure browser controls and device monitoring to prevent unauthorized resource access.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    color: 'bg-green-50 text-green-600'
  }
];

export function FeatureHighlights() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-[1440px] mx-auto px-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8">
          <div className="max-w-[600px]">
            <h2 className="text-[36px] font-display font-bold text-[var(--color-ink)] leading-[1.1] mb-4">
              Precision proctoring for <br />
              <span className="text-[var(--color-mute)]">modern education.</span>
            </h2>
            <p className="text-[20px] text-[var(--color-ash)] font-medium leading-relaxed">
              We've redesigned integrity monitoring from the ground up to be less intrusive and more effective.
            </p>
          </div>
          <div className="hidden md:block w-32 h-[2px] bg-[var(--color-hairline)] mb-6" />
        </div>

        <motion.div 
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-12"
        >
          {features.map((feature, index) => (
            <motion.div 
              key={index} 
              variants={fadeUp}
              className="group p-8 rounded-[32px] border border-[var(--color-hairline)] hover:border-[var(--color-ink)] transition-all duration-500 hover:shadow-xl bg-[var(--color-soft-cloud)]/30"
            >
              <div className={`w-14 h-14 rounded-[16px] ${feature.color} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500`}>
                {feature.icon}
              </div>
              <h3 className="text-[24px] font-display font-bold text-[var(--color-ink)] mb-4">{feature.title}</h3>
              <p className="text-[16px] text-[var(--color-ash)] leading-relaxed font-medium">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
