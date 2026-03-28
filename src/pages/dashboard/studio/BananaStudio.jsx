import BananaStudioApp from '@banana-studio/App';

export default function BananaStudio() {
  return (
    <div className="min-h-[calc(100dvh-var(--dashboard-navbar-offset))] bg-[#0a0a0a] text-white">
      <BananaStudioApp />
    </div>
  );
}
