import { Calendar, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../../components/ui/Button.tsx';
import { Card } from '../../../components/ui/Card.tsx';

interface TimelineEmptyProps {
  onAddClick: () => void;
}

export function TimelineEmpty({ onAddClick }: TimelineEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <Card variant="glass" className="max-w-md w-full p-8" data-variant="glass">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center space-y-6"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="p-4 rounded-full bg-primary-500/10 border border-primary-500/20"
          >
            <Calendar
              className="w-16 h-16 text-primary-400"
              data-testid="empty-state-icon"
            />
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-2xl font-bold text-white mb-2">
              No Deadlines Yet
            </h3>
            <p className="text-white/70 text-sm">
              Track important dates and deadlines for your legal cases
            </p>
          </motion.div>

          {/* Action Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              variant="primary"
              size="lg"
              icon={<Plus />}
              onClick={onAddClick}
              type="button"
            >
              Add Your First Deadline
            </Button>
          </motion.div>
        </motion.div>
      </Card>
    </div>
  );
}