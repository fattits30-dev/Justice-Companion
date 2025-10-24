import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  keywords?: string[];
  group?: string;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  items: CommandItem[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  placeholder?: string;
  emptyMessage?: string;
  recentItems?: CommandItem[];
}

export function CommandPalette({
  items,
  open: controlledOpen,
  onOpenChange,
  placeholder = "Search or type a command...",
  emptyMessage = "No results found.",
  recentItems = [],
}: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (onOpenChange) {
          onOpenChange(!open);
        } else {
          setInternalOpen((prev) => !prev);
        }
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  // Group items
  const groupedItems = items.reduce(
    (acc, item) => {
      const group = item.group || "Other";
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(item);
      return acc;
    },
    {} as Record<string, CommandItem[]>,
  );

  // Close on escape
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    },
    [setOpen],
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setOpen(false)}
          />

          {/* Command Dialog */}
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Command
                className={clsx(
                  "rounded-xl border border-gray-700 shadow-glass-lg",
                  "bg-primary-900/95 backdrop-blur-xl",
                  "overflow-hidden",
                )}
                onKeyDown={handleKeyDown}
              >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 border-b border-gray-800">
                  <Search className="w-5 h-5 text-gray-400" />
                  <Command.Input
                    value={search}
                    onValueChange={setSearch}
                    placeholder={placeholder}
                    className={clsx(
                      "flex-1 py-4 bg-transparent",
                      "text-white placeholder:text-gray-500",
                      "outline-none",
                    )}
                  />
                  <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-400 bg-primary-800 rounded border border-gray-700">
                    ESC
                  </kbd>
                </div>

                {/* Results */}
                <Command.List className="max-h-[400px] overflow-y-auto p-2">
                  <Command.Empty className="py-6 text-center text-sm text-gray-500">
                    {emptyMessage}
                  </Command.Empty>

                  {/* Recent Items */}
                  {recentItems.length > 0 && !search && (
                    <Command.Group
                      heading="Recent"
                      className="mb-2 px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                    >
                      {recentItems.map((item) => (
                        <CommandItemComponent
                          key={item.id}
                          item={item}
                          onSelect={() => {
                            item.onSelect();
                            setOpen(false);
                          }}
                        />
                      ))}
                    </Command.Group>
                  )}

                  {/* Grouped Items */}
                  {Object.entries(groupedItems).map(([group, items]) => (
                    <Command.Group
                      key={group}
                      heading={group}
                      className="mb-2 px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                    >
                      {items.map((item) => (
                        <CommandItemComponent
                          key={item.id}
                          item={item}
                          onSelect={() => {
                            item.onSelect();
                            setOpen(false);
                          }}
                        />
                      ))}
                    </Command.Group>
                  ))}
                </Command.List>

                {/* Footer */}
                <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-800 text-xs text-gray-500">
                  <kbd className="px-1.5 py-0.5 bg-primary-800 rounded border border-gray-700">
                    ↑↓
                  </kbd>
                  <span>Navigate</span>
                  <kbd className="px-1.5 py-0.5 bg-primary-800 rounded border border-gray-700 ml-2">
                    ↵
                  </kbd>
                  <span>Select</span>
                  <kbd className="px-1.5 py-0.5 bg-primary-800 rounded border border-gray-700 ml-2">
                    ESC
                  </kbd>
                  <span>Close</span>
                </div>
              </Command>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// Command Item Component
interface CommandItemComponentProps {
  item: CommandItem;
  onSelect: () => void;
}

function CommandItemComponent({ item, onSelect }: CommandItemComponentProps) {
  return (
    <Command.Item
      value={`${item.label} ${item.description || ""} ${item.keywords?.join(" ") || ""}`}
      onSelect={onSelect}
      className={clsx(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg",
        "cursor-pointer transition-colors",
        "data-[selected=true]:bg-primary-500/10",
        "data-[selected=true]:text-white",
        "text-gray-300",
      )}
    >
      {/* Icon */}
      {item.icon && (
        <span className="flex-shrink-0 w-5 h-5 text-gray-400">{item.icon}</span>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="font-medium">{item.label}</div>
        {item.description && (
          <div className="text-xs text-gray-500 truncate">
            {item.description}
          </div>
        )}
      </div>

      {/* Shortcut */}
      {item.shortcut && (
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-mono text-gray-400 bg-primary-800 rounded border border-gray-700">
          {item.shortcut}
        </kbd>
      )}

      {/* Arrow indicator */}
      <ChevronRight className="w-4 h-4 text-gray-600" />
    </Command.Item>
  );
}

// Hook to control command palette
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((o) => !o), []);
  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);

  return { open, setOpen, toggle, show, hide };
}

// Example usage:
// const { open, setOpen } = useCommandPalette();
//
// const items: CommandItem[] = [
//   {
//     id: 'new-case',
//     label: 'Create New Case',
//     description: 'Start a new legal case',
//     icon: <Plus />,
//     group: 'Actions',
//     shortcut: 'Ctrl+N',
//     onSelect: () => navigate('/cases/new')
//   },
//   {
//     id: 'view-cases',
//     label: 'View Cases',
//     description: 'Browse all cases',
//     icon: <Briefcase />,
//     group: 'Navigation',
//     onSelect: () => navigate('/cases')
//   }
// ];
//
// <CommandPalette items={items} open={open} onOpenChange={setOpen} />
