'use client';
import { useApp } from '@/lib/store';
import { SeatCard } from './seat-card';
import { SEAT_COUNT } from '@/lib/config';

interface Props {
  interactive?: boolean;
  onSeatClick?: (seatId: number) => void;
}

export function SeatGrid({ interactive = false, onSeatClick }: Props) {
  const seats = useApp((s) => s.seats);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {Array.from({ length: SEAT_COUNT }, (_, i) => {
        const seat =
          seats.find((x) => x.id === i + 1) ?? {
            id: i + 1,
            status: 'vacant' as const,
            paid: 0,
            dest: '',
          };
        return (
          <SeatCard
            key={seat.id}
            seat={seat}
            interactive={interactive}
            onClick={() => onSeatClick?.(seat.id)}
          />
        );
      })}
    </div>
  );
}