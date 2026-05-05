import { useState } from "react";
import { ElasticSwitch } from "./elastic-switch";

export default function ElasticSwitchDemo() {
  const [isOn, setIsOn] = useState(false);
  const [isOn2, setIsOn2] = useState(true);
  const [isOn3, setIsOn3] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center gap-8 p-12 bg-[#0a0a0c] rounded-2xl">
      <h2 className="text-white text-lg font-semibold">Elastic Switch Demo</h2>
      
      <div className="flex items-center gap-4">
        <span className="text-white/60 text-sm w-16">Small</span>
        <ElasticSwitch isOn={isOn} onChange={setIsOn} size="sm" />
        <span className="text-white/40 text-xs">{isOn ? "ON" : "OFF"}</span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-white/60 text-sm w-16">Medium</span>
        <ElasticSwitch isOn={isOn2} onChange={setIsOn2} size="md" />
        <span className="text-white/40 text-xs">{isOn2 ? "ON" : "OFF"}</span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-white/60 text-sm w-16">Large</span>
        <ElasticSwitch isOn={isOn3} onChange={setIsOn3} size="lg" activeColor="#32D74B" />
        <span className="text-white/40 text-xs">{isOn3 ? "ON" : "OFF"}</span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-white/60 text-sm w-16">Disabled</span>
        <ElasticSwitch isOn={false} onChange={() => {}} size="md" disabled />
        <span className="text-white/40 text-xs">-</span>
      </div>
    </div>
  );
}
