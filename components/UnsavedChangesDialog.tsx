'use client'

interface UnsavedChangesDialogProps {
  isOpen: boolean
  onSave: () => void
  onLeave: () => void
  onCancel: () => void
  saving?: boolean
}

export default function UnsavedChangesDialog({
  isOpen,
  onSave,
  onLeave,
  onCancel,
  saving = false,
}: UnsavedChangesDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 p-6 border-2 border-brown-light">
        <div className="flex items-start gap-4 mb-6">
          <div className="text-4xl">⚠️</div>
          <div className="flex-1">
            <h3 className="text-2xl font-display text-brown-dark mb-2">
              You have unsaved changes...
            </h3>
            <p className="text-gray-600">
              You have unsaved changes on this page. What would you like to do?
            </p>
          </div>
        </div>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-brown-dark border-2 border-brown-light rounded-lg hover:bg-brown-light/20 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onLeave}
            disabled={saving}
            className="px-4 py-2 text-red-600 border-2 border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            Leave Without Saving
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-6 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

