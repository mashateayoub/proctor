'use client';

import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/motion';

const metrics = [
  { label: 'Integrity Rating', value: '99.9%', detail: 'Anomaly Detection' },
  { label: 'Active Sessions', value: '2.4M', detail: 'Global Scale' },
  { label: 'Response Time', value: '< 200ms', detail: 'Real-time Analysis' },
  { label: 'Compliance', value: 'GDPR', detail: 'Privacy Focused' },
];

export function TrustMetrics() {
  return (
    <section className="py-20 px-8 bg-[var(--color-soft-cloud)]">
      <div className="max-w-[1440px] mx-auto">
        <motion.div 
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {metrics.map((metric, index) => (
            <motion.div 
              key={index} 
              variants={staggerItem}
              className="flex flex-col items-center text-center p-6 bg-white rounded-[20px] border border-[var(--color-hairline)] shadow-sm"
            >
              <span className="text-[12px] font-bold text-[var(--color-ash)] uppercase tracking-[0.1em] mb-2">{metric.label}</span>
              <span className="text-[40px] font-display font-bold text-[var(--color-ink)] leading-none mb-1">{metric.value}</span>
              <span className="text-[14px] text-[var(--color-mute)] font-medium">{metric.detail}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
