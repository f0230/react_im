import React from 'react';
import { 
  Twitter, 
  Linkedin, 
  Instagram, 
  Facebook, 
  Youtube,
  Share2
} from 'lucide-react';
import { getPlatformColor } from '@/services/blotatoService';

// Custom icons para plataformas que no están en Lucide
const TikTokIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const PinterestIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
  </svg>
);

const ThreadsIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.781 3.632 2.695 6.54 2.717 3.083-.036 5.3-1.136 6.598-3.27.757-1.233 1.153-2.777 1.178-4.588h-3.032v-2.202h5.21c.074 2.313-.464 4.407-1.6 6.226-1.708 2.782-4.503 4.324-8.355 4.353z"/>
  </svg>
);

const BlueskyIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 2.759 0 3.271c0 .243.154 2.134 1.19 4.312 1.097 2.305 3.109 4.206 4.768 4.684.522.151 1.008.2 1.38.177.57-.036 1.304-.184 1.74-.65.231-.247.379-.585.44-.969.036-.239.029-.493-.007-.75-.021-.153-.055-.332-.091-.526a14.867 14.867 0 0 1-.038-.226c.589.28 1.232.461 1.906.461s1.317-.181 1.906-.461a14.867 14.867 0 0 1-.038.226c-.036.194-.07.373-.091.526-.036.257-.043.511-.007.75.061.384.209.722.44.969.436.466 1.17.614 1.74.65.372.023.858-.026 1.38-.177 1.659-.478 3.671-2.379 4.768-4.684C23.846 5.405 24 3.514 24 3.271c0-.512-.139-1.363-.902-1.706-.659-.299-1.664-.621-4.3-2.24C16.046 4.753 13.087 8.686 12 10.8z"/>
  </svg>
);

const PLATFORM_ICONS = {
  twitter: Twitter,
  linkedin: Linkedin,
  instagram: Instagram,
  facebook: Facebook,
  tiktok: TikTokIcon,
  pinterest: PinterestIcon,
  threads: ThreadsIcon,
  bluesky: BlueskyIcon,
  youtube: Youtube
};

export function PlatformIcon({ platform, size = 16, className = '' }) {
  const Icon = PLATFORM_ICONS[platform] || Share2;
  const color = getPlatformColor(platform);
  
  return (
    <span 
      className={`inline-flex items-center justify-center ${className}`}
      style={{ color }}
      title={platform}
    >
      <Icon size={size} />
    </span>
  );
}

export function PlatformBadge({ platform, size = 14, showName = true, className = '' }) {
  const color = getPlatformColor(platform);
  const name = platform.charAt(0).toUpperCase() + platform.slice(1);
  
  return (
    <span 
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${className}`}
      style={{ 
        backgroundColor: `${color}15`,
        color: color
      }}
    >
      <PlatformIcon platform={platform} size={size} />
      {showName && name}
    </span>
  );
}

export default PlatformIcon;
