import { motion } from "motion/react";
import { cn } from "../../lib/utils";

export interface ElasticSwitchProps {
  /** Estado del switch */
  isOn: boolean;
  /** Callback cuando cambia el estado */
  onChange: (isOn: boolean) => void;
  /** Tamaño del switch (sm, md, lg) */
  size?: "sm" | "md" | "lg";
  /** Color activo (por defecto usa el azul del tema #0A84FF) */
  activeColor?: string;
  /** Deshabilitar el switch */
  disabled?: boolean;
  /** Clase adicional */
  className?: string;
}

const sizeMap = {
  sm: { container: "h-6 w-12", thumb: "h-5 w-5" },
  md: { container: "h-8 w-16", thumb: "h-7 w-7" },
  lg: { container: "h-10 w-20", thumb: "h-9 w-9" },
};

export function ElasticSwitch({
  isOn,
  onChange,
  size = "md",
  activeColor = "#0A84FF",
  disabled = false,
  className,
}: ElasticSwitchProps) {
  const { container, thumb } = sizeMap[size];

  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!isOn)}
      disabled={disabled}
      className={cn(
        "relative rounded-full p-0.5 transition-colors duration-200 outline-none",
        "focus-visible:ring-2 focus-visible:ring-[#0A84FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a1e]",
        isOn ? "bg-[#0A84FF]" : "bg-white/15",
        disabled && "opacity-50 cursor-not-allowed",
        container,
        className
      )}
      style={isOn ? { backgroundColor: activeColor } : undefined}
      aria-pressed={isOn}
      role="switch"
    >
      <motion.div
        layout
        transition={{
          type: "spring",
          stiffness: 700,
          damping: 30,
        }}
        className={cn(
          "rounded-full bg-white shadow-md",
          thumb,
          isOn ? "ml-auto" : "mr-auto"
        )}
      />
    </button>
  );
}
