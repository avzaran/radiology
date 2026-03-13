import { useParams } from 'react-router-dom'

export function PatientWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  return (
    <div>
      <p style={{ color: '#E2E8F0' }}>Patient workspace: {id}</p>
    </div>
  )
}
