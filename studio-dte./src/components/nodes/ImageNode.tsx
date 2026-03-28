import { useRef } from 'react';
import { Image as ImageIcon, Upload } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Port } from './Port';

export default function ImageNode({ id, data }: { id: string; data: any }) {
  const { updateNodeData } = useReactFlow();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        updateNodeData(id, { imageUrl: reader.result as string, aspectRatio: ratio });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleClick = () => inputRef.current?.click();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleFile(file);
  };

  return (
    <BaseNode id={id} title="Image" className="w-48 p-3 rounded-[24px]">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />

      <div
        className="nodrag w-full bg-white/5 rounded-[16px] overflow-hidden relative border border-white/10 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all"
        style={{ aspectRatio: data.aspectRatio || 9 / 16 }}
        onClick={handleClick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {data.imageUrl ? (
          <img src={data.imageUrl} alt="Reference" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/40 gap-2">
            <Upload size={20} className="opacity-50" />
            <span className="text-[11px] font-medium">Click or drop</span>
          </div>
        )}
      </div>

      <div className="absolute right-0 bottom-12">
        <Port type="source" id="out" color="green" icon={<ImageIcon size={14} />} />
      </div>
    </BaseNode>
  );
}
