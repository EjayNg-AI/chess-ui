import type { PromotionPiece } from '../../types/chess'
import './PromotionModal.css'

const labels: Record<PromotionPiece, string> = {
  q: 'Queen',
  r: 'Rook',
  b: 'Bishop',
  n: 'Knight',
}

type PromotionModalProps = {
  options: PromotionPiece[]
  onSelect: (piece: PromotionPiece) => void
  onCancel: () => void
}

export function PromotionModal({ options, onSelect, onCancel }: PromotionModalProps) {
  return (
    <div className="promotion-backdrop" role="dialog" aria-modal="true" aria-label="Choose promotion">
      <div className="promotion-panel">
        {options.map((option) => (
          <button
            className="promotion-option"
            key={option}
            type="button"
            onClick={() => onSelect(option)}
          >
            {labels[option]}
          </button>
        ))}
        <button className="promotion-cancel" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
