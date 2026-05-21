import { ReactNode } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function Modal({ isOpen, onClose, title, children }: Props) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-900 rounded-lg p-6 w-96 max-w-[calc(100vw-2rem)]">
        <h2 className="text-xl font-semibold text-white mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}
