import { Loader } from "./loader";

export function Spinner({
  size = "lg",
  variant = "line",
  className = "",
}: {
  size?: "sm" | "md" | "lg" | number;
  variant?: "arc" | "dots" | "line" | "rings";
  className?: string;
}) {
  const pixelSize =
    typeof size === "number"
      ? size
      : size === "sm"
      ? 24
      : size === "md"
      ? 36
      : 48;

  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <Loader variant={variant} size={pixelSize} />
    </div>
  );
}

export default Spinner;
