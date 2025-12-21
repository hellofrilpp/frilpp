import frilppLogo from "@/assets/frilpp-logo.png";

interface FrilppLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-5 h-5",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

const FrilppLogo = ({ size = "md", className = "" }: FrilppLogoProps) => {
  return (
    // This component is used inside the Vite "Website" app, but ESLint runs with Next rules at the repo root.
    // eslint-disable-next-line @next/next/no-img-element
    <img 
      src={frilppLogo} 
      alt="Frilpp" 
      className={`${sizeClasses[size]} object-contain ${className}`}
    />
  );
};

export default FrilppLogo;
