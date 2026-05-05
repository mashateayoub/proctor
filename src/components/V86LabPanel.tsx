"use client";

import "xterm/css/xterm.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Terminal } from "xterm";
import type { FitAddon } from "@xterm/addon-fit";

type VmProfile = {
  provider?: "v86" | "external";
  profile_name?: string;
  boot_mode?: "kernel" | "disk";
  wasm_path?: string;
  bios_url?: string;
  vga_bios_url?: string;
  bzimage_url?: string;
  initrd_url?: string;
  hda_url?: string;
  cdrom_url?: string;
  cmdline?: string;
  memory_mb?: number;
  vga_memory_mb?: number;
};

declare global {
  interface Window {
    V86?: any;
    __v86ScriptPromise?: Promise<void>;
  }
}

const DEFAULT_V86_SCRIPT = "/v86/build/libv86.js";

async function ensureV86Loaded(scriptSrc: string) {
  if(typeof window === "undefined") return;
  if(window.V86) return;
  if(window.__v86ScriptPromise) {
    await window.__v86ScriptPromise;
    return;
  }

  window.__v86ScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-v86="true"]');
    if(existing) {
      if(window.V86) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load v86 runtime script")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.dataset.v86 = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load v86 runtime script"));
    document.body.appendChild(script);
  });

  await window.__v86ScriptPromise;
}

function safeDestroyV86(instance: any) {
  try {
    if(instance?.stop) instance.stop();
  }
  catch {}

  try {
    const result = instance?.destroy?.();
    if(result && typeof result.catch === "function") {
      result.catch(() => {});
    }
  }
  catch {}
}

