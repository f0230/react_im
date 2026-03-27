import { Image as ImageIcon } from 'lucide-react';
import BaseNode from './BaseNode';
import { Port } from './Port';

export default function ImageNode({ id, data }: { id: string, data: any }) {
  return (
    <BaseNode id={id} title="Image" className="w-48 p-3 rounded-[24px]">
      <div className="w-full aspect-[9/16] bg-white/5 rounded-[16px] overflow-hidden relative border border-white/10">
        {data.imageUrl ? (
          <img src={data.imageUrl} alt="Reference" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/40">
            <span className="text-[13px] font-medium">Image</span>
          </div>
        )}
      </div>
      
      <div className="absolute right-0 bottom-12">
        <Port type="source" id="out" color="green" icon={<ImageIcon size={14} />} />
      </div>
    </BaseNode>
  );
}
