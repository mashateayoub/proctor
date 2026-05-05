export type EnvironmentMode = "standard" | "terminal_lab" | "hybrid";

export interface VmProfile {
  provider?: "v86" | "external";
  profile_id?: string;
  profile_name?: string;
  boot_mode?: "kernel" | "disk";
  iframe_url?: string;
  memory_mb?: number;
  vga_memory_mb?: number;
  network_mode?: "off" | "restricted_fetch_wisp";
  notes?: string;
}

export interface ExecutionPolicy {
  provider?: "local" | "remote";
  preferred_languages?: string[];
  max_runtime_ms?: number;
  terminal_enabled?: boolean;
}

