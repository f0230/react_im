import '@xyflow/react/dist/style.css';
import StudioDTEApp from '@studio-dte/App';

export default function StudioDTE() {
  return (
    <div className="fixed inset-0 top-[56px] md:top-[45px] z-10 overflow-hidden">
      <StudioDTEApp />
    </div>
  );
}
