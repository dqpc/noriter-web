import { CharacterAvatar } from './CharacterAvatar'
import { ZODIAC } from './zodiac'

export function CharacterPicker({
  value,
  onChange,
  onClose,
}: {
  value: string
  onChange: (id: string) => void
  onClose: () => void
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <p className="modal-title">내 캐릭터</p>
        <div className="picker-grid">
          {ZODIAC.map((c) => (
            <button
              key={c.id}
              type="button"
              className={c.id === value ? 'picker-item selected' : 'picker-item'}
              onClick={() => {
                onChange(c.id)
                onClose()
              }}
            >
              <CharacterAvatar id={c.id} size={52} />
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