export function V86LabPanel({
  vmProfile,
  className,
}: {
  vmProfile?: VmProfile;
  className?: string;
}) {
  const screenContainerRef = useRef<HTMLDivElement | null>(null);
  const terminalHostRef = useRef<HTMLDivElement | null>(null);
  const emulatorRef = useRef<any>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const terminalDisposersRef = useRef<Array<{ dispose: () => void }>>([]);
  const initVersionRef = useRef(0);
  const bootLogBufferRef = useRef("");
  const lineTailRef = useRef("");
  const readyRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "booting" | "ready" | "error">("loading");
  const [error, setError] = useState<string>("");

  const profile = useMemo(() => {
    return {
      wasm_path: vmProfile?.wasm_path || "/v86/build/v86.wasm",
      bios_url: vmProfile?.bios_url || "/v86/bios/seabios.bin",
      vga_bios_url: vmProfile?.vga_bios_url || "/v86/bios/vgabios.bin",
      memory_mb: vmProfile?.memory_mb || 256,
      vga_memory_mb: vmProfile?.vga_memory_mb || 8,
      boot_mode: vmProfile?.boot_mode || "kernel",
      bzimage_url: vmProfile?.bzimage_url || "/v86/images/buildroot-bzimage68.bin",
      initrd_url: vmProfile?.initrd_url || "",
      hda_url: vmProfile?.hda_url || "",
      cdrom_url: vmProfile?.cdrom_url || "",
      cmdline:
        vmProfile?.cmdline ||
        "tsc=reliable mitigations=off random.trust_cpu=on console=ttyS0",
    };
  }, [
    vmProfile?.wasm_path,
    vmProfile?.bios_url,
    vmProfile?.vga_bios_url,
    vmProfile?.memory_mb,
    vmProfile?.vga_memory_mb,
    vmProfile?.boot_mode,
    vmProfile?.bzimage_url,
    vmProfile?.initrd_url,
    vmProfile?.hda_url,
    vmProfile?.cdrom_url,
    vmProfile?.cmdline,
  ]);

  useEffect(() => {
    let cancelled = false;
    const currentInitVersion = ++initVersionRef.current;
    let resizeObserver: ResizeObserver | null = null;

    const initTimer = window.setTimeout(() => {
      init().catch(() => {});
    }, 0);

    async function setupTerminal() {
      if(!terminalHostRef.current) {
        throw new Error("Terminal host is not mounted");
      }

      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("xterm"),
        import("@xterm/addon-fit"),
      ]);

      if(cancelled || currentInitVersion !== initVersionRef.current) return;

      const fitAddon = new FitAddon();
      const term = new Terminal({
        convertEol: false,
        cursorBlink: true,
        cursorStyle: "block",
        fontFamily: "'JetBrains Mono', 'Cascadia Mono', 'Fira Code', Consolas, 'Liberation Mono', Menlo, monospace",
        fontSize: 14,
        lineHeight: 1.25,
        letterSpacing: 0,
        scrollback: 5000,
        allowProposedApi: false,
        theme: {
          background: "#0b0f14",
          foreground: "#e6edf3",
          cursor: "#e6edf3",
          cursorAccent: "#0b0f14",
          black: "#0b0f14",
          red: "#ff7b72",
          green: "#3fb950",
          yellow: "#d29922",
          blue: "#79c0ff",
          magenta: "#bc8cff",
          cyan: "#39c5cf",
          white: "#b1bac4",
          brightBlack: "#6e7681",
          brightRed: "#ffa198",
          brightGreen: "#56d364",
          brightYellow: "#e3b341",
          brightBlue: "#a5d6ff",
          brightMagenta: "#d2a8ff",
          brightCyan: "#56d4dd",
          brightWhite: "#f0f6fc",
        },
      });

      term.loadAddon(fitAddon);
      term.open(terminalHostRef.current);
      fitAddon.fit();

      terminalRef.current = term;
      fitAddonRef.current = fitAddon;

      resizeObserver = new ResizeObserver(() => {
        try {
          fitAddonRef.current?.fit();
        }
        catch {}
      });
      resizeObserver.observe(terminalHostRef.current);
      window.addEventListener("resize", onWindowResize);

      const onDataDisposable = term.onData((data) => {
        if(!readyRef.current) return;
        try {
          emulatorRef.current?.serial0_send?.(data);
        }
        catch {}
      });

      terminalDisposersRef.current.push(onDataDisposable);
    }

    function onWindowResize() {
      try {
        fitAddonRef.current?.fit();
      }
      catch {}
    }

    function destroyTerminal() {
      for(const disposable of terminalDisposersRef.current) {
        try {
          disposable.dispose();
        }
        catch {}
      }
      terminalDisposersRef.current = [];

      if(resizeObserver) {
        try {
          resizeObserver.disconnect();
        }
        catch {}
        resizeObserver = null;
      }
      window.removeEventListener("resize", onWindowResize);

      try {
        terminalRef.current?.dispose();
      }
      catch {}
      terminalRef.current = null;
      fitAddonRef.current = null;
    }

    async function init() {
      try {
        setStatus("loading");
        setError("");
        readyRef.current = false;
        bootLogBufferRef.current = "";
        lineTailRef.current = "";
        await setupTerminal();
        terminalRef.current?.clear();

        await ensureV86Loaded(DEFAULT_V86_SCRIPT);
        if(!window.V86) {
          throw new Error("V86 constructor unavailable after script load");
        }
        if(!screenContainerRef.current) {
          throw new Error("Screen container is not mounted");
        }

        if(emulatorRef.current) {
          return;
        }

        const options: any = {
          wasm_path: "/v86/build/v86.wasm",
          memory_size: (vmProfile?.memory_mb || profile.memory_mb) * 1024 * 1024,
          vga_memory_size: (vmProfile?.vga_memory_mb || profile.vga_memory_mb) * 1024 * 1024,
          screen_container: screenContainerRef.current,
          bios: { url: "/v86/bios/seabios.bin" },
          vga_bios: { url: "/v86/bios/vgabios.bin" },
          disable_keyboard: true,
          disable_mouse: true,
          disable_audio: true,
          filesystem: {},
          cmdline: "tsc=reliable mitigations=off random.trust_cpu=on console=ttyS0",
          autostart: true,
          bzimage: { url: "/v86/images/buildroot-bzimage68.bin", async: false },
        };

        const instance = new window.V86(options);

        if(cancelled || currentInitVersion !== initVersionRef.current) {
          try {
            if(instance?.destroy) {
              instance.destroy();
            }
          }
          catch {}
          return;
        }

        emulatorRef.current = instance;
        setStatus("booting");
        instance.add_listener?.("serial0-output-byte", (byte: number) => {
          if(cancelled || currentInitVersion !== initVersionRef.current) return;
          const char = String.fromCharCode(byte);

          bootLogBufferRef.current += char;

          if(char === "\n" || char === "\r") {
            lineTailRef.current = "";
          }
          else {
            lineTailRef.current = (lineTailRef.current + char).slice(-120);
          }

          if(!readyRef.current) {
            if(/[#$%] $/.test(lineTailRef.current)) {
              readyRef.current = true;
              terminalRef.current?.clear();
              setStatus("ready");
              window.setTimeout(() => {
                try {
                  fitAddonRef.current?.fit();
                }
                catch {}
                terminalRef.current?.focus();
              }, 0);
            }
            return;
          }

          terminalRef.current?.write(char);
        });
      }
      catch(e: any) {
        if(!cancelled && currentInitVersion === initVersionRef.current) {
          setStatus("error");
          setError(e?.message || "Failed to initialize Linux lab");
        }
      }
    }

    return () => {
      cancelled = true;
      window.clearTimeout(initTimer);
      destroyTerminal();
      const instance = emulatorRef.current;
      emulatorRef.current = null;
      if(instance) safeDestroyV86(instance);
    };
  }, [profile]);

  return (
    <div className={className}>
      {(status === "loading" || status === "booting") && (
        <div className="flex h-full items-center justify-center bg-black text-xs text-white/70">
          {status === "loading" ? "Initializing Linux Lab..." : "Booting Linux image..."}
        </div>
      )}
      {status === "error" && (
        <div className="flex h-full flex-col items-center justify-center bg-black px-4 text-center text-xs text-red-400">
          <p>Linux Lab failed to load.</p>
          <p className="mt-2 text-white/60">{error}</p>
          <p className="mt-3 text-white/50">
            Ensure v86 assets exist under `public/v86` (build, bios, images).
          </p>
        </div>
      )}
      <div ref={screenContainerRef} className="hidden h-0 w-0 overflow-hidden" />
      <div className={`h-full w-full bg-[#0b0f14] ${status === "ready" ? "block" : "hidden"}`}>
        <div ref={terminalHostRef} className="h-full w-full overflow-hidden p-2" />
      </div>
    </div>
  );
}
