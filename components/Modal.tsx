export default function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg p-8 shadow-lg">
        {children}
      </div>
    </div>
  );
} 