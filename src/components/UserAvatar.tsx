import React, { useEffect, useState } from 'react';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function getUserInitials(name?: string | null, email?: string | null): string {
  const source = (name || email || '0X').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps['size']>, string> = {
  sm: 'h-8 w-8 rounded-lg text-xs',
  md: 'h-12 w-12 rounded-xl text-base',
  lg: 'h-16 w-16 rounded-2xl text-xl',
};

const ACCENT_CLASSES: Record<NonNullable<UserAvatarProps['size']>, string> = {
  sm: '-bottom-1 -right-1 h-3.5 w-3.5',
  md: '-bottom-1.5 -right-1.5 h-5 w-5',
  lg: '-bottom-2 -right-2 h-7 w-7',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  email,
  size = 'lg',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [src]);

  const initials = getUserInitials(name, email);
  const showImage = Boolean(src && src.trim().length > 0 && !imageError);

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-[#1A1464] dark:bg-[#232B6E] font-display font-extrabold text-white select-none ${SIZE_CLASSES[size]} ${className}`}
    >
      {showImage ? (
        <img
          src={src!}
          alt={`${name || email || 'User'} profile picture`}
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <>
          <span
            aria-hidden="true"
            className={`absolute -skew-x-12 bg-[#EE1119] ${ACCENT_CLASSES[size]}`}
          />
          <span className="relative z-10">{initials}</span>
        </>
      )}
    </div>
  );
};
