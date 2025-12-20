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
    <img 
      src={frilppLogo} 
      alt="Frilpp" 
      className={`${sizeClasses[size]} object-contain ${className}`}
    />
  );
};

export default FrilppLogo;
