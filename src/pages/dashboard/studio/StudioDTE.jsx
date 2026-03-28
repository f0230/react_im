import '@xyflow/react/dist/style.css';
import StudioDTEApp from '@studio-dte/App';

export default function StudioDTE() {
  return (
    <div className="fixed inset-0 top-0 z-10 overflow-hidden">
      <StudioDTEApp />
    </div>
  );
}
