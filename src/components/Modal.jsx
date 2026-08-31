import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, footer, size = 'md' }) {
  if (!isOpen) return null;

  const maxWidth = size === 'lg' ? '720px' : size === 'sm' ? '400px' : '560px';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
