export default function LoadingIndicator({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      {label && <span className="text-accent text-sm">{label}</span>}
    </div>
  );
} 