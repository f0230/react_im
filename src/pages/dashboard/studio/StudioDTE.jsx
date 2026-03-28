import '@xyflow/react/dist/style.css';
import StudioDTEApp from '@studio-dte/App';

export default function StudioDTE() {
  return (
    <div className="fixed inset-x-0 bottom-0 top-[var(--dashboard-navbar-offset)] z-10 overflow-hidden transition-[top] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">
      <StudioDTEApp />
    </div>
  );
}
