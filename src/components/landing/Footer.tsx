'use client';

export function Footer() {
  return (
    <footer className="py-20 px-8 bg-[var(--color-soft-cloud)] border-t border-[var(--color-hairline)]">
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
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
           <h4 className="text-[14px] font-bold text-[var(--color-ink)] uppercase tracking-wider mb-6">Product</h4>
           <ul className="flex flex-col gap-4 text-[14px] text-[var(--color-ash)] font-medium">
              <li className="hover:text-[var(--color-ink)] cursor-pointer">Live Proctoring</li>
              <li className="hover:text-[var(--color-ink)] cursor-pointer">Automated AI</li>
              <li className="hover:text-[var(--color-ink)] cursor-pointer">ID Verification</li>
              <li className="hover:text-[var(--color-ink)] cursor-pointer">Lockdown Browser</li>
           </ul>
        </div>

        <div>
           <h4 className="text-[14px] font-bold text-[var(--color-ink)] uppercase tracking-wider mb-6">Company</h4>
           <ul className="flex flex-col gap-4 text-[14px] text-[var(--color-ash)] font-medium">
              <li className="hover:text-[var(--color-ink)] cursor-pointer">About Us</li>
              <li className="hover:text-[var(--color-ink)] cursor-pointer">Careers</li>
              <li className="hover:text-[var(--color-ink)] cursor-pointer">Privacy Policy</li>
              <li className="hover:text-[var(--color-ink)] cursor-pointer">Terms of Service</li>
           </ul>
        </div>

        <div>
           <h4 className="text-[14px] font-bold text-[var(--color-ink)] uppercase tracking-wider mb-6">Support</h4>
           <ul className="flex flex-col gap-4 text-[14px] text-[var(--color-ash)] font-medium">
              <li className="hover:text-[var(--color-ink)] cursor-pointer">Documentation</li>
              <li className="hover:text-[var(--color-ink)] cursor-pointer">Help Center</li>
              <li className="hover:text-[var(--color-ink)] cursor-pointer">Contact Support</li>
              <li className="hover:text-[var(--color-ink)] cursor-pointer">System Status</li>
           </ul>
        </div>
      </div>
      
      <div className="max-w-[1440px] mx-auto mt-20 pt-8 border-t border-[var(--color-hairline)] flex flex-col md:flex-row justify-between items-center gap-6">
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
