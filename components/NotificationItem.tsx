'use client';

import { useRouter } from 'next/navigation';

interface NotificationItemProps {
  alertId: string;
  message: string;
}

export default function NotificationItem({
  alertId,
  message,
}: NotificationItemProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/responder/live/${alertId}`);
  };

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer rounded-lg bg-red-600 p-4 text-white"
    >
      {message}
    </div>
  );
}
