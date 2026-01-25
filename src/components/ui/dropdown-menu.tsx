"use client";

import * as React from "react";

import { cn } from "@/lib/cn";

type DropdownMenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext() {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error("DropdownMenu components must be used within <DropdownMenu>.");
  }
  return context;
}

type DropdownMenuProps = {
  children: React.ReactNode;
};

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open]);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div ref={rootRef} className="relative inline-flex">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

type DropdownMenuTriggerProps = {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function DropdownMenuTrigger({
  asChild,
  children,
  className,
}: DropdownMenuTriggerProps) {
  const { open, setOpen } = useDropdownMenuContext();

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setOpen(!open);
  };

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>;
    return React.cloneElement(child, {
      onClick: (event: React.MouseEvent) => {
        child.props.onClick?.(event);
        if (!event.defaultPrevented) handleClick(event);
      },
      className: cn(child.props.className, className),
      "aria-haspopup": "menu",
      "aria-expanded": open,
    });
  }

  return (
    <button
      type="button"
      className={cn("inline-flex items-center", className)}
      onClick={handleClick}
      aria-haspopup="menu"
      aria-expanded={open}
    >
      {children}
    </button>
  );
}

type DropdownMenuContentProps = React.HTMLAttributes<HTMLDivElement> & {
  align?: "start" | "end";
};

export function DropdownMenuContent({
  align = "start",
  className,
  ...props
}: DropdownMenuContentProps) {
  const { open } = useDropdownMenuContext();

  if (!open) return null;

  return (
    <div
      role="menu"
      className={cn(
        "absolute z-50 mt-2 min-w-[10rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        align === "end" ? "right-0" : "left-0",
        className,
      )}
      {...props}
    />
  );
}

type DropdownMenuItemProps = Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> & {
  asChild?: boolean;
  onSelect?: (event: React.MouseEvent) => void;
};

export function DropdownMenuItem({
  asChild,
  className,
  onSelect,
  children,
  ...props
}: DropdownMenuItemProps) {
  const { setOpen } = useDropdownMenuContext();

  const handleSelect = (event: React.MouseEvent) => {
    onSelect?.(event);
    if (!event.defaultPrevented) {
      setOpen(false);
    }
  };

  const baseClasses =
    "flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground";

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>;
    return React.cloneElement(child, {
      onClick: (event: React.MouseEvent) => {
        child.props.onClick?.(event);
        handleSelect(event);
      },
      className: cn(baseClasses, child.props.className, className),
      role: "menuitem",
    });
  }

  return (
    <div
      role="menuitem"
      className={cn(baseClasses, className)}
      onClick={handleSelect}
      {...props}
    >
      {children}
    </div>
  );
}
