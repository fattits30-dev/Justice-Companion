import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";

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
  recentItems: _recentItems,
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden"
            >
              <Command shouldFilter={false} onKeyDown={handleKeyDown}>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Command.Input
                    placeholder={placeholder}
                    value={search}
                    onValueChange={setSearch}
                    className="w-full px-10 py-4 bg-transparent border-b border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-0 text-lg"
                  />
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {Object.entries(groupedItems).map(([group, groupItems]) => (
                    <Command.Group key={group} heading={group}>
                      {groupItems.map((item) => (
                        <Command.Item
                          key={item.id}
                          onSelect={() => {
                            item.onSelect();
                            setOpen(false);
                          }}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3"
                        >
                          {item.icon && <span>{item.icon}</span>}
                          <div className="flex-1">
                            <div className="font-medium">{item.label}</div>
                            {item.description && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {item.description}
                              </div>
                            )}
                          </div>
                          {item.shortcut && (
                            <kbd className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              {item.shortcut}
                            </kbd>
                          )}
                        </Command.Item>
                      ))}
                    </Command.Group>
                  ))}

                  {Object.keys(groupedItems).length === 0 && (
                    <div className="px-4 py-6 text-center text-gray-500">
                      {emptyMessage}
                    </div>
                  )}
                </div>
              </Command>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
