'use client';

export function Footer() {
  return (
    <footer className="py-12 bg-[var(--color-soft-cloud)] border-t border-[var(--color-hairline)]">
      <div className="max-w-[1440px] mx-auto px-8 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="flex flex-col gap-6">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--color-rausch)] flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full" />
              </div>
              <span className="font-bold text-[var(--color-ink)] text-[20px] tracking-tight font-display">AiProctor</span>
           </div>
           <p className="text-[14px] text-[var(--color-ash)] leading-relaxed font-medium">
             Building the future of academic integrity through ethical AI and human-centric design.
           </p>
        </div>

        <div>
           <h4 className="text-[14px] font-bold text-[var(--color-ink)] uppercase tracking-wider mb-4">Product</h4>
           <ul className="flex flex-col gap-3 text-[14px] text-[var(--color-ash)] font-medium">
              <li className="hover:text-[var(--color-ink)] cursor-pointer transition-colors">Live Proctoring</li>
              <li className="hover:text-[var(--color-ink)] cursor-pointer transition-colors">Automated AI</li>
              <li className="hover:text-[var(--color-ink)] cursor-pointer transition-colors">ID Verification</li>
              <li className="hover:text-[var(--color-ink)] cursor-pointer transition-colors">Lockdown Browser</li>
           </ul>
        </div>

        <div>
           <h4 className="text-[14px] font-bold text-[var(--color-ink)] uppercase tracking-wider mb-4">Company</h4>
           <ul className="flex flex-col gap-3 text-[14px] text-[var(--color-ash)] font-medium">
              <li className="hover:text-[var(--color-ink)] cursor-pointer transition-colors">About Us</li>
              <li className="hover:text-[var(--color-ink)] cursor-pointer transition-colors">Careers</li>
              <li className="hover:text-[var(--color-ink)] cursor-pointer transition-colors">Privacy Policy</li>
              <li className="hover:text-[var(--color-ink)] cursor-pointer transition-colors">Terms of Service</li>
           </ul>
        </div>

        <div>
           <h4 className="text-[14px] font-bold text-[var(--color-ink)] uppercase tracking-wider mb-4">Support</h4>
           <ul className="flex flex-col gap-3 text-[14px] text-[var(--color-ash)] font-medium">
              <li className="hover:text-[var(--color-ink)] cursor-pointer transition-colors">Documentation</li>
              <li className="hover:text-[var(--color-ink)] cursor-pointer transition-colors">Help Center</li>
              <li className="hover:text-[var(--color-ink)] cursor-pointer transition-colors">Contact Support</li>
              <li className="hover:text-[var(--color-ink)] cursor-pointer transition-colors">System Status</li>
           </ul>
        </div>
      </div>
      
      <div className="max-w-[1440px] mx-auto px-8 mt-12 pt-8 border-t border-[var(--color-hairline)] flex flex-col md:flex-row justify-between items-center gap-6">
         <span className="text-[12px] text-[var(--color-mute)] font-medium">
            © 2026 AiProctor Technologies Inc. All rights reserved.
         </span>
         <div className="flex items-center gap-8 text-[12px] text-[var(--color-mute)] font-medium">
            <span className="hover:text-[var(--color-ink)] cursor-pointer">Twitter</span>
            <span className="hover:text-[var(--color-ink)] cursor-pointer">LinkedIn</span>
            <span className="hover:text-[var(--color-ink)] cursor-pointer">GitHub</span>
         </div>
      </div>
    </footer>
  );
}
